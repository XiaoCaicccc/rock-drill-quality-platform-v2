import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { createAuthenticatedActor, createRequestContext, createRequestId } from "@/platform/request-context";
import { createTestPrismaClient } from "@/platform/database/prisma-client";
import type { OrganizationService } from "@/platform/organization";

import { createAuthorizationServiceForPrisma } from "./application/authorization-factory";
import { createRoleAssignmentService } from "./application/role-assignment-service";
import { definePermission } from "./domain/permission";

const prisma = createTestPrismaClient();
const unusedSubtreeReader: Pick<OrganizationService, "isOrgUnitInSubtree"> = {
  async isOrgUnitInSubtree() { throw new Error("This PostgreSQL suite does not evaluate ORG_SUBTREE; Organization owns that behavior evidence."); },
};
const service = createAuthorizationServiceForPrisma(prisma, unusedSubtreeReader);
const organizationIds: string[] = [];

async function createOrganization() {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  const created = await prisma.$transaction(async (transaction) => {
    const organization = await transaction.organization.create({ data: { code: `AUTHZ-${suffix}`, name: "Authorization Test" } });
    const rootOrgUnit = await transaction.orgUnit.create({ data: { organizationId: organization.id, parentId: null, code: "ROOT", name: "Root", sortOrder: 0 } });
    return { organization, rootOrgUnit };
  });
  organizationIds.push(created.organization.id); return created;
}

async function createAccount(organizationId: string, primaryOrgUnitId: string) {
  const suffix = randomUUID().replaceAll("-", "");
  return prisma.account.create({ data: { organizationId, primaryOrgUnitId, username: `authz-${suffix}`, normalizedUsername: `authz-${suffix}`, displayName: "Authorization Account", passwordHash: "test-only-password-hash", status: "ACTIVE" } });
}

function context(accountId: string, organizationId: string) {
  return createRequestContext({
    actor: createAuthenticatedActor({ kind: "user", userId: accountId, sessionId: randomUUID(), organizationId, organizationUnitId: null }),
    clock: { now: () => new Date("2026-08-19T00:00:00.000Z") },
    requestIdFactory: () => createRequestId("request-authz-db"),
  });
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

describe("Authorization PostgreSQL acceptance", () => {
  it("AUTHZ-DB-01 deploys RoleCode, assignment table, unique key, indexes, and composite foreign keys", async () => {
    const rows = await prisma.$queryRaw<Array<{ roleCode: boolean; assignment: boolean; exactKey: boolean; compositeForeignKeys: number }>>`
      SELECT
        EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoleCode') AS "roleCode",
        to_regclass('account_role_assignment') IS NOT NULL AS assignment,
        to_regclass('account_role_assignment_exact_key') IS NOT NULL AS "exactKey",
        (SELECT count(*)::integer FROM pg_constraint WHERE conrelid = 'account_role_assignment'::regclass AND contype = 'f') AS "compositeForeignKeys"
    `;
    expect(rows[0]).toEqual({ roleCode: true, assignment: true, exactKey: true, compositeForeignKeys: 2 });
  });

  it("AUTHZ-DB-02 forbids an exact duplicate assignment", async () => {
    const org = await createOrganization(); const account = await createAccount(org.organization.id, org.rootOrgUnit.id);
    const input = { accountId: account.id, organizationId: org.organization.id, role: "VIEWER" as const, scopeOrgUnitId: org.rootOrgUnit.id };
    await expect(service.assignRoleToAccount(input)).resolves.toMatchObject(input);
    await expect(service.assignRoleToAccount(input)).rejects.toMatchObject({ code: "STATE.CONFLICT", httpStatus: 409 });
    expect(await prisma.accountRoleAssignment.count({ where: input })).toBe(1);
  });

  it("AUTHZ-DB-03 database forbids Account and Assignment Organization mismatch", async () => {
    const first = await createOrganization(); const second = await createOrganization(); const account = await createAccount(first.organization.id, first.rootOrgUnit.id);
    await expect(prisma.accountRoleAssignment.create({ data: { accountId: account.id, organizationId: second.organization.id, role: "VIEWER", scopeOrgUnitId: second.rootOrgUnit.id } })).rejects.toMatchObject({ code: "P2003" });
  });

  it("AUTHZ-DB-04 database forbids scope OrgUnit and Assignment Organization mismatch", async () => {
    const first = await createOrganization(); const second = await createOrganization(); const account = await createAccount(first.organization.id, first.rootOrgUnit.id);
    await expect(prisma.accountRoleAssignment.create({ data: { accountId: account.id, organizationId: first.organization.id, role: "VIEWER", scopeOrgUnitId: second.rootOrgUnit.id } })).rejects.toMatchObject({ code: "P2003" });
  });

  it("AUTHZ-DB-05 allows multiple Roles for one Account", async () => {
    const org = await createOrganization(); const account = await createAccount(org.organization.id, org.rootOrgUnit.id);
    for (const role of ["ENGINEER", "VIEWER"] as const) await service.assignRoleToAccount({ accountId: account.id, organizationId: org.organization.id, role, scopeOrgUnitId: org.rootOrgUnit.id });
    await expect(service.listAccountRoleAssignments({ accountId: account.id })).resolves.toHaveLength(2);
  });

  it("AUTHZ-DB-06 allows the same Role on multiple OrgUnit scopes", async () => {
    const org = await createOrganization(); const child = await prisma.orgUnit.create({ data: { organizationId: org.organization.id, parentId: org.rootOrgUnit.id, code: "CHILD", name: "Child", sortOrder: 0 } }); const account = await createAccount(org.organization.id, org.rootOrgUnit.id);
    for (const scopeOrgUnitId of [org.rootOrgUnit.id, child.id]) await service.assignRoleToAccount({ accountId: account.id, organizationId: org.organization.id, role: "INSPECTOR", scopeOrgUnitId });
    expect(await prisma.accountRoleAssignment.count({ where: { accountId: account.id, role: "INSPECTOR" } })).toBe(2);
  });

  it("AUTHZ-DB-07 concurrent exact assignment leaves exactly one row", async () => {
    const org = await createOrganization(); const account = await createAccount(org.organization.id, org.rootOrgUnit.id);
    const firstClient = createTestPrismaClient(); const secondClient = createTestPrismaClient();
    const input = { accountId: account.id, organizationId: org.organization.id, role: "QUALITY_MANAGER" as const, scopeOrgUnitId: org.rootOrgUnit.id };
    try {
      const outcomes = await Promise.allSettled([createRoleAssignmentService(firstClient).assignRoleToAccount(input), createRoleAssignmentService(secondClient).assignRoleToAccount(input)]);
      expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
      expect(outcomes.find((outcome) => outcome.status === "rejected")).toMatchObject({ reason: { code: "STATE.CONFLICT", httpStatus: 409 } });
      expect(await prisma.accountRoleAssignment.count({ where: input })).toBe(1);
    } finally { await Promise.all([firstClient.$disconnect(), secondClient.$disconnect()]); }
  });

  it("uses current committed assignments immediately after add and revoke", async () => {
    const org = await createOrganization(); const account = await createAccount(org.organization.id, org.rootOrgUnit.id);
    const input = { context: context(account.id, org.organization.id), permission: definePermission({ code: "test_resource.read", grants: [{ role: "VIEWER", dataScope: "ALL" }] }), target: { organizationId: org.organization.id } };
    await expect(service.evaluateAuthorization(input)).resolves.toEqual({ allowed: false, reason: "NO_PERMISSION_GRANT" });
    const assignment = await service.assignRoleToAccount({ accountId: account.id, organizationId: org.organization.id, role: "VIEWER", scopeOrgUnitId: org.rootOrgUnit.id });
    await expect(service.evaluateAuthorization(input)).resolves.toEqual({ allowed: true, reason: "ALLOWED" });
    await service.revokeRoleAssignment({ assignmentId: assignment.id });
    await expect(service.evaluateAuthorization(input)).resolves.toEqual({ allowed: false, reason: "NO_PERMISSION_GRANT" });
  });

  it("validates Account and scope Organization before assignment", async () => {
    const first = await createOrganization(); const second = await createOrganization(); const account = await createAccount(first.organization.id, first.rootOrgUnit.id);
    await expect(service.assignRoleToAccount({ accountId: account.id, organizationId: first.organization.id, role: "VIEWER", scopeOrgUnitId: second.rootOrgUnit.id })).rejects.toMatchObject({ internalMessage: "CROSS_ORGANIZATION_ASSIGNMENT" });
    await expect(service.assignRoleToAccount({ accountId: randomUUID(), organizationId: first.organization.id, role: "VIEWER", scopeOrgUnitId: first.rootOrgUnit.id })).rejects.toMatchObject({ internalMessage: "ACCOUNT_NOT_FOUND" });
    await expect(service.assignRoleToAccount({ accountId: account.id, organizationId: first.organization.id, role: "VIEWER", scopeOrgUnitId: randomUUID() })).rejects.toMatchObject({ internalMessage: "SCOPE_ORG_UNIT_NOT_FOUND" });
  });

  it("preserves the Slice 1C legacy inactive-scope contract while managed assignment remains active-scope only", async () => {
    const org = await createOrganization(); const account = await createAccount(org.organization.id, org.rootOrgUnit.id);
    const inactive = await prisma.orgUnit.create({ data: { organizationId: org.organization.id, parentId: org.rootOrgUnit.id, code: "INACTIVE", name: "Inactive", status: "INACTIVE", sortOrder: 0 } });
    const legacy = await service.assignRoleToAccount({ accountId: account.id, organizationId: org.organization.id, role: "VIEWER", scopeOrgUnitId: inactive.id });
    expect(legacy).toMatchObject({ accountId: account.id, scopeOrgUnitId: inactive.id });
    expect(await prisma.auditLog.count({ where: { organizationId: org.organization.id, actorKind: "SYSTEM", action: "role_assignment.assign", targetId: legacy.id } })).toBe(1);
    await expect(service.assignManagedRole({ context: context(account.id, org.organization.id), accountId: account.id, role: "ENGINEER", scopeOrgUnitId: inactive.id })).rejects.toMatchObject({ internalMessage: "SCOPE_ORG_UNIT_NOT_FOUND" });
  });
});
