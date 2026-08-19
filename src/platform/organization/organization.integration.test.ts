import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { createTestPrismaClient } from "../database/prisma-client";
import { createOrganizationServiceForPrisma } from "./application/organization-service";

const prisma = createTestPrismaClient();
const service = createOrganizationServiceForPrisma(prisma);
const organizationIds: string[] = [];
const error = (kind: string) => ({ internalMessage: kind });
const testGateKey = 9_001_001;
const gatedTransactionOptions = { maxWait: 10_000, timeout: 60_000 };

function withExtendedInteractiveTransactionTimeout(client: PrismaClient, onBackendPid: (backendPid: number) => void): PrismaClient {
  const interactiveTransaction = <Result>(callback: (transaction: Prisma.TransactionClient) => Promise<Result>) => client.$transaction(async (transaction) => {
    const rows = await transaction.$queryRaw<Array<{ backend_pid: number }>>`SELECT pg_backend_pid() AS backend_pid`;
    onBackendPid(rows[0]!.backend_pid);
    return callback(transaction);
  }, gatedTransactionOptions);
  return new Proxy(client, {
    get(target, property) {
      if (property === "$transaction") return interactiveTransaction;
      return Reflect.get(target, property, target);
    },
  }) as PrismaClient;
}
function describeTestFailure(reason: unknown): string {
  return reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason);
}
function deferred() { let resolve!: () => void; return { promise: new Promise<void>((done) => { resolve = done; }), resolve }; }
async function waitForDatabaseCondition(condition: () => Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (!(await condition())) {
    if (Date.now() >= deadline) throw new Error("Timed out waiting for PostgreSQL lock state.");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
async function organization() {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  const result = await service.createOrganizationWithRoot({ code: `ORG-${suffix}`, name: "Organization", root: { code: "ROOT", name: "Root", sortOrder: 0 } });
  organizationIds.push(result.organization.id); return result;
}
async function child(org: Awaited<ReturnType<typeof organization>>, code: string, parentId = org.rootOrgUnit.id) {
  return service.createOrgUnit({ organizationId: org.organization.id, parentId, code, name: code, sortOrder: 0 });
}
afterEach(async () => { await prisma.$executeRaw`DROP TRIGGER IF EXISTS "org_test_fail_root" ON "org_unit"`; await prisma.$executeRaw`DROP FUNCTION IF EXISTS "org_test_fail_root"()`; await prisma.$executeRaw`DROP TRIGGER IF EXISTS "org_test_hold_status_update" ON "organization"`; await prisma.$executeRaw`DROP FUNCTION IF EXISTS "org_test_hold_status_update"()`; while (organizationIds.length) { const id = organizationIds.pop()!; await prisma.orgUnit.deleteMany({ where: { organizationId: id } }); await prisma.organization.delete({ where: { id } }); } });
afterAll(async () => { await prisma.$disconnect(); });

describe("Organization PostgreSQL integration", () => {
  it("ORG-DB-01 formal Migration has deployed tables, constraints, and indexes", async () => {
    const rows = await prisma.$queryRaw<Array<{ organization: boolean; orgUnit: boolean; rootIndex: boolean }>>`SELECT to_regclass('organization') IS NOT NULL AS organization, to_regclass('org_unit') IS NOT NULL AS "orgUnit", to_regclass('org_unit_one_root_per_organization_key') IS NOT NULL AS "rootIndex"`;
    expect(rows[0]).toEqual({ organization: true, orgUnit: true, rootIndex: true });
  });
  it("ORG-DB-02 createOrganizationWithRoot atomically commits", async () => { const created = await organization(); expect(created.rootOrgUnit.parentId).toBeNull(); expect(await prisma.orgUnit.count({ where: { organizationId: created.organization.id } })).toBe(1); });
  it("ORG-DB-03 root write failure rolls back its Organization", async () => {
    await prisma.$executeRaw`CREATE FUNCTION "org_test_fail_root"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'controlled root failure'; END; $$`;
    await prisma.$executeRaw`CREATE TRIGGER "org_test_fail_root" BEFORE INSERT ON "org_unit" FOR EACH ROW WHEN (NEW."parentId" IS NULL) EXECUTE FUNCTION "org_test_fail_root"()`;
    const code = `ROLLBACK-${randomUUID().slice(0, 8).toUpperCase()}`;
    await expect(service.createOrganizationWithRoot({ code, name: "Rollback", root: { code: "ROOT", name: "Root", sortOrder: 0 } })).rejects.toBeDefined();
    expect(await prisma.organization.count({ where: { code } })).toBe(0);
  });
  it("ORG-DB-04 maps Organization code conflicts", async () => { const created = await organization(); await expect(service.createOrganizationWithRoot({ code: created.organization.code.toLowerCase(), name: "Duplicate", root: { code: "ROOT", name: "Root", sortOrder: 0 } })).rejects.toMatchObject(error("ORGANIZATION_CODE_CONFLICT")); });
  it("ORG-DB-05 enforces OrgUnit code uniqueness only within an Organization", async () => { const first = await organization(); const second = await organization(); await child(first, "DUP"); await expect(child(first, "DUP")).rejects.toMatchObject(error("ORG_UNIT_CODE_CONFLICT")); await expect(child(second, "DUP")).resolves.toMatchObject({ code: "DUP" }); });
  it("ORG-DB-06 database rejects a second root", async () => { const created = await organization(); await expect(prisma.orgUnit.create({ data: { organizationId: created.organization.id, parentId: null, code: "SECOND", name: "Second", sortOrder: 0 } })).rejects.toBeDefined(); });
  it("ORG-DB-07 rejects a cross-organization parent", async () => { const first = await organization(); const second = await organization(); await expect(child(first, "BAD", second.rootOrgUnit.id)).rejects.toMatchObject(error("CROSS_ORGANIZATION_PARENT")); });
  it("ORG-DB-08 moveOrgUnit rejects a hierarchy cycle", async () => { const created = await organization(); const a = await child(created, "A"); const b = await child(created, "B", a.id); await expect(service.moveOrgUnit({ orgUnitId: a.id, newParentId: b.id })).rejects.toMatchObject(error("HIERARCHY_CYCLE")); });
  it("ORG-DB-09 inactive parents reject new and reactivated children", async () => { const created = await organization(); const parent = await child(created, "P"); const existing = await child(created, "C", parent.id); await service.setOrgUnitStatus({ orgUnitId: existing.id, status: "INACTIVE" }); await service.setOrgUnitStatus({ orgUnitId: parent.id, status: "INACTIVE" }); await expect(child(created, "NEW", parent.id)).rejects.toMatchObject(error("INACTIVE_PARENT")); await expect(service.setOrgUnitStatus({ orgUnitId: existing.id, status: "ACTIVE" })).rejects.toMatchObject(error("INACTIVE_PARENT")); });
  it("ORG-DB-10 active descendants prevent ancestor deactivation", async () => { const created = await organization(); await child(created, "ACTIVE"); await expect(service.setOrgUnitStatus({ orgUnitId: created.rootOrgUnit.id, status: "INACTIVE" })).rejects.toMatchObject(error("ACTIVE_DESCENDANTS_PREVENT_DEACTIVATION")); });
  it("Organization subtree capability handles structural and Organization boundaries safely", async () => {
    const first = await organization(); const second = await organization();
    const branch = await child(first, "BRANCH"); const direct = await child(first, "DIRECT", branch.id); const deep = await child(first, "DEEP", direct.id); const sibling = await child(first, "SIBLING");
    await expect(service.isOrgUnitInSubtree({ organizationId: first.organization.id, ancestorOrgUnitId: branch.id, candidateOrgUnitId: branch.id })).resolves.toBe(true);
    await expect(service.isOrgUnitInSubtree({ organizationId: first.organization.id, ancestorOrgUnitId: branch.id, candidateOrgUnitId: direct.id })).resolves.toBe(true);
    await expect(service.isOrgUnitInSubtree({ organizationId: first.organization.id, ancestorOrgUnitId: branch.id, candidateOrgUnitId: deep.id })).resolves.toBe(true);
    await expect(service.isOrgUnitInSubtree({ organizationId: first.organization.id, ancestorOrgUnitId: branch.id, candidateOrgUnitId: sibling.id })).resolves.toBe(false);
    await expect(service.isOrgUnitInSubtree({ organizationId: first.organization.id, ancestorOrgUnitId: branch.id, candidateOrgUnitId: second.rootOrgUnit.id })).resolves.toBe(false);
    await expect(service.isOrgUnitInSubtree({ organizationId: second.organization.id, ancestorOrgUnitId: branch.id, candidateOrgUnitId: deep.id })).resolves.toBe(false);
    await expect(service.isOrgUnitInSubtree({ organizationId: first.organization.id, ancestorOrgUnitId: branch.id, candidateOrgUnitId: randomUUID() })).resolves.toBe(false);
  });
  it("ORG-DB-11 rejects a hierarchy writer that waits behind a completed deactivation", async () => {
    const created = await organization(); const gateClient = createTestPrismaClient(); const statusClient = createTestPrismaClient(); const hierarchyClient = createTestPrismaClient(); const gateHeld = deferred(); const releaseGate = deferred(); const events: string[] = [];
    let gateHolder: Promise<unknown> | undefined;
    let statusWriter: Promise<unknown> | undefined;
    let hierarchyWriter: Promise<unknown> | undefined;
    try {
      gateHolder = gateClient.$transaction(async (transaction) => { await transaction.$executeRaw`SELECT pg_advisory_lock(${testGateKey})`; gateHeld.resolve(); await releaseGate.promise; await transaction.$executeRaw`SELECT pg_advisory_unlock(${testGateKey})`; }, { maxWait: 10_000, timeout: 60_000 }).then(() => ({ status: "fulfilled" as const }), (reason: unknown) => ({ status: "rejected" as const, reason }));
      await gateHeld.promise;
      await prisma.$executeRaw`CREATE FUNCTION "org_test_hold_status_update"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_lock(9001001); PERFORM pg_advisory_unlock(9001001); RETURN NEW; END; $$`;
      await prisma.$executeRaw`CREATE TRIGGER "org_test_hold_status_update" BEFORE UPDATE OF "status" ON "organization" FOR EACH ROW EXECUTE FUNCTION "org_test_hold_status_update"()`;
      let statusBackendPid: number | undefined;
      let hierarchyBackendPid: number | undefined;
      let hierarchyResult: { status: "fulfilled" } | { status: "rejected"; reason: unknown } | undefined;
      statusWriter = createOrganizationServiceForPrisma(withExtendedInteractiveTransactionTimeout(statusClient, (backendPid) => { statusBackendPid = backendPid; })).setOrganizationStatus({ organizationId: created.organization.id, status: "INACTIVE" }).then(() => ({ status: "fulfilled" as const }), (reason: unknown) => ({ status: "rejected" as const, reason }));
      await waitForDatabaseCondition(async () => {
        if (statusBackendPid === undefined) return false;
        const rows = await prisma.$queryRaw<Array<{ count: number }>>`SELECT count(*)::integer AS count FROM pg_locks WHERE locktype = 'advisory' AND pid = ${statusBackendPid} AND granted AND objsubid = 1 AND database = (SELECT oid FROM pg_database WHERE datname = current_database()) AND ((classid::bigint << 32) | objid::bigint) = hashtextextended(${created.organization.id}::text, 0)`;
        return rows[0]?.count === 1;
      });
      events.push("STATUS_LOCKED");
      await waitForDatabaseCondition(async () => statusBackendPid !== undefined && (await prisma.$queryRaw<Array<{ count: number }>>`SELECT count(*)::integer AS count FROM pg_locks WHERE locktype = 'advisory' AND pid = ${statusBackendPid} AND NOT granted AND classid = 0 AND objid = ${testGateKey} AND objsubid = 1`)[0]?.count === 1);
      events.push("STATUS_GATE_WAITING");
      hierarchyWriter = createOrganizationServiceForPrisma(withExtendedInteractiveTransactionTimeout(hierarchyClient, (backendPid) => { hierarchyBackendPid = backendPid; })).createOrgUnit({ organizationId: created.organization.id, parentId: created.rootOrgUnit.id, code: "RACE", name: "Race", sortOrder: 0 }).then(() => { events.push("CREATE_COMMITTED"); hierarchyResult = { status: "fulfilled" }; return hierarchyResult; }, (reason) => { events.push("CREATE_REJECTED"); hierarchyResult = { status: "rejected", reason }; return hierarchyResult; });
      await waitForDatabaseCondition(async () => {
        if (hierarchyResult !== undefined) throw new Error(`Hierarchy writer settled before lock wait: ${describeTestFailure(hierarchyResult.status === "rejected" ? hierarchyResult.reason : "fulfilled")}`);
        if (hierarchyBackendPid === undefined) return false;
        const rows = await prisma.$queryRaw<Array<{ count: number }>>`SELECT count(*)::integer AS count FROM pg_locks WHERE locktype = 'advisory' AND pid = ${hierarchyBackendPid} AND NOT granted AND objsubid = 1 AND database = (SELECT oid FROM pg_database WHERE datname = current_database()) AND ((classid::bigint << 32) | objid::bigint) = hashtextextended(${created.organization.id}::text, 0)`;
        return rows[0]?.count === 1;
      });
      events.push("CREATE_WAITING");
      expect(events).toEqual(["STATUS_LOCKED", "STATUS_GATE_WAITING", "CREATE_WAITING"]);
      releaseGate.resolve();
      expect(await gateHolder).toEqual({ status: "fulfilled" });
      expect(await statusWriter).toEqual({ status: "fulfilled" });
      expect(await hierarchyWriter).toMatchObject({ status: "rejected", reason: error("ORGANIZATION_INACTIVE") });
      expect((await prisma.organization.findUniqueOrThrow({ where: { id: created.organization.id } })).status).toBe("INACTIVE");
      expect(await prisma.orgUnit.count({ where: { organizationId: created.organization.id, code: "RACE" } })).toBe(0);
    } finally { releaseGate.resolve(); await Promise.allSettled([gateHolder, statusWriter, hierarchyWriter].filter((promise): promise is Promise<unknown> => promise !== undefined)); await Promise.all([gateClient.$disconnect(), statusClient.$disconnect(), hierarchyClient.$disconnect()]); }
  }, 90_000);
  it("ORG-DB-12 cleans test data and leaves formal migration objects", async () => { const rows = await prisma.$queryRaw<Array<{ trigger: boolean; organization: boolean }>>`SELECT to_regclass('organization') IS NOT NULL AS organization, EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'org_test_fail_root') AS trigger`; expect(rows[0]).toEqual({ organization: true, trigger: false }); });
  it("ORG-DB-13 independent Prisma Clients serialize concurrent advisory-lock writers", async () => {
    const created = await organization(); const a = createTestPrismaClient(); const b = createTestPrismaClient(); const locked = deferred(); const release = deferred(); const attempted = deferred(); const events: string[] = [];
    try { const writerA = a.$transaction(async (tx) => { events.push("A_STARTED"); await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${created.organization.id}::text, 0))`; events.push("A_LOCKED"); locked.resolve(); await release.promise; events.push("A_RELEASING"); }); await locked.promise; const writerB = b.$transaction(async (tx) => { events.push("B_STARTED"); attempted.resolve(); await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${created.organization.id}::text, 0))`; events.push("B_LOCKED"); }); await attempted.promise; await new Promise((done) => setTimeout(done, 100)); expect(events).toEqual(["A_STARTED", "A_LOCKED", "B_STARTED"]); release.resolve(); await Promise.all([writerA, writerB]); expect(events).toEqual(["A_STARTED", "A_LOCKED", "B_STARTED", "A_RELEASING", "B_LOCKED"]); } finally { await Promise.all([a.$disconnect(), b.$disconnect()]); }
  });
});
