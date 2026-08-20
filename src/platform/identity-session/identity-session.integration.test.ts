import { createHash, randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { bootstrapFromCli } from "../../cli/bootstrap-admin";
import { createTestPrismaClient } from "../database/prisma-client";
import { createIdentitySessionServiceForPrisma } from "./application/identity-service";

const prisma = createTestPrismaClient();
const organizationIds: string[] = [];
const password = "correct horse battery";
let currentTime = new Date("2026-08-19T00:00:00.000Z");
const clock = { now: () => new Date(currentTime.getTime()) };
const error = (code: string) => ({ code });
const gatedTransactionOptions = { maxWait: 10_000, timeout: 60_000 };
const repositoryTestOrganizationPrefixes = ["IDENTITY-", "AUTHZ-", "ORG-", "ACCESS-", "BOOT1-", "BOOT2-"] as const;

function deferred<T = void>() {
  let resolve!: (value?: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = (value) => done(value as T); reject = fail; });
  return { promise, resolve, reject };
}

function settle<T>(promise: Promise<T>) {
  return promise.then(
    (value) => ({ status: "fulfilled" as const, value }),
    (reason: unknown) => ({ status: "rejected" as const, reason }),
  );
}

function withCapturedBackendPid(client: PrismaClient, onBackendPid: (backendPid: number) => void): PrismaClient {
  const originalTransaction = client.$transaction.bind(client);
  const interactiveTransaction = <Result>(callback: (transaction: Prisma.TransactionClient) => Promise<Result>) => originalTransaction(async (transaction) => {
    const rows = await transaction.$queryRaw<Array<{ backend_pid: number }>>`SELECT pg_backend_pid() AS backend_pid`;
    onBackendPid(rows[0]!.backend_pid);
    return callback(transaction);
  }, gatedTransactionOptions);
  return new Proxy(client, { get(target, property) { if (property === "$transaction") return interactiveTransaction; return Reflect.get(target, property, target); } }) as PrismaClient;
}

async function waitForDatabaseCondition(condition: () => Promise<boolean>, description: string): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (!(await condition())) {
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for PostgreSQL condition: ${description}`);
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

async function waitForLockWaiters(pids: readonly number[], gatePid: number, description: string): Promise<void> {
  await waitForDatabaseCondition(async () => {
    const rows = await prisma.$queryRaw<Array<{ count: number }>>`
      WITH RECURSIVE lock_chain AS (
        SELECT activity.pid AS waiter_pid,
               unnest(pg_blocking_pids(activity.pid)) AS blocker_pid,
               ARRAY[activity.pid]::integer[] AS visited
        FROM pg_stat_activity AS activity
        WHERE activity.wait_event_type = 'Lock'
          AND (activity.pid = ${pids[0]} OR activity.pid = ${pids[1]})
        UNION ALL
        SELECT chain.waiter_pid,
               unnest(pg_blocking_pids(chain.blocker_pid)) AS blocker_pid,
               chain.visited || chain.blocker_pid
        FROM lock_chain AS chain
        WHERE NOT chain.blocker_pid = ANY(chain.visited)
      )
      SELECT count(DISTINCT waiter_pid)::integer AS count
      FROM lock_chain
      WHERE blocker_pid = ${gatePid}
    `;
    return rows[0]?.count === pids.length;
  }, description);
}

async function organization() {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  const created = await prisma.organization.create({ data: { code: `IDENTITY-${suffix}`, name: "Identity Organization" } });
  organizationIds.push(created.id);
  const rootOrgUnit = await prisma.orgUnit.create({ data: { organizationId: created.id, code: "ROOT", name: "Root", sortOrder: 0 } });
  return { organization: created, rootOrgUnit };
}

async function account(service = createIdentitySessionServiceForPrisma(prisma, { clock })) {
  const created = await organization();
  const result = await service.createAccount({ organizationId: created.organization.id, primaryOrgUnitId: created.rootOrgUnit.id, username: `User-${randomUUID().slice(0, 8)}`, displayName: "Test Account", password });
  return { result, organization: created, service };
}

beforeAll(async () => {
  const staleOrganizations = await prisma.organization.findMany({
    where: { OR: repositoryTestOrganizationPrefixes.map((prefix) => ({ code: { startsWith: prefix } })) },
    select: { id: true },
  });
  const ids = staleOrganizations.map(({ id }) => id);
  if (ids.length === 0) return;
  await prisma.auditLog.deleteMany({ where: { organizationId: { in: ids } } });
  await prisma.accountRoleAssignment.deleteMany({ where: { organizationId: { in: ids } } });
  await prisma.session.deleteMany({ where: { account: { organizationId: { in: ids } } } });
  await prisma.account.deleteMany({ where: { organizationId: { in: ids } } });
  await prisma.orgUnit.deleteMany({ where: { organizationId: { in: ids } } });
  await prisma.organization.deleteMany({ where: { id: { in: ids } } });
});

afterEach(async () => {
  while (organizationIds.length > 0) {
    const organizationId = organizationIds.pop()!;
    await prisma.auditLog.deleteMany({ where: { organizationId } });
    await prisma.accountRoleAssignment.deleteMany({ where: { organizationId } });
    await prisma.session.deleteMany({ where: { account: { organizationId } } });
    await prisma.account.deleteMany({ where: { organizationId } });
    await prisma.orgUnit.deleteMany({ where: { organizationId } });
    await prisma.organization.delete({ where: { id: organizationId } });
  }
  currentTime = new Date("2026-08-19T00:00:00.000Z");
});

afterAll(async () => { await prisma.$disconnect(); });

describe("Identity / Session PostgreSQL integration", () => {
  it("proves migration objects, normalized uniqueness, composite FK, and inactive scope checks", async () => {
    const rows = await prisma.$queryRaw<Array<{ account: boolean; session: boolean; compositeIndex: boolean }>>`SELECT to_regclass('account') IS NOT NULL AS account, to_regclass('session') IS NOT NULL AS session, to_regclass('org_unit_id_organization_id_key') IS NOT NULL AS "compositeIndex"`;
    expect(rows[0]).toEqual({ account: true, session: true, compositeIndex: true });
    const first = await organization();
    const second = await organization();
    const service = createIdentitySessionServiceForPrisma(prisma, { clock });
    await service.createAccount({ organizationId: first.organization.id, primaryOrgUnitId: first.rootOrgUnit.id, username: "Alice", displayName: "Alice", password });
    await expect(service.createAccount({ organizationId: second.organization.id, primaryOrgUnitId: second.rootOrgUnit.id, username: " alice ", displayName: "Duplicate", password })).rejects.toMatchObject(error("STATE.CONFLICT"));
    await expect(prisma.account.create({ data: { organizationId: first.organization.id, primaryOrgUnitId: second.rootOrgUnit.id, username: "raw-cross-org", normalizedUsername: "raw-cross-org", displayName: "Cross Org", passwordHash: "test-hash", status: "ACTIVE" } })).rejects.toMatchObject({ code: "P2003" });
    await expect(service.createAccount({ organizationId: first.organization.id, primaryOrgUnitId: second.rootOrgUnit.id, username: "cross-org", displayName: "Cross Org", password })).rejects.toMatchObject(error("BUSINESS_RULE.VIOLATION"));
    await prisma.organization.update({ where: { id: first.organization.id }, data: { status: "INACTIVE" } });
    await expect(service.createAccount({ organizationId: first.organization.id, primaryOrgUnitId: first.rootOrgUnit.id, username: "inactive-org", displayName: "Inactive Org", password })).rejects.toMatchObject(error("BUSINESS_RULE.VIOLATION"));
    const third = await organization();
    await prisma.orgUnit.update({ where: { id: third.rootOrgUnit.id }, data: { status: "INACTIVE" } });
    await expect(service.createAccount({ organizationId: third.organization.id, primaryOrgUnitId: third.rootOrgUnit.id, username: "inactive-unit", displayName: "Inactive Unit", password })).rejects.toMatchObject(error("BUSINESS_RULE.VIOLATION"));
  });

  it("authenticates with safe DTOs and maps short, wrong, unknown, INACTIVE, and LOCKED credentials to one public 401", async () => {
    const { result, service } = await account();
    expect(result).not.toHaveProperty("passwordHash");
    await expect(service.authenticate({ username: result.username, password })).resolves.toMatchObject({ account: { id: result.id } });
    await expect(service.authenticate({ username: result.username, password: "short" })).rejects.toMatchObject({ ...error("AUTH.AUTHENTICATION_FAILED"), httpStatus: 401 });
    await expect(service.authenticate({ username: result.username, password: "wrong password" })).rejects.toMatchObject({ ...error("AUTH.AUTHENTICATION_FAILED"), httpStatus: 401 });
    await expect(service.authenticate({ username: "unknown-user", password: "short" })).rejects.toMatchObject({ ...error("AUTH.AUTHENTICATION_FAILED"), httpStatus: 401 });
    await service.setAccountStatus({ accountId: result.id, status: "INACTIVE" });
    await expect(service.authenticate({ username: result.username, password })).rejects.toMatchObject({ ...error("AUTH.AUTHENTICATION_FAILED"), httpStatus: 401 });
    await service.setAccountStatus({ accountId: result.id, status: "ACTIVE" });
    await service.setAccountStatus({ accountId: result.id, status: "LOCKED" });
    await expect(service.authenticate({ username: result.username, password })).rejects.toMatchObject({ ...error("AUTH.AUTHENTICATION_FAILED"), httpStatus: 401 });
    const persisted = await prisma.account.findUniqueOrThrow({ where: { id: result.id } });
    expect(persisted.passwordHash).not.toBe(password);
  });

  it("proves exact seven-day expiry, logout revocation, and dynamic Organization / OrgUnit invalidation", async () => {
    const { result, organization: scope, service } = await account();
    const authenticated = await service.authenticate({ username: result.username, password, userAgent: "test-agent" });
    expect(authenticated.session.expiresAt.getTime() - authenticated.session.createdAt.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    const persistedSession = await prisma.session.findUniqueOrThrow({ where: { id: authenticated.session.id } });
    expect(persistedSession.tokenHash).toHaveLength(64);
    expect(Buffer.from(persistedSession.tokenHash).equals(Buffer.from(authenticated.rawToken))).toBe(false);
    expect(persistedSession.tokenHash).toBe(createHash("sha256").update(authenticated.rawToken, "utf8").digest("hex"));
    await expect(service.validateSession(authenticated.rawToken)).resolves.toMatchObject({ session: { id: authenticated.session.id } });
    await service.logout(authenticated.rawToken);
    expect((await prisma.session.findUniqueOrThrow({ where: { id: authenticated.session.id } })).revokedAt).toEqual(currentTime);
    await expect(service.validateSession(authenticated.rawToken)).rejects.toMatchObject(error("AUTH.AUTHENTICATION_REQUIRED"));
    await expect(service.logout(authenticated.rawToken)).resolves.toBeUndefined();

    const dynamicallyScoped = await service.authenticate({ username: result.username, password });
    await prisma.organization.update({ where: { id: scope.organization.id }, data: { status: "INACTIVE" } });
    await expect(service.validateSession(dynamicallyScoped.rawToken)).rejects.toMatchObject(error("AUTH.AUTHENTICATION_REQUIRED"));
    await prisma.organization.update({ where: { id: scope.organization.id }, data: { status: "ACTIVE" } });
    await expect(service.validateSession(dynamicallyScoped.rawToken)).resolves.toMatchObject({ session: { id: dynamicallyScoped.session.id } });
    await prisma.orgUnit.update({ where: { id: scope.rootOrgUnit.id }, data: { status: "INACTIVE" } });
    await expect(service.validateSession(dynamicallyScoped.rawToken)).rejects.toMatchObject(error("AUTH.AUTHENTICATION_REQUIRED"));
  });

  it("enforces three active sessions and permanently revokes on Account status change", async () => {
    const { result, service } = await account();
    const sessions = [];
    for (let index = 0; index < 3; index += 1) sessions.push(await service.authenticate({ username: result.username, password }));
    await expect(service.authenticate({ username: result.username, password })).rejects.toMatchObject(error("AUTH.SESSION_LIMIT_REACHED"));
    await service.setAccountStatus({ accountId: result.id, status: "INACTIVE" });
    expect(await prisma.session.count({ where: { accountId: result.id, revokedAt: { not: null } } })).toBe(3);
    await expect(service.validateSession(sessions[0]!.rawToken)).rejects.toMatchObject(error("AUTH.AUTHENTICATION_REQUIRED"));
    await service.setAccountStatus({ accountId: result.id, status: "ACTIVE" });
    await expect(service.validateSession(sessions[0]!.rawToken)).rejects.toMatchObject(error("AUTH.AUTHENTICATION_REQUIRED"));
  });

  it("deterministically proves two logins wait on the Account row before one creates the fourth session", async () => {
    const { result, service } = await account();
    await service.authenticate({ username: result.username, password });
    await service.authenticate({ username: result.username, password });
    const gateClient = createTestPrismaClient();
    const firstClient = createTestPrismaClient();
    const secondClient = createTestPrismaClient();
    const held = deferred();
    const release = deferred();
    let gatePromise: Promise<unknown> | undefined;
    let gatePid: number | undefined;
    try {
      gatePromise = gateClient.$transaction(async (transaction) => {
        const rows = await transaction.$queryRaw<Array<{ backend_pid: number }>>`SELECT pg_backend_pid() AS backend_pid`;
        gatePid = rows[0]!.backend_pid;
        await transaction.$queryRaw`SELECT id FROM "account" WHERE id = ${result.id}::uuid FOR UPDATE`;
        held.resolve();
        await release.promise;
      }, gatedTransactionOptions);
      await held.promise;
      let firstPid: number | undefined;
      let secondPid: number | undefined;
      const firstPromise = settle(createIdentitySessionServiceForPrisma(withCapturedBackendPid(firstClient, (pid) => { firstPid = pid; }), { clock }).authenticate({ username: result.username, password }));
      const secondPromise = settle(createIdentitySessionServiceForPrisma(withCapturedBackendPid(secondClient, (pid) => { secondPid = pid; }), { clock }).authenticate({ username: result.username, password }));
      await waitForDatabaseCondition(() => Promise.resolve(firstPid !== undefined && secondPid !== undefined), "both login transactions started");
      await waitForLockWaiters([firstPid!, secondPid!], gatePid!, "both logins waiting in the Account-row lock chain rooted at the gate backend");
      release.resolve();
      const outcomes = await Promise.all([firstPromise, secondPromise]);
      expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
      expect(outcomes.filter((outcome) => outcome.status === "rejected")).toHaveLength(1);
      expect(outcomes.find((outcome) => outcome.status === "rejected")).toMatchObject({ reason: error("AUTH.SESSION_LIMIT_REACHED") });
      expect(await prisma.session.count({ where: { accountId: result.id, revokedAt: null, expiresAt: { gt: currentTime } } })).toBe(3);
    } finally {
      release.resolve();
      await Promise.allSettled([gatePromise ?? Promise.resolve()]);
      await Promise.all([gateClient.$disconnect(), firstClient.$disconnect(), secondClient.$disconnect()]);
    }
  }, 90_000);

  it.each(["LOCKED", "INACTIVE"] as const)("deterministically proves login and Account %s transition share the row boundary", async (status) => {
    const { result } = await account();
    const gateClient = createTestPrismaClient();
    const loginClient = createTestPrismaClient();
    const statusClient = createTestPrismaClient();
    const held = deferred();
    const release = deferred();
    let gatePromise: Promise<unknown> | undefined;
    let gatePid: number | undefined;
    try {
      gatePromise = gateClient.$transaction(async (transaction) => {
        const rows = await transaction.$queryRaw<Array<{ backend_pid: number }>>`SELECT pg_backend_pid() AS backend_pid`;
        gatePid = rows[0]!.backend_pid;
        await transaction.$queryRaw`SELECT id FROM "account" WHERE id = ${result.id}::uuid FOR UPDATE`;
        held.resolve();
        await release.promise;
      }, gatedTransactionOptions);
      await held.promise;
      let loginPid: number | undefined;
      let statusPid: number | undefined;
      const loginPromise = settle(createIdentitySessionServiceForPrisma(withCapturedBackendPid(loginClient, (pid) => { loginPid = pid; }), { clock }).authenticate({ username: result.username, password }));
      const statusPromise = settle(createIdentitySessionServiceForPrisma(withCapturedBackendPid(statusClient, (pid) => { statusPid = pid; }), { clock }).setAccountStatus({ accountId: result.id, status }));
      await waitForDatabaseCondition(() => Promise.resolve(loginPid !== undefined && statusPid !== undefined), "login and status transactions started");
      await waitForLockWaiters([loginPid!, statusPid!], gatePid!, "login and status waiting in the Account-row lock chain rooted at the gate backend");
      release.resolve();
      await Promise.all([loginPromise, statusPromise]);
      expect((await prisma.account.findUniqueOrThrow({ where: { id: result.id } })).status).toBe(status);
      expect(await prisma.session.count({ where: { accountId: result.id, revokedAt: null, expiresAt: { gt: currentTime } } })).toBe(0);
    } finally {
      release.resolve();
      await Promise.allSettled([gatePromise ?? Promise.resolve()]);
      await Promise.all([gateClient.$disconnect(), loginClient.$disconnect(), statusClient.$disconnect()]);
    }
  }, 90_000);

  it("protects own-session revocation and clears current-session state", async () => {
    const first = await account();
    const second = await account();
    const firstSession = await first.service.authenticate({ username: first.result.username, password });
    const secondSession = await second.service.authenticate({ username: second.result.username, password });
    await expect(first.service.revokeOwnSession({ rawToken: firstSession.rawToken, sessionId: secondSession.session.id })).rejects.toMatchObject(error("RESOURCE.NOT_FOUND"));
    await expect(second.service.validateSession(secondSession.rawToken)).resolves.toBeDefined();
    await expect(first.service.revokeOwnSession({ rawToken: firstSession.rawToken, sessionId: firstSession.session.id })).resolves.toEqual({ current: true });
  });

  it("proves bootstrap-admin adapter behavior and serializes concurrent initial bootstrap", async () => {
    const created = await organization();
    const input = { organizationId: created.organization.id, primaryOrgUnitId: created.rootOrgUnit.id, username: `bootstrap-${randomUUID().slice(0, 8)}`, displayName: "Bootstrap", password };
    const createService = () => createIdentitySessionServiceForPrisma(prisma, { clock });
    const cliAccount = await bootstrapFromCli(input, { readPassword: async () => password, createService });
    expect(cliAccount).not.toHaveProperty("passwordHash");
    await expect(bootstrapFromCli({ ...input, username: `${input.username}-again` }, { readPassword: async () => password, createService })).rejects.toMatchObject(error("STATE.CONFLICT"));
    await prisma.auditLog.deleteMany({ where: { organizationId: created.organization.id } });
    await prisma.accountRoleAssignment.deleteMany({ where: { organizationId: created.organization.id } });
    await prisma.session.deleteMany({ where: { account: { organizationId: created.organization.id } } });
    await prisma.account.deleteMany({ where: { organizationId: created.organization.id } });
    const firstClient = createTestPrismaClient();
    const secondClient = createTestPrismaClient();
    const firstOrg = await organization();
    const raceInput = { organizationId: firstOrg.organization.id, primaryOrgUnitId: firstOrg.rootOrgUnit.id, username: `race-${randomUUID().slice(0, 8)}`, displayName: "Bootstrap Race", password };
    const gateClient = createTestPrismaClient();
    const held = deferred();
    const release = deferred();
    let gatePromise: Promise<unknown> | undefined;
    let gatePid: number | undefined;
    try {
      gatePromise = gateClient.$transaction(async (transaction) => {
        const rows = await transaction.$queryRaw<Array<{ backend_pid: number }>>`SELECT pg_backend_pid() AS backend_pid`;
        gatePid = rows[0]!.backend_pid;
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('identity-session-bootstrap', 0))`;
        held.resolve();
        await release.promise;
      }, gatedTransactionOptions);
      await held.promise;
      let firstPid: number | undefined;
      let secondPid: number | undefined;
      const firstPromise = settle(createIdentitySessionServiceForPrisma(withCapturedBackendPid(firstClient, (pid) => { firstPid = pid; }), { clock }).bootstrapInitialAccount(raceInput));
      const secondPromise = settle(createIdentitySessionServiceForPrisma(withCapturedBackendPid(secondClient, (pid) => { secondPid = pid; }), { clock }).bootstrapInitialAccount({ ...raceInput, username: `${raceInput.username}-other` }));
      await waitForDatabaseCondition(() => Promise.resolve(firstPid !== undefined && secondPid !== undefined), "both bootstrap transactions started");
      await waitForLockWaiters([firstPid!, secondPid!], gatePid!, "both bootstrap operations waiting in the advisory-lock chain rooted at the gate backend");
      release.resolve();
      const outcomes = await Promise.all([firstPromise, secondPromise]);
      expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
      expect(outcomes.filter((outcome) => outcome.status === "rejected")).toHaveLength(1);
      expect(outcomes.find((outcome) => outcome.status === "rejected")).toMatchObject({ reason: error("STATE.CONFLICT") });
      expect(await prisma.account.count({ where: { organizationId: firstOrg.organization.id } })).toBe(1);
    } finally {
      release.resolve();
      await Promise.allSettled([gatePromise ?? Promise.resolve()]);
      await Promise.all([gateClient.$disconnect(), firstClient.$disconnect(), secondClient.$disconnect()]);
    }
  }, 90_000);
});
