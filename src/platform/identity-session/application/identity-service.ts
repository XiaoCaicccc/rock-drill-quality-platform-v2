import type { PrismaClient } from "@prisma/client";

import { systemClock } from "../../time";
import type { Clock } from "../../time";
import { identityError } from "./errors";
import type { AuthenticateInput, BootstrapInitialAccountInput, CreateAccountInput, IdentitySessionDependencies, IdentitySessionService, RevokeOwnSessionInput, SetAccountStatusInput } from "./contracts";
import type { AccountDto, AccountStatus, AuthenticatedSessionDto, OwnSessionDto } from "../domain/identity";
import { assertPasswordPolicy, normalizeDisplayName, normalizeUserAgent, normalizeUsername } from "../domain/validation";
import { createRawSessionToken, dummyPasswordHash, hashSessionToken, NodeCryptoArgon2PasswordHasher } from "../infrastructure/password-hasher";
import { isPrismaError, lockAccount, lockBootstrap, requireActiveOrganizationScope, toAccountDto, toSessionDto, type IdentityTransaction } from "../infrastructure/identity-prisma";

const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const accountSelect = { id: true, organizationId: true, primaryOrgUnitId: true, username: true, normalizedUsername: true, displayName: true, passwordHash: true, status: true, createdAt: true, updatedAt: true } as const;

function now(clock: Clock): Date { return new Date(clock.now().getTime()); }
function statusIsValid(status: string): status is AccountStatus { return status === "ACTIVE" || status === "INACTIVE" || status === "LOCKED"; }
function mapDatabaseError(error: unknown): never {
  if (isPrismaError(error, "P2002")) throw identityError("ACCOUNT_USERNAME_CONFLICT", error);
  if (isPrismaError(error, "P2003")) throw identityError("ORGANIZATION_SCOPE_INVALID", error);
  throw error;
}

async function findActiveScope(transaction: IdentityTransaction, account: { organizationId: string; primaryOrgUnitId: string }): Promise<boolean> {
  const organization = await transaction.organization.findUnique({ where: { id: account.organizationId }, select: { status: true } });
  const primaryOrgUnit = await transaction.orgUnit.findUnique({ where: { id: account.primaryOrgUnitId }, select: { organizationId: true, status: true } });
  return organization?.status === "ACTIVE" && primaryOrgUnit?.organizationId === account.organizationId && primaryOrgUnit.status === "ACTIVE";
}

async function getAuthenticatedSession(transaction: IdentityTransaction, rawToken: string, clock: Clock): Promise<AuthenticatedSessionDto> {
  if (typeof rawToken !== "string" || rawToken.length === 0) throw identityError("AUTHENTICATION_REQUIRED");
  const current = now(clock);
  const session = await transaction.session.findUnique({ where: { tokenHash: hashSessionToken(rawToken) } });
  if (!session || session.revokedAt !== null || session.expiresAt <= current) throw identityError("AUTHENTICATION_REQUIRED");
  const account = await transaction.account.findUnique({ where: { id: session.accountId } });
  if (!account || account.status !== "ACTIVE" || !(await findActiveScope(transaction, account))) throw identityError("AUTHENTICATION_REQUIRED");
  return { account: toAccountDto(account), session: toSessionDto(session) };
}

export function createIdentitySessionServiceForPrisma(prisma: PrismaClient, dependencies: IdentitySessionDependencies = {}): IdentitySessionService {
  const clock = dependencies.clock ?? systemClock;
  const passwordHasher = dependencies.passwordHasher ?? new NodeCryptoArgon2PasswordHasher();

  async function createAccountInternal(input: CreateAccountInput, bootstrap = false): Promise<AccountDto> {
    const { username, normalizedUsername } = normalizeUsername(input.username);
    const displayName = normalizeDisplayName(input.displayName);
    assertPasswordPolicy(input.password);
    const passwordHash = await passwordHasher.hash(input.password);
    try {
      return await prisma.$transaction(async (transaction) => {
        if (bootstrap) await lockBootstrap(transaction);
        if (bootstrap && await transaction.account.count() !== 0) throw identityError("BOOTSTRAP_ALREADY_COMPLETED");
        try { await requireActiveOrganizationScope(transaction, input.organizationId, input.primaryOrgUnitId); }
        catch (error) { if (error instanceof Error && error.message === "IDENTITY_ORGANIZATION_SCOPE_INVALID") throw identityError("ORGANIZATION_SCOPE_INVALID", error); throw error; }
        const account = await transaction.account.create({ data: { organizationId: input.organizationId, primaryOrgUnitId: input.primaryOrgUnitId, username, normalizedUsername, displayName, passwordHash, status: "ACTIVE" } });
        return toAccountDto(account);
      });
    } catch (error) { mapDatabaseError(error); }
  }

  return {
    async createAccount(input) { return createAccountInternal(input); },

    async setAccountStatus(input: SetAccountStatusInput) {
      if (!statusIsValid(input.status)) throw identityError("ACCOUNT_STATUS_INVALID");
      return prisma.$transaction(async (transaction) => {
        await lockAccount(transaction, input.accountId);
        const current = await transaction.account.findUnique({ where: { id: input.accountId } });
        if (!current) throw identityError("ACCOUNT_NOT_FOUND");
        const changed = await transaction.account.update({ where: { id: current.id }, data: { status: input.status } });
        if (current.status === "ACTIVE" && (input.status === "INACTIVE" || input.status === "LOCKED")) {
          const revokedAt = now(clock);
          await transaction.session.updateMany({ where: { accountId: current.id, revokedAt: null, expiresAt: { gt: revokedAt } }, data: { revokedAt } });
        }
        return toAccountDto(changed);
      });
    },

    async authenticate(input: AuthenticateInput) {
      const { normalizedUsername } = normalizeUsername(input.username);
      const preliminary = await prisma.account.findUnique({ where: { normalizedUsername }, select: accountSelect });
      const submittedPassword = typeof input.password === "string" ? input.password : "";
      const passwordMatches = await passwordHasher.verify(submittedPassword, preliminary?.passwordHash ?? dummyPasswordHash);
      if (!preliminary || !passwordMatches || preliminary.status !== "ACTIVE") throw identityError("AUTHENTICATION_FAILED");
      const rawToken = createRawSessionToken();
      try {
        const result = await prisma.$transaction(async (transaction) => {
          await lockAccount(transaction, preliminary.id);
          const account = await transaction.account.findUnique({ where: { id: preliminary.id } });
          if (!account || account.status !== "ACTIVE" || !(await findActiveScope(transaction, account))) throw identityError("AUTHENTICATION_FAILED");
          const createdAt = now(clock);
          const expiresAt = new Date(createdAt.getTime() + sessionLifetimeMs);
          const activeSessions = await transaction.session.count({ where: { accountId: account.id, revokedAt: null, expiresAt: { gt: createdAt } } });
          if (activeSessions >= 3) throw identityError("SESSION_LIMIT_REACHED");
          const session = await transaction.session.create({ data: { accountId: account.id, tokenHash: hashSessionToken(rawToken), createdAt, expiresAt, userAgent: normalizeUserAgent(input.userAgent) } });
          return { account: toAccountDto(account), session: toSessionDto(session) };
        });
        return { ...result, rawToken };
      } catch (error) { mapDatabaseError(error); }
    },

    async validateSession(rawToken) { return prisma.$transaction((transaction) => getAuthenticatedSession(transaction, rawToken, clock)); },

    async listOwnSessions(rawToken) {
      const authenticated = await this.validateSession(rawToken);
      const current = now(clock);
      const sessions = await prisma.session.findMany({ where: { accountId: authenticated.account.id, revokedAt: null, expiresAt: { gt: current } }, orderBy: { createdAt: "asc" } });
      return sessions.map((session): OwnSessionDto => ({ sessionId: session.id, createdAt: session.createdAt, expiresAt: session.expiresAt, current: session.id === authenticated.session.id, userAgent: session.userAgent }));
    },

    async revokeOwnSession(input: RevokeOwnSessionInput) {
      const authenticated = await this.validateSession(input.rawToken);
      const revokedAt = now(clock);
      const result = await prisma.session.updateMany({ where: { id: input.sessionId, accountId: authenticated.account.id, revokedAt: null }, data: { revokedAt } });
      if (result.count === 0) throw identityError("SESSION_NOT_FOUND");
      return { current: input.sessionId === authenticated.session.id };
    },

    async logout(rawToken) {
      if (typeof rawToken !== "string" || rawToken.length === 0) return;
      await prisma.session.updateMany({ where: { tokenHash: hashSessionToken(rawToken), revokedAt: null }, data: { revokedAt: now(clock) } });
    },

    async bootstrapInitialAccount(input: BootstrapInitialAccountInput) { return createAccountInternal(input, true); },
  };
}
