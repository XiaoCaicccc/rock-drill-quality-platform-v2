import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { createTestPrismaClient } from "@/platform/database/prisma-client";
import { createAuthenticatedActor, createRequestContext, type RequestContext, type RequestId } from "@/platform/request-context";
import { createNumberingServiceForPrisma } from "@/platform/numbering/application/numbering-service";
import { createPartCategoryServiceForPrisma } from "@/modules/part-category/application/part-category-service";

import { createPartMasterServiceForPrisma } from "./application/part-master-service";
import { partMasterNumberingPolicy } from "@/modules/part-master";

const prisma = createTestPrismaClient();
const organizationIds: string[] = [];
const transactionOptions = { maxWait: 10_000, timeout: 60_000 };
const forcedAuditRequestId = "slice2a-forced-audit-failure" as RequestId;

function deferred<T = void>() { let resolve!: (value?: T | PromiseLike<T>) => void; const promise = new Promise<T>((done) => { resolve = (value) => done(value as T); }); return { promise, resolve }; }
function settle<T>(promise: Promise<T>) { return promise.then((value) => ({ status: "fulfilled" as const, value }), (reason: unknown) => ({ status: "rejected" as const, reason })); }
function withAuditRequestId(context: RequestContext, requestId: string): RequestContext { return { ...context, requestId: requestId as RequestId }; }

async function waitForDatabaseCondition(condition: () => Promise<boolean>, description: string): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (!(await condition())) { if (Date.now() >= deadline) throw new Error(`Timed out waiting for PostgreSQL condition: ${description}`); await new Promise<void>((resolve) => setImmediate(resolve)); }
}

async function waitForLockWaiters(pids: readonly number[], gatePid: number): Promise<void> {
  await waitForDatabaseCondition(async () => {
    const rows = await prisma.$queryRaw<Array<{ count: number }>>`
      WITH RECURSIVE lock_chain AS (
        SELECT activity.pid AS waiter_pid, unnest(pg_blocking_pids(activity.pid)) AS blocker_pid, ARRAY[activity.pid]::integer[] AS visited
        FROM pg_stat_activity AS activity
        WHERE activity.wait_event_type = 'Lock' AND activity.pid IN (${pids[0]}, ${pids[1]})
        UNION ALL
        SELECT chain.waiter_pid, unnest(pg_blocking_pids(chain.blocker_pid)), chain.visited || chain.blocker_pid
        FROM lock_chain AS chain WHERE NOT chain.blocker_pid = ANY(chain.visited)
      ) SELECT count(DISTINCT waiter_pid)::integer AS count FROM lock_chain WHERE blocker_pid = ${gatePid}
    `;
    return rows[0]?.count === pids.length;
  }, "both allocation requests waiting on the held sequence row");
}

function captureRawBackendPid(client: PrismaClient, onPid: (pid: number) => void): PrismaClient {
  const originalTransaction = client.$transaction.bind(client);
  const wrappedRaw = (query: TemplateStringsArray, ...values: unknown[]) => originalTransaction(async (transaction) => {
    const rows = await transaction.$queryRaw<Array<{ backend_pid: number }>>`SELECT pg_backend_pid() AS backend_pid`;
    onPid(rows[0]!.backend_pid);
    return (transaction.$queryRaw as unknown as (template: TemplateStringsArray, ...params: unknown[]) => Promise<unknown>)(query, ...values);
  }, transactionOptions);
  return new Proxy(client, { get(target, property) { return property === "$queryRaw" ? wrappedRaw : Reflect.get(target, property, target); } }) as PrismaClient;
}

async function holdSequenceRow(client: PrismaClient, organizationId: string) {
  const held = deferred(); const release = deferred(); let gatePid = 0;
  const promise = client.$transaction(async (transaction) => {
    const rows = await transaction.$queryRaw<Array<{ backend_pid: number }>>`SELECT pg_backend_pid() AS backend_pid`;
    gatePid = rows[0]!.backend_pid;
    await transaction.$queryRaw`SELECT id FROM "numbering_sequence" WHERE "organizationId" = ${organizationId}::uuid AND "key" = 'part_master' FOR UPDATE`;
    held.resolve(); await release.promise;
  }, transactionOptions);
  await held.promise;
  return { promise, release, gatePid };
}

async function fixture() {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  const organization = await prisma.organization.create({ data: { code: `PART-${suffix}`, name: "Part Master Test" } });
  const root = await prisma.orgUnit.create({ data: { organizationId: organization.id, code: "ROOT", name: "Root", sortOrder: 0 } });
  const account = await prisma.account.create({ data: { organizationId: organization.id, primaryOrgUnitId: root.id, username: `part-${suffix.toLowerCase()}`, normalizedUsername: `part-${suffix.toLowerCase()}`, displayName: "Part Test", passwordHash: "test-only", status: "ACTIVE" } });
  organizationIds.push(organization.id);
  const context = createRequestContext({ actor: createAuthenticatedActor({ kind: "user", userId: account.id, sessionId: randomUUID(), organizationId: organization.id, organizationUnitId: root.id }) });
  const categories = createPartCategoryServiceForPrisma(prisma);
  const numbering = createNumberingServiceForPrisma(prisma);
  const parts = createPartMasterServiceForPrisma(prisma, { categories, numbering });
  const category = await categories.create({ context, name: "Rotation Head" });
  return { organization, context, categories, numbering, parts, category };
}

async function installAuditFailureTrigger() {
  await prisma.$executeRaw(Prisma.sql`DROP TRIGGER IF EXISTS codex_slice_2a_fail_audit_trigger ON "audit_log"`);
  await prisma.$executeRaw(Prisma.sql`DROP FUNCTION IF EXISTS codex_slice_2a_fail_audit()`);
  await prisma.$executeRaw(Prisma.sql`CREATE FUNCTION codex_slice_2a_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."requestId" = 'slice2a-forced-audit-failure' THEN RAISE EXCEPTION 'codex_slice_2a_forced_audit_failure'; END IF; RETURN NEW; END; $$`);
  await prisma.$executeRaw(Prisma.sql`CREATE TRIGGER codex_slice_2a_fail_audit_trigger BEFORE INSERT ON "audit_log" FOR EACH ROW EXECUTE FUNCTION codex_slice_2a_fail_audit()`);
}

async function removeAuditFailureTrigger() {
  await prisma.$executeRaw(Prisma.sql`DROP TRIGGER IF EXISTS codex_slice_2a_fail_audit_trigger ON "audit_log"`);
  await prisma.$executeRaw(Prisma.sql`DROP FUNCTION IF EXISTS codex_slice_2a_fail_audit()`);
}

afterEach(async () => {
  try { await removeAuditFailureTrigger(); } catch { /* provider may be unavailable */ }
  if (organizationIds.length === 0) return;
  const ids = [...organizationIds];
  await prisma.partMaster.deleteMany({ where: { organizationId: { in: ids } } });
  await prisma.partCategory.deleteMany({ where: { organizationId: { in: ids } } });
  await prisma.numberingSequence.deleteMany({ where: { organizationId: { in: ids } } });
  await prisma.auditLog.deleteMany({ where: { organizationId: { in: ids } } });
  await prisma.session.deleteMany({ where: { account: { organizationId: { in: ids } } } });
  await prisma.account.deleteMany({ where: { organizationId: { in: ids } } });
  await prisma.orgUnit.deleteMany({ where: { organizationId: { in: ids } } });
  await prisma.organization.deleteMany({ where: { id: { in: ids } } });
  organizationIds.length = 0;
});

afterAll(async () => { try { await removeAuditFailureTrigger(); } catch { /* provider may be unavailable */ } await prisma.$disconnect(); });

describe("Slice 2A part master PostgreSQL acceptance", () => {
  it("PART-DB-01 persists PartCategory inside its Organization boundary", async () => {
    const { organization, category } = await fixture();
    await expect(prisma.partCategory.findUnique({ where: { id: category.id } })).resolves.toMatchObject({ id: category.id, organizationId: organization.id });
  });

  it("PART-DB-02 rejects same-Organization normalized category conflicts", async () => {
    const { categories, context } = await fixture();
    await categories.create({ context, name: "  Shared Name " });
    await expect(categories.create({ context, name: "shared name" })).rejects.toMatchObject({ internalMessage: "CATEGORY_NAME_CONFLICT" });
  });

  it("PART-DB-03 allows the same normalized category name across Organizations", async () => {
    const first = await fixture(); const second = await fixture();
    await first.categories.create({ context: first.context, name: "Shared Name" });
    await expect(second.categories.create({ context: second.context, name: "shared name" })).resolves.toMatchObject({ name: "shared name" });
  });

  it("PART-DB-04 rejects a cross-Organization PartMaster/category composite FK", async () => {
    const first = await fixture(); const second = await fixture();
    await expect(prisma.partMaster.create({ data: { organizationId: first.organization.id, categoryId: second.category.id, partNumber: "PART-CROSS", name: "Cross org" } })).rejects.toMatchObject({ code: "P2003" });
  });

  it("PART-DB-05 enforces partNumber uniqueness within an Organization", async () => {
    const { parts, context, category } = await fixture();
    const first = await parts.create({ context, categoryId: category.id, name: "First" });
    await expect(prisma.partMaster.create({ data: { organizationId: context.actor.kind === "user" ? context.actor.organizationId : "", categoryId: category.id, partNumber: first.partNumber, name: "Duplicate" } })).rejects.toMatchObject({ code: "P2002" });
  });

  it("PART-DB-06 enforces normalized drawingNumber uniqueness within an Organization", async () => {
    const { parts, context, category } = await fixture();
    await parts.create({ context, categoryId: category.id, name: "First", drawingNumber: "dr-100" });
    await expect(parts.create({ context, categoryId: category.id, name: "Duplicate", drawingNumber: "DR-100" })).rejects.toMatchObject({ internalMessage: "DRAWING_NUMBER_CONFLICT" });
  });

  it("PART-DB-07 allows multiple NULL drawingNumber values", async () => {
    const { parts, context, category } = await fixture();
    await expect(parts.create({ context, categoryId: category.id, name: "One" })).resolves.toMatchObject({ drawingNumber: null });
    await expect(parts.create({ context, categoryId: category.id, name: "Two" })).resolves.toMatchObject({ drawingNumber: null });
  });

  it("PART-DB-08 allows the same normalized drawingNumber across Organizations", async () => {
    const first = await fixture(); const second = await fixture();
    await expect(first.parts.create({ context: first.context, categoryId: first.category.id, name: "First", drawingNumber: "DRAW-1" })).resolves.toMatchObject({ drawingNumber: "DRAW-1" });
    await expect(second.parts.create({ context: second.context, categoryId: second.category.id, name: "Second", drawingNumber: "draw-1" })).resolves.toMatchObject({ drawingNumber: "draw-1" });
  });

  it("PART-DB-09 proves same-Organization same-key allocations wait at the PostgreSQL row lock and remain unique", async () => {
    const { organization, numbering } = await fixture();
    await numbering.allocate(organization.id, partMasterNumberingPolicy);
    const gate = createTestPrismaClient(); const firstClient = createTestPrismaClient(); const secondClient = createTestPrismaClient();
    const firstPids: number[] = []; const secondPids: number[] = [];
    const held = await holdSequenceRow(gate, organization.id);
    try {
      const first = settle(createNumberingServiceForPrisma(captureRawBackendPid(firstClient, (pid) => firstPids.push(pid))).allocate(organization.id, partMasterNumberingPolicy));
      const second = settle(createNumberingServiceForPrisma(captureRawBackendPid(secondClient, (pid) => secondPids.push(pid))).allocate(organization.id, partMasterNumberingPolicy));
      await waitForDatabaseCondition(() => Promise.resolve(firstPids.length === 1 && secondPids.length === 1), "both allocation transactions to start");
      await waitForLockWaiters([firstPids[0]!, secondPids[0]!], held.gatePid);
      held.release.resolve();
      const outcomes = await Promise.all([first, second]);
      expect(outcomes.every((outcome) => outcome.status === "fulfilled")).toBe(true);
      const values = outcomes.map((outcome) => outcome.status === "fulfilled" ? outcome.value : null);
      expect(new Set(values.map((value) => value?.value)).size).toBe(2);
      expect(values.map((value) => value?.formatted).sort()).toEqual(["PART-000002", "PART-000003"]);
      await held.promise;
      await expect(prisma.numberingSequence.findUnique({ where: { organizationId_key: { organizationId: organization.id, key: "part_master" } } })).resolves.toMatchObject({ currentValue: BigInt(3) });
    } finally { held.release.resolve(); await Promise.allSettled([held.promise]); await Promise.all([gate.$disconnect(), firstClient.$disconnect(), secondClient.$disconnect()]); }
  }, 90_000);

  it("PART-DB-10 keeps numbering strictly monotonic with an exact high-watermark", async () => {
    const { parts, context, category, organization } = await fixture();
    const values = [await parts.create({ context, categoryId: category.id, name: "One" }), await parts.create({ context, categoryId: category.id, name: "Two" }), await parts.create({ context, categoryId: category.id, name: "Three" })];
    expect(values.map((part) => part.partNumber)).toEqual(["PART-000001", "PART-000002", "PART-000003"]);
    await expect(prisma.numberingSequence.findUnique({ where: { organizationId_key: { organizationId: organization.id, key: "part_master" } } })).resolves.toMatchObject({ currentValue: BigInt(3) });
  });

  it("PART-DB-11 isolates numbering sequences between Organizations", async () => {
    const first = await fixture(); const second = await fixture();
    await expect(first.parts.create({ context: first.context, categoryId: first.category.id, name: "First" })).resolves.toMatchObject({ partNumber: "PART-000001" });
    await expect(second.parts.create({ context: second.context, categoryId: second.category.id, name: "Second" })).resolves.toMatchObject({ partNumber: "PART-000001" });
  });

  it("PART-DB-12 proves concurrent PartMaster creates receive distinct partNumbers at the same DB gate", async () => {
    const base = await fixture();
    await base.parts.create({ context: base.context, categoryId: base.category.id, name: "Seed" });
    const gate = createTestPrismaClient(); const firstClient = createTestPrismaClient(); const secondClient = createTestPrismaClient(); const firstPids: number[] = []; const secondPids: number[] = [];
    const firstService = createPartMasterServiceForPrisma(captureRawBackendPid(firstClient, (pid) => firstPids.push(pid)), { categories: createPartCategoryServiceForPrisma(firstClient), numbering: createNumberingServiceForPrisma(captureRawBackendPid(firstClient, (pid) => firstPids.push(pid))) });
    const secondService = createPartMasterServiceForPrisma(captureRawBackendPid(secondClient, (pid) => secondPids.push(pid)), { categories: createPartCategoryServiceForPrisma(secondClient), numbering: createNumberingServiceForPrisma(captureRawBackendPid(secondClient, (pid) => secondPids.push(pid))) });
    const held = await holdSequenceRow(gate, base.organization.id);
    try {
      const first = settle(firstService.create({ context: base.context, categoryId: base.category.id, name: "Concurrent A" }));
      const second = settle(secondService.create({ context: base.context, categoryId: base.category.id, name: "Concurrent B" }));
      await waitForDatabaseCondition(() => Promise.resolve(firstPids.length > 0 && secondPids.length > 0), "both PartMaster allocation transactions to start");
      await waitForLockWaiters([firstPids[0]!, secondPids[0]!], held.gatePid); held.release.resolve();
      const outcomes = await Promise.all([first, second]);
      const parts = outcomes.filter((outcome) => outcome.status === "fulfilled");
      expect(parts).toHaveLength(2); expect(new Set(parts.map((outcome) => outcome.status === "fulfilled" ? outcome.value.partNumber : "")).size).toBe(2);
      await expect(prisma.numberingSequence.findUnique({ where: { organizationId_key: { organizationId: base.organization.id, key: "part_master" } } })).resolves.toMatchObject({ currentValue: BigInt(3) });
    } finally { held.release.resolve(); await Promise.allSettled([held.promise]); await Promise.all([gate.$disconnect(), firstClient.$disconnect(), secondClient.$disconnect()]); }
  }, 90_000);

  it("PART-DB-13 commits a PartMaster mutation and its AuditLog atomically", async () => {
    const { parts, context, category } = await fixture();
    const part = await parts.create({ context, categoryId: category.id, name: "Audited" });
    await expect(prisma.auditLog.findFirst({ where: { targetId: part.id, action: "part_master.create", requestId: context.requestId } })).resolves.toBeTruthy();
  });

  it("PART-DB-14 rolls a PartMaster mutation back on the marked Audit failure", async () => {
    const { parts, context, category } = await fixture(); const failingContext = { ...context, requestId: forcedAuditRequestId };
    await installAuditFailureTrigger();
    try { await expect(parts.create({ context: failingContext, categoryId: category.id, name: "Rollback" })).rejects.toThrow("codex_slice_2a_forced_audit_failure"); }
    finally { await removeAuditFailureTrigger(); }
    await expect(prisma.partMaster.count({ where: { organizationId: context.actor.kind === "user" ? context.actor.organizationId : "" } })).resolves.toBe(0);
  });

  it("PART-DB-15 commits a PartCategory mutation and its AuditLog atomically", async () => {
    const { categories, context } = await fixture(); const category = await categories.create({ context, name: "Audited Category" });
    await expect(prisma.auditLog.findFirst({ where: { targetId: category.id, action: "part_category.create", requestId: context.requestId } })).resolves.toBeTruthy();
  });

  it("PART-DB-16 keeps an INACTIVE Category from cascading to existing PartMaster", async () => {
    const { parts, categories, context, category } = await fixture(); const part = await parts.create({ context, categoryId: category.id, name: "Existing" });
    await categories.setStatus({ context, categoryId: category.id, status: "INACTIVE" });
    await expect(parts.get({ context, partId: part.id })).resolves.toMatchObject({ id: part.id, status: "ACTIVE", category: { status: "INACTIVE" } });
  });

  it("PART-DB-17 consumes a number on failed PartMaster creation and never reissues it", async () => {
    const { parts, context, category } = await fixture(); const failingContext = { ...context, requestId: forcedAuditRequestId };
    await installAuditFailureTrigger();
    try { await expect(parts.create({ context: failingContext, categoryId: category.id, name: "Failed" })).rejects.toThrow("codex_slice_2a_forced_audit_failure"); }
    finally { await removeAuditFailureTrigger(); }
    await expect(parts.create({ context, categoryId: category.id, name: "After failure" })).resolves.toMatchObject({ partNumber: "PART-000002" });
  });

  it("PART-CAT-AUDIT-ROLLBACK rolls a marked PartCategory mutation back without global trigger contamination", async () => {
    const { categories, context } = await fixture(); const failingContext = { ...context, requestId: forcedAuditRequestId };
    await installAuditFailureTrigger();
    try { await expect(categories.create({ context: failingContext, name: "Rollback Category" })).rejects.toThrow("codex_slice_2a_forced_audit_failure"); }
    finally { await removeAuditFailureTrigger(); }
    await expect(categories.create({ context, name: "After cleanup" })).resolves.toMatchObject({ name: "After cleanup" });
  });

  it("PART-BEHAVIOR-PARTMASTER covers status, drawing, reassignment, no-op Audit, and actual changed details", async () => {
    const first = await fixture(); const second = await first.categories.create({ context: first.context, name: "Second Active" });
    const part = await first.parts.create({ context: first.context, categoryId: first.category.id, name: "Behavior", drawingNumber: "DR-1" });
    await first.parts.setStatus({ context: first.context, partId: part.id, status: "INACTIVE" });
    await first.parts.setStatus({ context: first.context, partId: part.id, status: "ACTIVE" });
    const activeResourceBeforeNoOp = await prisma.partMaster.findUnique({ where: { id: part.id } });
    const activeStatusAuditsBeforeNoOp = await prisma.auditLog.count({ where: { targetId: part.id, action: "part_master.set_status" } });
    await expect(first.parts.setStatus({ context: first.context, partId: part.id, status: "ACTIVE" })).resolves.toMatchObject({ id: part.id, status: "ACTIVE" });
    await expect(prisma.partMaster.findUnique({ where: { id: part.id } })).resolves.toEqual(activeResourceBeforeNoOp);
    expect(await prisma.auditLog.count({ where: { targetId: part.id, action: "part_master.set_status" } })).toBe(activeStatusAuditsBeforeNoOp);
    const beforeNoOp = await prisma.auditLog.count({ where: { targetId: part.id, action: { in: ["part_master.update", "part_master.set_status"] } } });
    await first.parts.update({ context: first.context, partId: part.id, name: "Behavior" });
    expect(await prisma.auditLog.count({ where: { targetId: part.id, action: { in: ["part_master.update", "part_master.set_status"] } } })).toBe(beforeNoOp);
    const drawingAndCategoryContext = withAuditRequestId(first.context, "part-behavior-drawing-and-category");
    await first.parts.update({ context: drawingAndCategoryContext, partId: part.id, drawingNumber: "DR-2", categoryId: second.id });
    await expect(prisma.auditLog.findFirst({ where: { targetId: part.id, action: "part_master.update", requestId: drawingAndCategoryContext.requestId } })).resolves.toMatchObject({ details: { changed: { drawingNumber: "DR-2", categoryId: second.id } } });
    const drawingDisplayChangeContext = withAuditRequestId(first.context, "part-behavior-drawing-display-change");
    await first.parts.update({ context: drawingDisplayChangeContext, partId: part.id, drawingNumber: " dr-2 " });
    const normalizedOnlyPublicAudit = await prisma.auditLog.findFirst({ where: { targetId: part.id, action: "part_master.update", requestId: drawingDisplayChangeContext.requestId } });
    expect(normalizedOnlyPublicAudit?.details).toMatchObject({ changed: { drawingNumber: "dr-2" } });
    expect(normalizedOnlyPublicAudit?.details).not.toHaveProperty("changed.normalizedDrawingNumber");
    const drawingClearContext = withAuditRequestId(first.context, "part-behavior-drawing-clear");
    await first.parts.update({ context: drawingClearContext, partId: part.id, drawingNumber: null });
    const inactive = await first.categories.create({ context: first.context, name: "Inactive" }); await first.categories.setStatus({ context: first.context, categoryId: inactive.id, status: "INACTIVE" });
    await expect(first.parts.update({ context: first.context, partId: part.id, categoryId: inactive.id })).rejects.toMatchObject({ internalMessage: "PART_CATEGORY_INACTIVE" });
    const audit = await prisma.auditLog.findFirst({ where: { targetId: part.id, action: "part_master.update", requestId: drawingClearContext.requestId } });
    expect(audit?.details).toMatchObject({ changed: { drawingNumber: null } });
  });

  it("PART-BEHAVIOR-PARTCATEGORY covers status transitions, no-op status, and actual field diff", async () => {
    const { categories, context, category } = await fixture();
    await categories.setStatus({ context, categoryId: category.id, status: "INACTIVE" }); await categories.setStatus({ context, categoryId: category.id, status: "ACTIVE" });
    const before = await prisma.auditLog.count({ where: { targetId: category.id, action: "part_category.set_status" } });
    await categories.setStatus({ context, categoryId: category.id, status: "ACTIVE" });
    expect(await prisma.auditLog.count({ where: { targetId: category.id, action: "part_category.set_status" } })).toBe(before);
    const categoryResourceBeforeNoOp = await prisma.partCategory.findUnique({ where: { id: category.id } });
    const updateAuditsBeforeNoOp = await prisma.auditLog.count({ where: { targetId: category.id, action: "part_category.update" } });
    await expect(categories.update({ context, categoryId: category.id, name: category.name })).resolves.toMatchObject({ id: category.id, name: category.name });
    await expect(prisma.partCategory.findUnique({ where: { id: category.id } })).resolves.toEqual(categoryResourceBeforeNoOp);
    expect(await prisma.auditLog.count({ where: { targetId: category.id, action: "part_category.update" } })).toBe(updateAuditsBeforeNoOp);
    const categoryUpdateContext = withAuditRequestId(context, "part-category-behavior-update");
    await categories.update({ context: categoryUpdateContext, categoryId: category.id, name: "Changed" });
    const audit = await prisma.auditLog.findFirst({ where: { targetId: category.id, action: "part_category.update", requestId: categoryUpdateContext.requestId } });
    expect(audit?.details).toMatchObject({ changed: { name: "Changed" } });
  });
});
