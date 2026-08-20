import type { Prisma, PrismaClient } from "@prisma/client";

import { createTransactionBoundAuditRecorder, type AuditEvent } from "../../audit";
import type { JsonObject } from "../../errors";
import { randomRequestId } from "../../request-context";
import type { RequestContext } from "../../request-context";
import { systemClock } from "../../time";
import type { Clock } from "../../time";
import { identityError } from "./errors";
import type { AccountDetailInput, AccountListInput, AuthenticateInput, BootstrapAdminInput, BootstrapInitialAccountInput, ChangeOwnPasswordInput, CreateAccountInput, IdentitySessionDependencies, IdentitySessionService, ManagedAccountInput, ResetManagedPasswordInput, RevokeOwnSessionInput, SetAccountStatusInput, SetManagedAccountStatusInput, UpdateManagedAccountInput } from "./contracts";
import type { AccountDetailDto, AccountDto, AccountStatus, AuthenticatedSessionDto, OwnSessionDto } from "../domain/identity";
import { assertPasswordPolicy, normalizeDisplayName, normalizeUserAgent, normalizeUsername } from "../domain/validation";
import { createRawSessionToken, dummyPasswordHash, hashSessionToken, NodeCryptoArgon2PasswordHasher } from "../infrastructure/password-hasher";
import { countEffectiveAdminAccounts, isEffectiveAdminAccount, isPrismaError, lockAccount, lockBootstrap, lockOrganizationAccess, requireActiveOrganizationScope, toAccountDto, toSessionDto, type IdentityTransaction } from "../infrastructure/identity-prisma";

const sessionLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const accessMutationTransactionOptions = { maxWait: 10_000, timeout: 30_000 } as const;
const accountSelect = { id: true, organizationId: true, primaryOrgUnitId: true, username: true, normalizedUsername: true, displayName: true, passwordHash: true, status: true, createdAt: true, updatedAt: true } as const;
const accountDetailInclude = { primaryOrgUnit: { select: { id: true, code: true, name: true, status: true } } } as const;

function now(clock: Clock): Date { return new Date(clock.now().getTime()); }
function statusIsValid(status: string): status is AccountStatus { return status === "ACTIVE" || status === "INACTIVE" || status === "LOCKED"; }
function mapDatabaseError(error: unknown): never {
  if (isPrismaError(error, "P2002")) throw identityError("ACCOUNT_USERNAME_CONFLICT", error);
  if (isPrismaError(error, "P2003")) throw identityError("ORGANIZATION_SCOPE_INVALID", error);
  if (error instanceof Error && error.message === "IDENTITY_ORGANIZATION_SCOPE_INVALID") throw identityError("ORGANIZATION_SCOPE_INVALID", error);
  throw error;
}

function requireActor(context: RequestContext) {
  if (context.actor.kind !== "user") throw identityError("AUTHENTICATION_REQUIRED");
  return context.actor;
}

function toAccountDetailDto(row: Prisma.AccountGetPayload<{ include: typeof accountDetailInclude }>): AccountDetailDto {
  return { ...toAccountDto(row), primaryOrgUnit: row.primaryOrgUnit };
}

function pageValue(value: number | undefined, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 1 || value > max) throw identityError("INVALID_ACCOUNT_INPUT");
  return value;
}

async function findActiveScope(transaction: IdentityTransaction, account: { organizationId: string; primaryOrgUnitId: string }): Promise<boolean> {
  const organization = await transaction.organization.findUnique({ where: { id: account.organizationId }, select: { status: true } });
  const primaryOrgUnit = await transaction.orgUnit.findUnique({ where: { id: account.primaryOrgUnitId }, select: { organizationId: true, status: true } });
  return organization?.status === "ACTIVE" && primaryOrgUnit?.organizationId === account.organizationId && primaryOrgUnit.status === "ACTIVE";
}

function auditData(event: AuditEvent): Prisma.AuditLogUncheckedCreateInput {
  return {
    organizationId: event.organizationId,
    actorKind: event.actorKind,
    actorAccountId: event.actorKind === "USER" ? event.actorAccountId : null,
    actorSessionId: event.actorKind === "USER" ? event.actorSessionId : null,
    requestId: event.requestId,
    action: event.action,
    targetType: event.targetType,
    targetId: event.targetId,
    reason: event.reason ?? null,
    details: event.details === null || event.details === undefined ? undefined : event.details as Prisma.InputJsonValue,
    occurredAt: event.occurredAt,
  };
}

function recorder(transaction: IdentityTransaction) {
  return createTransactionBoundAuditRecorder(async (event) => { await transaction.auditLog.create({ data: auditData(event) }); });
}

async function recordUser(transaction: IdentityTransaction, context: RequestContext, clock: Clock, action: string, targetType: string, targetId: string, details?: JsonObject): Promise<void> {
  const actor = requireActor(context);
  await recorder(transaction).record({ actorKind: "USER", organizationId: actor.organizationId, actorAccountId: actor.userId, actorSessionId: actor.sessionId, requestId: context.requestId, action, targetType, targetId, details, occurredAt: now(clock) });
}

async function recordSystem(transaction: IdentityTransaction, organizationId: string, clock: Clock, action: string, targetType: string, targetId: string, details?: JsonObject): Promise<void> {
  await recorder(transaction).record({ actorKind: "SYSTEM", organizationId, requestId: randomRequestId(), action, targetType, targetId, details, occurredAt: now(clock) });
}

async function requireApplicationOrganizationScope(transaction: IdentityTransaction, organizationId: string, primaryOrgUnitId: string): Promise<void> {
  try { await requireActiveOrganizationScope(transaction, organizationId, primaryOrgUnitId); }
  catch (error) {
    if (error instanceof Error && error.message === "IDENTITY_ORGANIZATION_SCOPE_INVALID") throw identityError("ORGANIZATION_SCOPE_INVALID", error);
    throw error;
  }
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

  async function createAccountInternal(input: CreateAccountInput): Promise<AccountDto> {
    const { username, normalizedUsername } = normalizeUsername(input.username);
    const displayName = normalizeDisplayName(input.displayName);
    assertPasswordPolicy(input.password);
    const passwordHash = await passwordHasher.hash(input.password);
    try {
      return await prisma.$transaction(async (transaction) => {
        await requireApplicationOrganizationScope(transaction, input.organizationId, input.primaryOrgUnitId);
        return toAccountDto(await transaction.account.create({ data: { organizationId: input.organizationId, primaryOrgUnitId: input.primaryOrgUnitId, username, normalizedUsername, displayName, passwordHash, status: "ACTIVE" } }));
      });
    } catch (error) { mapDatabaseError(error); }
  }

  async function setStatus(input: SetManagedAccountStatusInput | (SetAccountStatusInput & { context?: never }), context?: RequestContext): Promise<AccountDto> {
    if (!statusIsValid(input.status)) throw identityError("ACCOUNT_STATUS_INVALID");
    return prisma.$transaction(async (transaction) => {
      const initial = await transaction.account.findUnique({ where: { id: input.accountId }, select: { organizationId: true } });
      if (!initial) throw identityError("ACCOUNT_NOT_FOUND");
      const actor = context ? requireActor(context) : null;
      if (actor && actor.organizationId !== initial.organizationId) throw identityError("ACCOUNT_NOT_FOUND");
      await lockOrganizationAccess(transaction, initial.organizationId);
      await lockAccount(transaction, input.accountId);
      const current = await transaction.account.findUnique({ where: { id: input.accountId } });
      if (!current || current.organizationId !== initial.organizationId) throw identityError("ACCOUNT_NOT_FOUND");
      const reducesActiveAccount = current.status === "ACTIVE" && (input.status === "INACTIVE" || input.status === "LOCKED");
      const reducesEffectiveAdmin = reducesActiveAccount && await isEffectiveAdminAccount(transaction, current.organizationId, current.id);
      const changed = await transaction.account.update({ where: { id: current.id }, data: { status: input.status } });
      let sessionsRevoked = 0;
      if (reducesActiveAccount) {
        if (reducesEffectiveAdmin && await countEffectiveAdminAccounts(transaction, current.organizationId) === 0) throw identityError("LAST_EFFECTIVE_ADMIN");
        const revokedAt = now(clock);
        sessionsRevoked = (await transaction.session.updateMany({ where: { accountId: current.id, revokedAt: null, expiresAt: { gt: revokedAt } }, data: { revokedAt } })).count;
      }
      const details = { fromStatus: current.status, toStatus: input.status, sessionsRevoked };
      if (context) await recordUser(transaction, context, clock, "account.set_status", "account", current.id, details);
      else await recordSystem(transaction, current.organizationId, clock, "account.set_status", "account", current.id, details);
      return toAccountDto(changed);
    }, accessMutationTransactionOptions);
  }

  return {
    async createAccount(input) { return createAccountInternal(input); },
    async setAccountStatus(input) { return setStatus(input); },

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
          if (!account || account.passwordHash !== preliminary.passwordHash || account.status !== "ACTIVE" || !(await findActiveScope(transaction, account))) throw identityError("AUTHENTICATION_FAILED");
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

    async createManagedAccount(input: ManagedAccountInput) {
      const actor = requireActor(input.context);
      const { username, normalizedUsername } = normalizeUsername(input.username);
      const displayName = normalizeDisplayName(input.displayName);
      assertPasswordPolicy(input.password);
      const passwordHash = await passwordHasher.hash(input.password);
      try {
        return await prisma.$transaction(async (transaction) => {
          await requireApplicationOrganizationScope(transaction, actor.organizationId, input.primaryOrgUnitId);
          const account = await transaction.account.create({ data: { organizationId: actor.organizationId, primaryOrgUnitId: input.primaryOrgUnitId, username, normalizedUsername, displayName, passwordHash, status: "ACTIVE" } });
          await recordUser(transaction, input.context, clock, "account.create", "account", account.id);
          return toAccountDto(account);
        });
      } catch (error) { mapDatabaseError(error); }
    },

    async listManagedAccounts(input: AccountListInput) {
      const actor = requireActor(input.context);
      const page = pageValue(input.page, 1, Number.MAX_SAFE_INTEGER);
      const pageSize = pageValue(input.pageSize, 25, 100);
      if (input.status !== undefined && !statusIsValid(input.status)) throw identityError("INVALID_ACCOUNT_INPUT");
      const search = input.search?.trim();
      const where: Prisma.AccountWhereInput = {
        organizationId: actor.organizationId,
        ...(input.status ? { status: input.status } : {}),
        ...(input.orgUnitId ? { primaryOrgUnitId: input.orgUnitId } : {}),
        ...(search ? { OR: [{ username: { contains: search, mode: "insensitive" } }, { displayName: { contains: search, mode: "insensitive" } }] } : {}),
      };
      const [total, rows] = await prisma.$transaction([
        prisma.account.count({ where }),
        prisma.account.findMany({ where, include: accountDetailInclude, orderBy: [{ username: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
      ]);
      return { items: rows.map(toAccountDetailDto), page, pageSize, total };
    },

    async getManagedAccount(input: AccountDetailInput) {
      const actor = requireActor(input.context);
      const account = await prisma.account.findFirst({ where: { id: input.accountId, organizationId: actor.organizationId }, include: accountDetailInclude });
      if (!account) throw identityError("ACCOUNT_NOT_FOUND");
      return toAccountDetailDto(account);
    },

    async updateManagedAccount(input: UpdateManagedAccountInput) {
      const actor = requireActor(input.context);
      if (input.displayName === undefined && input.primaryOrgUnitId === undefined) throw identityError("INVALID_ACCOUNT_INPUT");
      const displayName = input.displayName === undefined ? undefined : normalizeDisplayName(input.displayName);
      return prisma.$transaction(async (transaction) => {
        await lockAccount(transaction, input.accountId);
        const current = await transaction.account.findUnique({ where: { id: input.accountId } });
        if (!current || current.organizationId !== actor.organizationId) throw identityError("ACCOUNT_NOT_FOUND");
        if (input.primaryOrgUnitId !== undefined) await requireApplicationOrganizationScope(transaction, actor.organizationId, input.primaryOrgUnitId);
        const changed = await transaction.account.update({ where: { id: current.id }, data: { ...(displayName !== undefined ? { displayName } : {}), ...(input.primaryOrgUnitId !== undefined ? { primaryOrgUnitId: input.primaryOrgUnitId } : {}) } });
        await recordUser(transaction, input.context, clock, "account.update", "account", current.id, { oldDisplayName: current.displayName, newDisplayName: changed.displayName, oldPrimaryOrgUnitId: current.primaryOrgUnitId, newPrimaryOrgUnitId: changed.primaryOrgUnitId });
        return toAccountDto(changed);
      });
    },

    async setManagedAccountStatus(input: SetManagedAccountStatusInput) { return setStatus(input, input.context); },

    async changeOwnPassword(input: ChangeOwnPasswordInput) {
      const actor = requireActor(input.context);
      assertPasswordPolicy(input.newPassword);
      const nextHash = await passwordHasher.hash(input.newPassword);
      await prisma.$transaction(async (transaction) => {
        await lockAccount(transaction, actor.userId);
        const account = await transaction.account.findUnique({ where: { id: actor.userId } });
        if (!account || account.organizationId !== actor.organizationId || !await passwordHasher.verify(input.currentPassword, account.passwordHash)) throw identityError("AUTHENTICATION_FAILED");
        await transaction.account.update({ where: { id: account.id }, data: { passwordHash: nextHash } });
        const revokedAt = now(clock);
        const sessionsRevoked = (await transaction.session.updateMany({ where: { accountId: account.id, id: { not: actor.sessionId }, revokedAt: null, expiresAt: { gt: revokedAt } }, data: { revokedAt } })).count;
        await recordUser(transaction, input.context, clock, "account.change_password", "account", account.id, { sessionsRevoked });
      });
    },

    async resetManagedPassword(input: ResetManagedPasswordInput) {
      const actor = requireActor(input.context);
      if (input.accountId === actor.userId) throw identityError("ADMIN_CANNOT_RESET_SELF");
      assertPasswordPolicy(input.newPassword);
      const nextHash = await passwordHasher.hash(input.newPassword);
      await prisma.$transaction(async (transaction) => {
        await lockAccount(transaction, input.accountId);
        const account = await transaction.account.findUnique({ where: { id: input.accountId } });
        if (!account || account.organizationId !== actor.organizationId) throw identityError("ACCOUNT_NOT_FOUND");
        await transaction.account.update({ where: { id: account.id }, data: { passwordHash: nextHash } });
        const revokedAt = now(clock);
        const sessionsRevoked = (await transaction.session.updateMany({ where: { accountId: account.id, revokedAt: null, expiresAt: { gt: revokedAt } }, data: { revokedAt } })).count;
        await recordUser(transaction, input.context, clock, "account.reset_password", "account", account.id, { sessionsRevoked });
      });
    },

    async bootstrapAdmin(input: BootstrapAdminInput) {
      return prisma.$transaction(async (transaction) => {
        await lockBootstrap(transaction);
        if (await transaction.accountRoleAssignment.count({ where: { role: "ADMIN" } }) !== 0) throw identityError("BOOTSTRAP_ALREADY_COMPLETED");
        let account;
        if ("existingAccountId" in input && input.existingAccountId !== undefined) {
          account = await transaction.account.findUnique({ where: { id: input.existingAccountId } });
          if (!account || account.status !== "ACTIVE" || !await findActiveScope(transaction, account)) throw identityError("ORGANIZATION_SCOPE_INVALID");
        } else {
          if (await transaction.account.count() !== 0) throw identityError("BOOTSTRAP_EXISTING_ACCOUNT_REQUIRED");
          const { username, normalizedUsername } = normalizeUsername(input.username);
          const displayName = normalizeDisplayName(input.displayName);
          assertPasswordPolicy(input.password);
          const passwordHash = await passwordHasher.hash(input.password);
          await requireApplicationOrganizationScope(transaction, input.organizationId, input.primaryOrgUnitId);
          account = await transaction.account.create({ data: { organizationId: input.organizationId, primaryOrgUnitId: input.primaryOrgUnitId, username, normalizedUsername, displayName, passwordHash, status: "ACTIVE" } });
        }
        const assignment = await transaction.accountRoleAssignment.create({ data: { accountId: account.id, organizationId: account.organizationId, role: "ADMIN", scopeOrgUnitId: account.primaryOrgUnitId } });
        await recorder(transaction).record({ actorKind: "SYSTEM", organizationId: account.organizationId, requestId: input.requestId, action: "bootstrap.admin", targetType: "account_role_assignment", targetId: assignment.id, details: { accountId: account.id }, occurredAt: now(clock) });
        return toAccountDto(account);
      });
    },

    async bootstrapInitialAccount(input: BootstrapInitialAccountInput) { return this.bootstrapAdmin({ ...input, requestId: "bootstrap-admin" }); },
  };
}
