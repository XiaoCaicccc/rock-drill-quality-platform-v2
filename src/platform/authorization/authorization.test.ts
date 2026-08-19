import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { createAuthenticatedActor, createRequestContext, createRequestId } from "@/platform/request-context";
import type { OrganizationService } from "@/platform/organization";

import { createAuthorizationEvaluator } from "./application/authorization-service";
import { definePermission } from "./domain/permission";
import type { DataScope, RoleCode } from "./domain/authorization";

type Assignment = { readonly role: RoleCode; readonly scopeOrgUnitId: string };
const fixedContextOptions = { clock: { now: () => new Date("2026-08-19T00:00:00.000Z") }, requestIdFactory: () => createRequestId("request-authz") };

function context(userId = "account-1", organizationId = "org-1") {
  return createRequestContext({ ...fixedContextOptions, actor: createAuthenticatedActor({ kind: "user", userId, sessionId: "session-1", organizationId, organizationUnitId: "primary-unit-not-an-auth-scope" }) });
}

function evaluator(assignments: readonly Assignment[], subtreePairs: readonly string[] = []) {
  const prisma = { accountRoleAssignment: { findMany: async () => assignments } } as unknown as PrismaClient;
  const organization = { isOrgUnitInSubtree: async (input: { ancestorOrgUnitId: string; candidateOrgUnitId: string }) => subtreePairs.includes(`${input.ancestorOrgUnitId}:${input.candidateOrgUnitId}`) } as Pick<OrganizationService, "isOrgUnitInSubtree">;
  return createAuthorizationEvaluator(prisma, organization);
}

function permission(role: RoleCode, dataScope: DataScope, separation: "NONE" | "CREATOR_REVIEW" = "NONE") {
  return definePermission({ code: "test_resource.read", grants: [{ role, dataScope }], separation });
}

describe("Authorization behavior", () => {
  it.each<RoleCode>(["ADMIN", "QUALITY_MANAGER", "INSPECTOR", "ENGINEER", "VIEWER"])("supports fixed role %s", async (role) => {
    const service = evaluator([{ role, scopeOrgUnitId: "scope-1" }]);
    const policy = role === "ADMIN" ? definePermission({ code: "test_resource.read", grants: [] }) : permission(role, "ALL");
    await expect(service.evaluateAuthorization({ context: context(), permission: policy, target: { organizationId: "org-1" } })).resolves.toEqual({ allowed: true, reason: "ALLOWED" });
  });

  it("enforces Organization boundary before Admin or grants", async () => {
    const service = evaluator([{ role: "ADMIN", scopeOrgUnitId: "scope-1" }]);
    await expect(service.evaluateAuthorization({ context: context(), permission: permission("VIEWER", "NONE"), target: { organizationId: "org-2" } })).resolves.toEqual({ allowed: false, reason: "CROSS_ORGANIZATION" });
  });

  it.each([
    ["ALL", {}, "ALLOWED"],
    ["NONE", {}, "DATA_SCOPE_MISMATCH"],
    ["ORG_UNIT", { orgUnitId: "scope-1" }, "ALLOWED"],
    ["ORG_UNIT", { orgUnitId: "child-1" }, "DATA_SCOPE_MISMATCH"],
    ["ASSIGNED", { assignedAccountIds: ["account-1"] }, "ALLOWED"],
    ["ASSIGNED", { assignedAccountIds: ["account-2"] }, "DATA_SCOPE_MISMATCH"],
    ["OWN_CREATED", { createdByAccountId: "account-1" }, "ALLOWED"],
    ["OWN_CREATED", { createdByAccountId: "account-2" }, "DATA_SCOPE_MISMATCH"],
  ] as const)("evaluates %s target facts", async (scope, targetFacts, reason) => {
    const service = evaluator([{ role: "ENGINEER", scopeOrgUnitId: "scope-1" }]);
    await expect(service.evaluateAuthorization({ context: context(), permission: permission("ENGINEER", scope), target: { organizationId: "org-1", ...targetFacts } })).resolves.toMatchObject({ allowed: reason === "ALLOWED", reason });
  });

  it("evaluates ORG_SUBTREE through the Organization public capability", async () => {
    const service = evaluator([{ role: "QUALITY_MANAGER", scopeOrgUnitId: "scope-1" }], ["scope-1:scope-1", "scope-1:child-1", "scope-1:deep-1"]);
    for (const orgUnitId of ["scope-1", "child-1", "deep-1"]) {
      await expect(service.evaluateAuthorization({ context: context(), permission: permission("QUALITY_MANAGER", "ORG_SUBTREE"), target: { organizationId: "org-1", orgUnitId } })).resolves.toEqual({ allowed: true, reason: "ALLOWED" });
    }
    for (const orgUnitId of ["sibling-1", "unrelated-1"]) {
      await expect(service.evaluateAuthorization({ context: context(), permission: permission("QUALITY_MANAGER", "ORG_SUBTREE"), target: { organizationId: "org-1", orgUnitId } })).resolves.toEqual({ allowed: false, reason: "DATA_SCOPE_MISMATCH" });
    }
  });

  it.each<DataScope>(["ORG_SUBTREE", "ORG_UNIT", "ASSIGNED", "OWN_CREATED"])("fails closed when %s facts are missing", async (scope) => {
    const service = evaluator([{ role: "INSPECTOR", scopeOrgUnitId: "scope-1" }]);
    await expect(service.evaluateAuthorization({ context: context(), permission: permission("INSPECTOR", scope), target: { organizationId: "org-1" } })).resolves.toEqual({ allowed: false, reason: "MISSING_TARGET_FACT" });
  });

  it("uses additive union across roles and assignments", async () => {
    const service = evaluator([
      { role: "VIEWER", scopeOrgUnitId: "scope-1" },
      { role: "INSPECTOR", scopeOrgUnitId: "scope-1" },
      { role: "INSPECTOR", scopeOrgUnitId: "scope-2" },
    ]);
    const policy = definePermission({ code: "test_resource.read", grants: [{ role: "VIEWER", dataScope: "NONE" }, { role: "INSPECTOR", dataScope: "ORG_UNIT" }] });
    await expect(service.evaluateAuthorization({ context: context(), permission: policy, target: { organizationId: "org-1", orgUnitId: "scope-2" } })).resolves.toEqual({ allowed: true, reason: "ALLOWED" });
  });

  it("returns NO_PERMISSION_GRANT when no current assignment matches", async () => {
    const service = evaluator([{ role: "VIEWER", scopeOrgUnitId: "scope-1" }]);
    await expect(service.evaluateAuthorization({ context: context(), permission: permission("ENGINEER", "ALL"), target: { organizationId: "org-1" } })).resolves.toEqual({ allowed: false, reason: "NO_PERMISSION_GRANT" });
  });

  it("enforces creator/reviewer separation before Admin", async () => {
    const service = evaluator([{ role: "ADMIN", scopeOrgUnitId: "scope-1" }]);
    const policy = definePermission({ code: "test_resource.approve", grants: [], separation: "CREATOR_REVIEW" });
    await expect(service.evaluateAuthorization({ context: context(), permission: policy, target: { organizationId: "org-1", createdByAccountId: "account-1" } })).resolves.toEqual({ allowed: false, reason: "CREATOR_REVIEW_FORBIDDEN" });
    await expect(service.evaluateAuthorization({ context: context(), permission: policy, target: { organizationId: "org-1" } })).resolves.toEqual({ allowed: false, reason: "MISSING_TARGET_FACT" });
    await expect(service.evaluateAuthorization({ context: context(), permission: policy, target: { organizationId: "org-1", createdByAccountId: "account-2" } })).resolves.toEqual({ allowed: true, reason: "ALLOWED" });
  });

  it("maps anonymous and authenticated denials to stable public errors", async () => {
    const service = evaluator([]);
    const policy = permission("VIEWER", "ALL");
    const anonymousContext = createRequestContext(fixedContextOptions);
    const anonymousInput = { context: anonymousContext, permission: policy, target: { organizationId: "org-1" } };
    await expect(service.evaluateAuthorization(anonymousInput)).resolves.toEqual({ allowed: false, reason: "ANONYMOUS" });
    await expect(service.requireAuthorization(anonymousInput)).rejects.toMatchObject({ code: "AUTH.AUTHENTICATION_REQUIRED", httpStatus: 401 });
    await expect(service.requireAuthorization({ context: context(), permission: policy, target: { organizationId: "org-1" } })).rejects.toMatchObject({ code: "AUTH.PERMISSION_DENIED", httpStatus: 403 });
  });
});

describe("PermissionDefinition", () => {
  it("accepts stable permission codes and multiple scopes for one role", () => {
    expect(definePermission({ code: "inspection_task.execute", grants: [{ role: "INSPECTOR", dataScope: "ASSIGNED" }, { role: "INSPECTOR", dataScope: "ORG_UNIT" }] })).toMatchObject({ code: "inspection_task.execute", separation: "NONE" });
  });

  it.each(["Inspection.execute", "inspection", "inspection-task.execute", "inspection.execute.now", "1inspection.execute"])("rejects invalid permission code %s", (code) => {
    expect(() => definePermission({ code, grants: [] })).toThrow(RangeError);
  });

  it("rejects an exact duplicate role and Data Scope grant", () => {
    expect(() => definePermission({ code: "inspection_task.execute", grants: [{ role: "INSPECTOR", dataScope: "ASSIGNED" }, { role: "INSPECTOR", dataScope: "ASSIGNED" }] })).toThrow(RangeError);
  });
});
