import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createRoleAssignmentService } from "../authorization/application/role-assignment-service";
import { createTestPrismaClient } from "../database/prisma-client";
import { createIdentitySessionServiceForPrisma } from "../identity-session/application/identity-service";
import { createAuthenticatedActor, createRequestContext, createRequestId } from "../request-context";
import { createAuditQueryServiceForPrisma } from "./application/audit-service";

const prisma = createTestPrismaClient();
const organizationIds: string[] = [];
const fixedNow = new Date("2026-08-20T00:00:00.000Z");
const clock = { now: () => new Date(fixedNow) };
const oldPassword = "correct horse battery";
const nextPassword = "changed horse battery";
const hasher = { async hash(value: string) { return `hash:${value}`; }, async verify(value: string, hash: string) { return hash === `hash:${value}`; } };
const error = (code: string) => ({ code });
const transactionOptions = { maxWait: 10_000, timeout: 60_000 };
const testOrganizationPrefixes = ["ACCESS-", "BOOT1-", "BOOT2-"] as const;

function deferred<T = void>() { let resolve!: (value?: T | PromiseLike<T>) => void; const promise = new Promise<T>((done) => { resolve = (value) => done(value as T); }); return { promise, resolve }; }
function settle<T>(promise: Promise<T>) { return promise.then((value) => ({ status: "fulfilled" as const, value }), (reason: unknown) => ({ status: "rejected" as const, reason })); }

function captureBackend(client: PrismaClient, onPid: (pid: number) => void): PrismaClient {
  const original = client.$transaction.bind(client);
  const transaction = <T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) => original(async (tx) => { const rows = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`; onPid(rows[0]!.pid); return callback(tx); }, transactionOptions);
  return new Proxy(client, { get(target, property) { return property === "$transaction" ? transaction : Reflect.get(target, property, target); } }) as PrismaClient;
}

async function waitUntil(condition: () => Promise<boolean>, description: string) { const deadline = Date.now() + 15_000; while (!await condition()) { if (Date.now() > deadline) throw new Error(`Timed out: ${description}`); await new Promise<void>((resolve) => setImmediate(resolve)); } }
async function waitForGate(pids: readonly number[], gatePid: number) {
  await waitUntil(async () => (await prisma.$queryRaw<{ count: number }[]>`
    WITH RECURSIVE chain AS (
      SELECT a.pid AS waiter_pid, unnest(pg_blocking_pids(a.pid)) AS blocker_pid, ARRAY[a.pid]::integer[] AS visited
      FROM pg_stat_activity a WHERE a.wait_event_type = 'Lock' AND (a.pid = ${pids[0]} OR a.pid = ${pids[1]})
      UNION ALL
      SELECT c.waiter_pid, unnest(pg_blocking_pids(c.blocker_pid)), c.visited || c.blocker_pid
      FROM chain c WHERE NOT c.blocker_pid = ANY(c.visited)
    ) SELECT count(DISTINCT waiter_pid)::int AS count FROM chain WHERE blocker_pid = ${gatePid}
  `)[0]?.count === pids.length, "both writers to wait in the PostgreSQL lock chain");
}

async function createOrganization(label = "ACCESS") {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  const organization = await prisma.organization.create({ data: { code: `${label}-${suffix}`, name: `${label} Organization` } });
  organizationIds.push(organization.id);
  const root = await prisma.orgUnit.create({ data: { organizationId: organization.id, code: "ROOT", name: "Root", sortOrder: 0 } });
  return { organization, root };
}

async function createAccount(organizationId: string, primaryOrgUnitId: string, name: string) {
  const suffix = randomUUID().slice(0, 8);
  return prisma.account.create({ data: { organizationId, primaryOrgUnitId, username: `${name}-${suffix}`, normalizedUsername: `${name}-${suffix}`.toLowerCase(), displayName: name, passwordHash: `hash:${oldPassword}`, status: "ACTIVE" } });
}

function context(accountId: string, organizationId: string, sessionId: string = randomUUID(), requestId = `access-${randomUUID()}`) {
  return createRequestContext({ actor: createAuthenticatedActor({ kind: "user", userId: accountId, sessionId, organizationId, organizationUnitId: null }), clock, requestIdFactory: () => createRequestId(requestId) });
}

beforeAll(async () => {
  const staleOrganizations = await prisma.organization.findMany({
    where: { OR: testOrganizationPrefixes.map((prefix) => ({ code: { startsWith: prefix } })) },
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

async function createAdmins(count = 2) {
  const scope = await createOrganization();
  const accounts = [];
  for (let index = 0; index < count; index += 1) {
    const account = await createAccount(scope.organization.id, scope.root.id, `Admin${index + 1}`);
    await prisma.accountRoleAssignment.create({ data: { accountId: account.id, organizationId: scope.organization.id, role: "ADMIN", scopeOrgUnitId: scope.root.id } });
    accounts.push(account);
  }
  return { ...scope, accounts };
}

afterEach(async () => {
  if (organizationIds.length === 0) return;
  const ids = [...organizationIds];
  await prisma.auditLog.deleteMany({ where: { organizationId: { in: ids } } });
  await prisma.accountRoleAssignment.deleteMany({ where: { organizationId: { in: ids } } });
  await prisma.session.deleteMany({ where: { account: { organizationId: { in: ids } } } });
  await prisma.account.deleteMany({ where: { organizationId: { in: ids } } });
  await prisma.orgUnit.deleteMany({ where: { organizationId: { in: ids } } });
  await prisma.organization.deleteMany({ where: { id: { in: ids } } });
  organizationIds.length = 0;
});
afterAll(async () => { await prisma.$disconnect(); });

describe("Slice 1D PostgreSQL acceptance", () => {
  it("ACCESS-DB-01 deploys Audit enum, table, actor CHECK, foreign keys, and required indexes", async () => {
    const rows = await prisma.$queryRaw<{ actorKind: boolean; auditLog: boolean; actorCheck: boolean; foreignKeys: number; indexes: number }[]>`
      SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditActorKind') AS "actorKind",
        to_regclass('audit_log') IS NOT NULL AS "auditLog",
        EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_log_actor_fields_check' AND contype = 'c') AS "actorCheck",
        (SELECT count(*)::int FROM pg_constraint WHERE conrelid = 'audit_log'::regclass AND contype = 'f') AS "foreignKeys",
        (SELECT count(*)::int FROM pg_indexes WHERE tablename = 'audit_log' AND indexname <> 'audit_log_pkey') AS indexes
    `;
    expect(rows[0]).toEqual({ actorKind: true, auditLog: true, actorCheck: true, foreignKeys: 2, indexes: 4 });
  });

  it("ACCESS-DB-02 rejects a USER actor from another Organization", async () => {
    const first = await createOrganization(); const second = await createOrganization(); const actor = await createAccount(second.organization.id, second.root.id, "Other");
    await expect(prisma.auditLog.create({ data: { organizationId: first.organization.id, actorKind: "USER", actorAccountId: actor.id, actorSessionId: randomUUID(), requestId: "cross-org", action: "account.update", targetType: "account", targetId: randomUUID() } })).rejects.toMatchObject({ code: "P2003" });
  });

  it("ACCESS-DB-03 rejects SYSTEM audit rows with Account or Session actor fields", async () => {
    const scope = await createOrganization(); const actor = await createAccount(scope.organization.id, scope.root.id, "Actor");
    await expect(prisma.auditLog.create({ data: { organizationId: scope.organization.id, actorKind: "SYSTEM", actorAccountId: actor.id, actorSessionId: randomUUID(), requestId: "invalid-system", action: "bootstrap.admin", targetType: "account", targetId: actor.id } })).rejects.toBeDefined();
  });

  it("ACCESS-DB-04 commits a managed Account and its Audit together", async () => {
    const scope = await createAdmins(1); const actor = scope.accounts[0]!;
    const service = createIdentitySessionServiceForPrisma(prisma, { clock, passwordHasher: hasher });
    const created = await service.createManagedAccount({ context: context(actor.id, scope.organization.id), username: `managed-${randomUUID().slice(0, 8)}`, displayName: "Managed", primaryOrgUnitId: scope.root.id, password: oldPassword });
    expect(await prisma.account.count({ where: { id: created.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { organizationId: scope.organization.id, action: "account.create", targetId: created.id } })).toBe(1);
  });

  it("ACCESS-DB-05 rolls the business mutation back when Audit validation fails", async () => {
    const scope = await createAdmins(1); const actor = scope.accounts[0]!; const username = `rollback-${randomUUID().slice(0, 8)}`;
    const service = createIdentitySessionServiceForPrisma(prisma, { clock, passwordHasher: hasher });
    await expect(service.createManagedAccount({ context: context(actor.id, scope.organization.id, randomUUID(), "x".repeat(129)), username, displayName: "Rollback", primaryOrgUnitId: scope.root.id, password: oldPassword })).rejects.toMatchObject(error("PLATFORM.VALIDATION_FAILED"));
    expect(await prisma.account.count({ where: { normalizedUsername: username } })).toBe(0);
  });

  it("ACCESS-DB-06 leaves zero Audit rows when the business mutation fails", async () => {
    const scope = await createAdmins(1); const actor = scope.accounts[0]!; const service = createIdentitySessionServiceForPrisma(prisma, { clock, passwordHasher: hasher });
    await expect(service.setManagedAccountStatus({ context: context(actor.id, scope.organization.id), accountId: actor.id, status: "INACTIVE" })).rejects.toMatchObject(error("BUSINESS_RULE.VIOLATION"));
    expect(await prisma.auditLog.count({ where: { organizationId: scope.organization.id, action: "account.set_status" } })).toBe(0);
  });

  it("ACCESS-DB-07 deterministically serializes two Admin deactivations and preserves one effective Admin", async () => {
    const scope = await createAdmins(2); const gate = createTestPrismaClient(); const first = createTestPrismaClient(); const second = createTestPrismaClient(); const held = deferred(); const release = deferred(); let gatePid = 0; let firstPid = 0; let secondPid = 0;
    try {
      const gatePromise = gate.$transaction(async (tx) => { gatePid = (await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`)[0]!.pid; await tx.$queryRaw`SELECT id FROM "organization" WHERE id = ${scope.organization.id}::uuid FOR UPDATE`; held.resolve(); await release.promise; }, transactionOptions);
      await held.promise;
      const firstPromise = settle(createIdentitySessionServiceForPrisma(captureBackend(first, (pid) => { firstPid = pid; }), { clock, passwordHasher: hasher }).setManagedAccountStatus({ context: context(scope.accounts[0]!.id, scope.organization.id), accountId: scope.accounts[0]!.id, status: "INACTIVE" }));
      const secondPromise = settle(createIdentitySessionServiceForPrisma(captureBackend(second, (pid) => { secondPid = pid; }), { clock, passwordHasher: hasher }).setManagedAccountStatus({ context: context(scope.accounts[1]!.id, scope.organization.id), accountId: scope.accounts[1]!.id, status: "INACTIVE" }));
      await waitUntil(async () => firstPid > 0 && secondPid > 0, "both status transactions to start"); await waitForGate([firstPid, secondPid], gatePid); release.resolve();
      const outcomes = await Promise.all([firstPromise, secondPromise, gatePromise.then(() => ({ status: "gate" as const }))]);
      expect(outcomes.filter((item) => item.status === "fulfilled")).toHaveLength(1); expect(outcomes.filter((item) => item.status === "rejected")).toHaveLength(1);
      expect(outcomes.find((item) => item.status === "rejected")).toMatchObject({ reason: { internalMessage: "LAST_EFFECTIVE_ADMIN" } });
      expect(await prisma.account.count({ where: { organizationId: scope.organization.id, status: "ACTIVE", roleAssignments: { some: { role: "ADMIN" } }, primaryOrgUnit: { status: "ACTIVE" } } })).toBe(1);
    } finally { release.resolve(); await Promise.all([gate.$disconnect(), first.$disconnect(), second.$disconnect()]); }
  }, 90_000);

  it("ACCESS-DB-08 serializes Account status against ADMIN revoke and never reaches zero effective Admin", async () => {
    const scope = await createAdmins(2); const secondAssignment = await prisma.accountRoleAssignment.findFirstOrThrow({ where: { accountId: scope.accounts[1]!.id, role: "ADMIN" } }); const gate = createTestPrismaClient(); const first = createTestPrismaClient(); const second = createTestPrismaClient(); const held = deferred(); const release = deferred(); let gatePid = 0; let firstPid = 0; let secondPid = 0;
    try {
      const gatePromise = gate.$transaction(async (tx) => { gatePid = (await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`)[0]!.pid; await tx.$queryRaw`SELECT id FROM "organization" WHERE id = ${scope.organization.id}::uuid FOR UPDATE`; held.resolve(); await release.promise; }, transactionOptions); await held.promise;
      const status = settle(createIdentitySessionServiceForPrisma(captureBackend(first, (pid) => { firstPid = pid; }), { clock, passwordHasher: hasher }).setManagedAccountStatus({ context: context(scope.accounts[0]!.id, scope.organization.id), accountId: scope.accounts[0]!.id, status: "LOCKED" }));
      const revoke = settle(createRoleAssignmentService(captureBackend(second, (pid) => { secondPid = pid; })).revokeManagedRole({ context: context(scope.accounts[1]!.id, scope.organization.id), assignmentId: secondAssignment.id }));
      await waitUntil(async () => firstPid > 0 && secondPid > 0, "status and revoke transactions to start"); await waitForGate([firstPid, secondPid], gatePid); release.resolve(); const outcomes = await Promise.all([status, revoke]); await gatePromise;
      expect(outcomes.filter((item) => item.status === "fulfilled")).toHaveLength(1); expect(outcomes.filter((item) => item.status === "rejected")).toHaveLength(1);
      expect(outcomes.find((item) => item.status === "rejected")).toMatchObject({ reason: { internalMessage: "LAST_EFFECTIVE_ADMIN" } });
      const count = await prisma.$queryRaw<{ count: number }[]>`SELECT COUNT(DISTINCT a.id)::int AS count FROM "account" a JOIN "account_role_assignment" r ON r."accountId"=a.id AND r.role='ADMIN' JOIN "org_unit" u ON u.id=a."primaryOrgUnitId" WHERE a."organizationId"=${scope.organization.id}::uuid AND a.status='ACTIVE' AND u.status='ACTIVE'`;
      expect(count[0]!.count).toBe(1);
    } finally { release.resolve(); await Promise.all([gate.$disconnect(), first.$disconnect(), second.$disconnect()]); }
  }, 90_000);

  it("ACCESS-DB-09 deterministically allows exactly one concurrent bootstrap and one SYSTEM Audit", async () => {
    const firstScope = await createOrganization("BOOT1"); const secondScope = await createOrganization("BOOT2"); const firstAccount = await createAccount(firstScope.organization.id, firstScope.root.id, "BootstrapA"); const secondAccount = await createAccount(secondScope.organization.id, secondScope.root.id, "BootstrapB"); const gate = createTestPrismaClient(); const first = createTestPrismaClient(); const second = createTestPrismaClient(); const held = deferred(); const release = deferred(); let gatePid = 0; let firstPid = 0; let secondPid = 0;
    try {
      const gatePromise = gate.$transaction(async (tx) => { gatePid = (await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`)[0]!.pid; await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('identity-session-bootstrap', 0))`; held.resolve(); await release.promise; }, transactionOptions); await held.promise;
      const run = (client: PrismaClient, onPid: (pid: number) => void, existingAccountId: string, suffix: string) => settle(createIdentitySessionServiceForPrisma(captureBackend(client, onPid), { clock, passwordHasher: hasher }).bootstrapAdmin({ existingAccountId, requestId: `bootstrap-${suffix}` }));
      const a = run(first, (pid) => { firstPid = pid; }, firstAccount.id, "a"); const b = run(second, (pid) => { secondPid = pid; }, secondAccount.id, "b");
      await waitUntil(async () => firstPid > 0 && secondPid > 0, "bootstrap transactions to start"); await waitForGate([firstPid, secondPid], gatePid); release.resolve(); const outcomes = await Promise.all([a, b]); await gatePromise;
      const diagnostic = outcomes.map((item) => item.status === "fulfilled" ? item.status : { status: item.status, reason: item.reason instanceof Error ? { name: item.reason.name, message: item.reason.message } : item.reason });
      expect(outcomes.filter((item) => item.status === "fulfilled"), JSON.stringify(diagnostic)).toHaveLength(1); expect(outcomes.filter((item) => item.status === "rejected")).toHaveLength(1);
      expect(await prisma.accountRoleAssignment.count({ where: { role: "ADMIN", organizationId: { in: [firstScope.organization.id, secondScope.organization.id] } } })).toBe(1);
      expect(await prisma.auditLog.count({ where: { action: "bootstrap.admin", organizationId: { in: [firstScope.organization.id, secondScope.organization.id] } } })).toBe(1);
    } finally { release.resolve(); await Promise.all([gate.$disconnect(), first.$disconnect(), second.$disconnect()]); }
  }, 90_000);

  it("ACCESS-DB-10 prevents an old-password login from creating a Session after reset commits", async () => {
    const scope = await createAdmins(1); const admin = scope.accounts[0]!; const target = await createAccount(scope.organization.id, scope.root.id, "Target"); const verified = deferred(); const release = deferred();
    const delayedHasher = { ...hasher, async verify(value: string, hash: string) { const result = hash === `hash:${value}`; verified.resolve(); await release.promise; return result; } };
    const login = settle(createIdentitySessionServiceForPrisma(prisma, { clock, passwordHasher: delayedHasher }).authenticate({ username: target.username, password: oldPassword }));
    await verified.promise;
    await createIdentitySessionServiceForPrisma(prisma, { clock, passwordHasher: hasher }).resetManagedPassword({ context: context(admin.id, scope.organization.id), accountId: target.id, newPassword: nextPassword });
    release.resolve();
    await expect(login).resolves.toMatchObject({ status: "rejected", reason: error("AUTH.AUTHENTICATION_FAILED") });
    expect(await prisma.session.count({ where: { accountId: target.id } })).toBe(0);
  });

  it("ACCESS-DB-11 preserves the current Session, revokes others, and audits self password change atomically", async () => {
    const scope = await createOrganization(); const target = await createAccount(scope.organization.id, scope.root.id, "Self"); const service = createIdentitySessionServiceForPrisma(prisma, { clock, passwordHasher: hasher });
    const current = await service.authenticate({ username: target.username, password: oldPassword }); const other = await service.authenticate({ username: target.username, password: oldPassword });
    await service.changeOwnPassword({ context: context(target.id, scope.organization.id, current.session.id), currentPassword: oldPassword, newPassword: nextPassword });
    expect((await prisma.session.findUniqueOrThrow({ where: { id: current.session.id } })).revokedAt).toBeNull(); expect((await prisma.session.findUniqueOrThrow({ where: { id: other.session.id } })).revokedAt).toEqual(fixedNow);
    expect(await prisma.auditLog.count({ where: { action: "account.change_password", targetId: target.id } })).toBe(1);
  });

  it("ACCESS-DB-12 revokes all target Sessions, preserves INACTIVE/LOCKED status, and audits admin reset atomically", async () => {
    const scope = await createAdmins(1); const admin = scope.accounts[0]!; const service = createIdentitySessionServiceForPrisma(prisma, { clock, passwordHasher: hasher });
    for (const status of ["INACTIVE", "LOCKED"] as const) {
      const target = await createAccount(scope.organization.id, scope.root.id, `Reset${status}`); const one = await service.authenticate({ username: target.username, password: oldPassword }); const two = await service.authenticate({ username: target.username, password: oldPassword }); await prisma.account.update({ where: { id: target.id }, data: { status } });
      await service.resetManagedPassword({ context: context(admin.id, scope.organization.id), accountId: target.id, newPassword: nextPassword });
      expect((await prisma.account.findUniqueOrThrow({ where: { id: target.id } })).status).toBe(status); expect(await prisma.session.count({ where: { id: { in: [one.session.id, two.session.id] }, revokedAt: fixedNow } })).toBe(2);
      expect(await prisma.auditLog.count({ where: { action: "account.reset_password", targetId: target.id } })).toBe(1);
    }
    await expect(service.resetManagedPassword({ context: context(admin.id, scope.organization.id), accountId: admin.id, newPassword: nextPassword })).rejects.toMatchObject(error("BUSINESS_RULE.VIOLATION"));
  });

  it("ACCESS-REPAIR-DB-01 makes legacy status and Role Assignment mutations enforce Last Admin and SYSTEM Audit", async () => {
    const scope = await createAdmins(1); const admin = scope.accounts[0]!;
    const identity = createIdentitySessionServiceForPrisma(prisma, { clock, passwordHasher: hasher });
    const authorization = createRoleAssignmentService(prisma);
    const adminAssignment = await prisma.accountRoleAssignment.findFirstOrThrow({ where: { accountId: admin.id, role: "ADMIN" } });

    await expect(identity.setAccountStatus({ accountId: admin.id, status: "INACTIVE" })).rejects.toMatchObject(error("BUSINESS_RULE.VIOLATION"));
    expect((await prisma.account.findUniqueOrThrow({ where: { id: admin.id } })).status).toBe("ACTIVE");
    await expect(authorization.revokeRoleAssignment({ assignmentId: adminAssignment.id })).rejects.toMatchObject(error("BUSINESS_RULE.VIOLATION"));
    expect(await prisma.accountRoleAssignment.count({ where: { id: adminAssignment.id } })).toBe(1);

    const target = await createAccount(scope.organization.id, scope.root.id, "LegacyTarget");
    const viewer = await authorization.assignRoleToAccount({ accountId: target.id, organizationId: scope.organization.id, role: "VIEWER", scopeOrgUnitId: scope.root.id });
    await identity.setAccountStatus({ accountId: target.id, status: "LOCKED" });
    await authorization.revokeRoleAssignment({ assignmentId: viewer.id });
    expect(await prisma.auditLog.count({ where: { organizationId: scope.organization.id, actorKind: "SYSTEM", action: { in: ["role_assignment.assign", "account.set_status", "role_assignment.revoke"] } } })).toBe(3);
  });

  it("ACCESS-REPAIR-DB-02 rejects cross-Organization Account, OrgUnit, and Role Assignment inputs with stable AppErrors", async () => {
    const first = await createAdmins(1); const second = await createOrganization();
    const actor = first.accounts[0]!; const target = await createAccount(first.organization.id, first.root.id, "Target"); const other = await createAccount(second.organization.id, second.root.id, "Other");
    const identity = createIdentitySessionServiceForPrisma(prisma, { clock, passwordHasher: hasher });
    const authorization = createRoleAssignmentService(prisma);
    const actorContext = context(actor.id, first.organization.id);
    const otherAssignment = await prisma.accountRoleAssignment.create({ data: { accountId: other.id, organizationId: second.organization.id, role: "VIEWER", scopeOrgUnitId: second.root.id } });

    await expect(identity.createManagedAccount({ context: actorContext, username: `cross-${randomUUID().slice(0, 8)}`, displayName: "Cross", primaryOrgUnitId: second.root.id, password: oldPassword })).rejects.toMatchObject({ code: "BUSINESS_RULE.VIOLATION", httpStatus: 422, internalMessage: "ORGANIZATION_SCOPE_INVALID" });
    await expect(identity.updateManagedAccount({ context: actorContext, accountId: target.id, primaryOrgUnitId: second.root.id })).rejects.toMatchObject({ code: "BUSINESS_RULE.VIOLATION", httpStatus: 422, internalMessage: "ORGANIZATION_SCOPE_INVALID" });
    await expect(identity.getManagedAccount({ context: actorContext, accountId: other.id })).rejects.toMatchObject({ code: "RESOURCE.NOT_FOUND", httpStatus: 404 });
    await expect(identity.setManagedAccountStatus({ context: actorContext, accountId: other.id, status: "LOCKED" })).rejects.toMatchObject({ code: "RESOURCE.NOT_FOUND", httpStatus: 404 });
    await expect(identity.resetManagedPassword({ context: actorContext, accountId: other.id, newPassword: nextPassword })).rejects.toMatchObject({ code: "RESOURCE.NOT_FOUND", httpStatus: 404 });

    await expect(authorization.listManagedRoleAssignments({ context: actorContext, accountId: other.id })).rejects.toMatchObject({ code: "RESOURCE.NOT_FOUND", httpStatus: 404 });
    await expect(authorization.assignManagedRole({ context: actorContext, accountId: other.id, role: "VIEWER", scopeOrgUnitId: first.root.id })).rejects.toMatchObject({ code: "BUSINESS_RULE.VIOLATION", httpStatus: 422 });
    await expect(authorization.assignManagedRole({ context: actorContext, accountId: target.id, role: "VIEWER", scopeOrgUnitId: second.root.id })).rejects.toMatchObject({ code: "BUSINESS_RULE.VIOLATION", httpStatus: 422 });
    await expect(authorization.revokeManagedRole({ context: actorContext, assignmentId: otherAssignment.id })).rejects.toMatchObject({ code: "RESOURCE.NOT_FOUND", httpStatus: 404 });
  });

  it("ACCESS-REPAIR-DB-03 rolls password, Session revocation, and Audit back together when Audit fails", async () => {
    const scope = await createAdmins(1); const admin = scope.accounts[0]!; const target = await createAccount(scope.organization.id, scope.root.id, "RollbackTarget");
    const service = createIdentitySessionServiceForPrisma(prisma, { clock, passwordHasher: hasher });
    const self = await service.authenticate({ username: target.username, password: oldPassword }); const selfOther = await service.authenticate({ username: target.username, password: oldPassword });
    const invalidSelfContext = context(target.id, scope.organization.id, self.session.id, "x".repeat(129));
    await expect(service.changeOwnPassword({ context: invalidSelfContext, currentPassword: oldPassword, newPassword: nextPassword })).rejects.toMatchObject(error("PLATFORM.VALIDATION_FAILED"));
    expect((await prisma.account.findUniqueOrThrow({ where: { id: target.id } })).passwordHash).toBe(`hash:${oldPassword}`);
    expect(await prisma.session.count({ where: { id: { in: [self.session.id, selfOther.session.id] }, revokedAt: null } })).toBe(2);
    expect(await prisma.auditLog.count({ where: { targetId: target.id, action: "account.change_password" } })).toBe(0);

    const invalidAdminContext = context(admin.id, scope.organization.id, randomUUID(), "y".repeat(129));
    await expect(service.resetManagedPassword({ context: invalidAdminContext, accountId: target.id, newPassword: nextPassword })).rejects.toMatchObject(error("PLATFORM.VALIDATION_FAILED"));
    expect((await prisma.account.findUniqueOrThrow({ where: { id: target.id } })).passwordHash).toBe(`hash:${oldPassword}`);
    expect(await prisma.session.count({ where: { id: { in: [self.session.id, selfOther.session.id] }, revokedAt: null } })).toBe(2);
    expect(await prisma.auditLog.count({ where: { targetId: target.id, action: "account.reset_password" } })).toBe(0);
  });

  it("ACCESS-REPAIR-DB-04 isolates Audit queries by actor Organization and applies [from,to) Instant boundaries", async () => {
    const first = await createAdmins(1); const second = await createOrganization(); const actor = first.accounts[0]!;
    const lower = new Date("2026-08-19T16:00:00.000Z"); const inside = new Date("2026-08-20T00:00:00.000Z"); const upper = new Date("2026-08-20T16:00:00.000Z");
    await prisma.auditLog.createMany({ data: [
      { organizationId: first.organization.id, actorKind: "SYSTEM", requestId: "lower", action: "account.update", targetType: "account", targetId: "lower", details: { field: "displayName" }, occurredAt: lower },
      { organizationId: first.organization.id, actorKind: "SYSTEM", requestId: "inside", action: "account.update", targetType: "account", targetId: "inside", details: { field: "displayName" }, occurredAt: inside },
      { organizationId: first.organization.id, actorKind: "SYSTEM", requestId: "upper", action: "account.update", targetType: "account", targetId: "upper", details: { field: "displayName" }, occurredAt: upper },
      { organizationId: second.organization.id, actorKind: "SYSTEM", requestId: "other-org", action: "account.update", targetType: "account", targetId: "other-org", details: { field: "displayName" }, occurredAt: inside },
    ] });
    const result = await createAuditQueryServiceForPrisma(prisma).query({ context: context(actor.id, first.organization.id), action: "account.update", from: lower, to: upper, page: 1, pageSize: 25 });
    expect(result.items.map((item) => item.targetId).sort()).toEqual(["inside", "lower"]);
    expect(result.items.every((item) => item.organizationId === first.organization.id)).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/password|rawToken|tokenHash|authorization|cookie|secret/i);
  });
});
