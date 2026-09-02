import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createAuthenticatedActor, createRequestContext } from "@/platform/request-context";
import { createAuthorizationEvaluator } from "@/platform/authorization/application/authorization-service";
import { equipmentPermissions, equipmentPositionPermissions } from "./index";

const grants = (permission: { grants: readonly { role: string; dataScope: string }[] }) => new Map(permission.grants.map((grant) => [grant.role, grant.dataScope]));
const readers = new Map([["ENGINEER", "ALL"], ["QUALITY_MANAGER", "ALL"], ["INSPECTOR", "ALL"], ["VIEWER", "ALL"]]);
const engineerWriter = new Map([["ENGINEER", "ALL"]]);
const permissions = [equipmentPermissions, equipmentPositionPermissions] as const;
const context = createRequestContext({ actor: createAuthenticatedActor({ kind: "user", userId: "equipment-role-test", sessionId: "equipment-role-session", organizationId: "equipment-role-org", organizationUnitId: "equipment-role-unit" }) });
const evaluator = (role: "ENGINEER" | "QUALITY_MANAGER" | "INSPECTOR" | "VIEWER" | "ADMIN") => createAuthorizationEvaluator({ accountRoleAssignment: { findMany: async () => [{ role, scopeOrgUnitId: "equipment-role-unit" }] } } as unknown as PrismaClient, { isOrgUnitInSubtree: async () => false });

describe("Slice 2C permission definitions", () => {
  it("gives ENGINEER the complete Equipment and Position authoring matrix", () => {
    for (const permission of [equipmentPermissions.view, equipmentPermissions.create, equipmentPermissions.update, equipmentPermissions.setStatus, equipmentPositionPermissions.view, equipmentPositionPermissions.create, equipmentPositionPermissions.update, equipmentPositionPermissions.setStatus]) expect(grants(permission)).toEqual(permission.code.endsWith(".view") ? readers : engineerWriter);
  });

  it("keeps QUALITY_MANAGER, INSPECTOR, and VIEWER view-only while ADMIN remains automatic", () => {
    for (const permission of [equipmentPermissions.create, equipmentPermissions.update, equipmentPermissions.setStatus, equipmentPositionPermissions.create, equipmentPositionPermissions.update, equipmentPositionPermissions.setStatus]) {
      expect(grants(permission).has("QUALITY_MANAGER")).toBe(false);
      expect(grants(permission).has("INSPECTOR")).toBe(false);
      expect(grants(permission).has("VIEWER")).toBe(false);
      expect(grants(permission).has("ADMIN")).toBe(false);
    }
    for (const permission of [equipmentPermissions.view, equipmentPositionPermissions.view]) expect(grants(permission).has("ADMIN")).toBe(false);
  });

  it.each(["ENGINEER", "QUALITY_MANAGER", "INSPECTOR", "VIEWER", "ADMIN"] as const)("evaluates the real same-Organization matrix for %s", async (role) => {
    const authorization = evaluator(role);
    for (const modulePermissions of permissions) {
      await expect(authorization.evaluateAuthorization({ context, permission: modulePermissions.view, target: { organizationId: "equipment-role-org" } })).resolves.toMatchObject({ allowed: true });
      for (const permission of [modulePermissions.create, modulePermissions.update, modulePermissions.setStatus]) await expect(authorization.evaluateAuthorization({ context, permission, target: { organizationId: "equipment-role-org" } })).resolves.toMatchObject({ allowed: role === "ENGINEER" || role === "ADMIN" });
    }
  });
});
