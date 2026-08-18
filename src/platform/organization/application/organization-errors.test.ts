import { describe, expect, it } from "vitest";

import * as organizationPublicApi from "../index";
import { organizationError } from "./errors";
import { createOrganizationServiceForPrisma } from "./organization-service";

const now = new Date("2026-08-11T00:00:00.000Z");
const unit = (id: string, parentId: string | null, status: "ACTIVE" | "INACTIVE") => ({ id, organizationId: "org", parentId, code: id, name: id, status, sortOrder: 0, createdAt: now, updatedAt: now });
function serviceWith(findUnit: (id: string) => ReturnType<typeof unit>, units: ReturnType<typeof unit>[] = []) {
  const transaction = { $executeRaw: async () => 0, orgUnit: { findUnique: async ({ where }: { where: { id: string } }) => findUnit(where.id), findMany: async () => units, update: async () => unit("updated", null, "ACTIVE") } };
  return createOrganizationServiceForPrisma({ $transaction: async (work: (tx: typeof transaction) => unknown) => work(transaction) } as never);
}

describe("organization stable errors and public API", () => {
  it("exposes stable business errors for root move, self parent, descendants, and inactive parent activation", () => {
    for (const kind of ["ROOT_MOVE_FORBIDDEN", "SELF_PARENT_FORBIDDEN", "ACTIVE_DESCENDANTS_PREVENT_DEACTIVATION", "INACTIVE_PARENT"] as const) {
      expect(organizationError(kind)).toMatchObject({ internalMessage: kind, code: "BUSINESS_RULE.VIOLATION" });
    }
  });

  it("maps Organization and OrgUnit code conflicts to stable state conflicts", () => {
    expect(organizationError("ORGANIZATION_CODE_CONFLICT")).toMatchObject({ code: "STATE.CONFLICT", internalMessage: "ORGANIZATION_CODE_CONFLICT" });
    expect(organizationError("ORG_UNIT_CODE_CONFLICT")).toMatchObject({ code: "STATE.CONFLICT", internalMessage: "ORG_UNIT_CODE_CONFLICT" });
  });

  it("does not expose runtime or test Prisma clients from the public entry", () => {
    expect(organizationPublicApi).not.toHaveProperty("getPrismaClient");
    expect(organizationPublicApi).not.toHaveProperty("createTestPrismaClient");
  });

  it("enforces root move, self parent, descendant deactivation, and inactive parent activation through use cases", async () => {
    await expect(serviceWith(() => unit("root", null, "ACTIVE")).moveOrgUnit({ orgUnitId: "root", newParentId: "target" })).rejects.toMatchObject({ internalMessage: "ROOT_MOVE_FORBIDDEN" });
    await expect(serviceWith(() => unit("child", "root", "ACTIVE")).moveOrgUnit({ orgUnitId: "child", newParentId: "child" })).rejects.toMatchObject({ internalMessage: "SELF_PARENT_FORBIDDEN" });
    await expect(serviceWith(() => unit("root", null, "ACTIVE"), [unit("child", "root", "ACTIVE")]).setOrgUnitStatus({ orgUnitId: "root", status: "INACTIVE" })).rejects.toMatchObject({ internalMessage: "ACTIVE_DESCENDANTS_PREVENT_DEACTIVATION" });
    await expect(serviceWith((id) => id === "parent" ? unit("parent", "root", "INACTIVE") : unit("child", "parent", "INACTIVE")).setOrgUnitStatus({ orgUnitId: "child", status: "ACTIVE" })).rejects.toMatchObject({ internalMessage: "INACTIVE_PARENT" });
  });
});
