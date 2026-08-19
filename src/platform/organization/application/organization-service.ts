import type { PrismaClient } from "@prisma/client";

import { assertOrganizationStatus, normalizeCode, normalizeName, normalizeSortOrder } from "../domain/organization";
import { lockOrganizationHierarchy, toOrganizationDto, toOrgUnitDto, type OrganizationTransaction } from "../infrastructure/organization-prisma";
import type { CreateOrganizationWithRootInput, CreateOrgUnitInput, IsOrgUnitInSubtreeInput, MoveOrgUnitInput, OrganizationService, RenameOrgUnitInput, SetOrganizationStatusInput, SetOrgUnitStatusInput } from "./contracts";
import { organizationError, type OrganizationErrorKind } from "./errors";

function normalizeOrganizationInput(input: { code: string; name: string }): { code: string; name: string } {
  try { return { code: normalizeCode(input.code), name: normalizeName(input.name) }; }
  catch (cause) { throw organizationError("INVALID_ORGANIZATION_INPUT", cause); }
}

function normalizeOrgUnitInput(input: { code: string; name: string; sortOrder?: number }): { code: string; name: string; sortOrder?: number } {
  try {
    return { code: normalizeCode(input.code), name: normalizeName(input.name), ...(input.sortOrder === undefined ? {} : { sortOrder: normalizeSortOrder(input.sortOrder) }) };
  } catch (cause) { throw organizationError("INVALID_ORG_UNIT_INPUT", cause); }
}

function mapKnownDatabaseError(error: unknown, conflict: OrganizationErrorKind): never {
  if (typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002") throw organizationError(conflict, error);
  if (typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2003") throw organizationError("CROSS_ORGANIZATION_PARENT", error);
  throw error;
}

function descendantsOf(units: readonly { id: string; parentId: string | null; status: string }[], ancestorId: string): readonly string[] {
  const descendants = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const unit of units) {
      if (unit.parentId !== null && (unit.parentId === ancestorId || descendants.has(unit.parentId)) && !descendants.has(unit.id)) {
        descendants.add(unit.id);
        changed = true;
      }
    }
  }
  return [...descendants];
}

async function requireOrganization(transaction: OrganizationTransaction, organizationId: string) {
  const organization = await transaction.organization.findUnique({ where: { id: organizationId } });
  if (!organization) throw organizationError("ORGANIZATION_NOT_FOUND");
  return organization;
}

async function requireOrgUnit(transaction: OrganizationTransaction, orgUnitId: string) {
  const unit = await transaction.orgUnit.findUnique({ where: { id: orgUnitId } });
  if (!unit) throw organizationError("ORG_UNIT_NOT_FOUND");
  return unit;
}

export function createOrganizationServiceForPrisma(prisma: PrismaClient): OrganizationService {
  return {
    async isOrgUnitInSubtree(input: IsOrgUnitInSubtreeInput) {
      const units = await prisma.orgUnit.findMany({
        where: { organizationId: input.organizationId },
        select: { id: true, parentId: true },
      });
      if (!units.some((unit) => unit.id === input.ancestorOrgUnitId) || !units.some((unit) => unit.id === input.candidateOrgUnitId)) return false;
      if (input.ancestorOrgUnitId === input.candidateOrgUnitId) return true;

      let currentId: string | null = input.candidateOrgUnitId;
      const visited = new Set<string>();
      while (currentId !== null && !visited.has(currentId)) {
        if (currentId === input.ancestorOrgUnitId) return true;
        visited.add(currentId);
        const current = units.find((unit) => unit.id === currentId);
        currentId = current?.parentId ?? null;
      }
      return false;
    },

    async createOrganizationWithRoot(input: CreateOrganizationWithRootInput) {
      const organizationInput = normalizeOrganizationInput(input);
      const rootInput = normalizeOrgUnitInput(input.root) as { code: string; name: string; sortOrder: number };
      try {
        return await prisma.$transaction(async (transaction) => {
          const organization = await transaction.organization.create({ data: organizationInput });
          const root = await transaction.orgUnit.create({ data: { organizationId: organization.id, parentId: null, ...rootInput } });
          return { organization: toOrganizationDto(organization), rootOrgUnit: toOrgUnitDto(root) };
        });
      } catch (error) { mapKnownDatabaseError(error, "ORGANIZATION_CODE_CONFLICT"); }
    },

    async createOrgUnit(input: CreateOrgUnitInput) {
      const unitInput = normalizeOrgUnitInput(input) as { code: string; name: string; sortOrder: number };
      try {
        return await prisma.$transaction(async (transaction) => {
          await lockOrganizationHierarchy(transaction, input.organizationId);
          const organization = await requireOrganization(transaction, input.organizationId);
          if (organization.status !== "ACTIVE") throw organizationError("ORGANIZATION_INACTIVE");
          const parent = await requireOrgUnit(transaction, input.parentId);
          if (parent.organizationId !== organization.id) throw organizationError("CROSS_ORGANIZATION_PARENT");
          if (parent.status !== "ACTIVE") throw organizationError("INACTIVE_PARENT");
          const unit = await transaction.orgUnit.create({ data: { organizationId: organization.id, parentId: parent.id, ...unitInput } });
          return toOrgUnitDto(unit);
        });
      } catch (error) { mapKnownDatabaseError(error, "ORG_UNIT_CODE_CONFLICT"); }
    },

    async renameOrgUnit(input: RenameOrgUnitInput) {
      const unitInput = normalizeOrgUnitInput(input) as { code: string; name: string };
      try {
        return await prisma.$transaction(async (transaction) => {
          const unit = await requireOrgUnit(transaction, input.orgUnitId);
          const updated = await transaction.orgUnit.update({ where: { id: unit.id }, data: unitInput });
          return toOrgUnitDto(updated);
        });
      } catch (error) { mapKnownDatabaseError(error, "ORG_UNIT_CODE_CONFLICT"); }
    },

    async moveOrgUnit(input: MoveOrgUnitInput) {
      return prisma.$transaction(async (transaction) => {
        const existingUnit = await requireOrgUnit(transaction, input.orgUnitId);
        await lockOrganizationHierarchy(transaction, existingUnit.organizationId);
        const unit = await requireOrgUnit(transaction, input.orgUnitId);
        if (unit.parentId === null) throw organizationError("ROOT_MOVE_FORBIDDEN");
        if (unit.id === input.newParentId) throw organizationError("SELF_PARENT_FORBIDDEN");
        const organization = await requireOrganization(transaction, unit.organizationId);
        if (organization.status !== "ACTIVE") throw organizationError("ORGANIZATION_INACTIVE");
        const newParent = await requireOrgUnit(transaction, input.newParentId);
        if (newParent.organizationId !== unit.organizationId) throw organizationError("CROSS_ORGANIZATION_PARENT");
        if (newParent.status !== "ACTIVE") throw organizationError("INACTIVE_PARENT");
        const units = await transaction.orgUnit.findMany({ where: { organizationId: unit.organizationId }, select: { id: true, parentId: true, status: true } });
        if (descendantsOf(units, unit.id).includes(newParent.id)) throw organizationError("HIERARCHY_CYCLE");
        return toOrgUnitDto(await transaction.orgUnit.update({ where: { id: unit.id }, data: { parentId: newParent.id } }));
      });
    },

    async setOrgUnitStatus(input: SetOrgUnitStatusInput) {
      try { assertOrganizationStatus(input.status); } catch (cause) { throw organizationError("INVALID_ORG_UNIT_INPUT", cause); }
      return prisma.$transaction(async (transaction) => {
        const existingUnit = await requireOrgUnit(transaction, input.orgUnitId);
        await lockOrganizationHierarchy(transaction, existingUnit.organizationId);
        const unit = await requireOrgUnit(transaction, input.orgUnitId);
        if (input.status === "INACTIVE") {
          const units = await transaction.orgUnit.findMany({ where: { organizationId: unit.organizationId }, select: { id: true, parentId: true, status: true } });
          const hasActiveDescendant = descendantsOf(units, unit.id).some((id) => units.find((candidate) => candidate.id === id)?.status === "ACTIVE");
          if (hasActiveDescendant) throw organizationError("ACTIVE_DESCENDANTS_PREVENT_DEACTIVATION");
        }
        if (input.status === "ACTIVE" && unit.parentId !== null) {
          const parent = await requireOrgUnit(transaction, unit.parentId);
          if (parent.status !== "ACTIVE") throw organizationError("INACTIVE_PARENT");
        }
        return toOrgUnitDto(await transaction.orgUnit.update({ where: { id: unit.id }, data: { status: input.status } }));
      });
    },

    async setOrganizationStatus(input: SetOrganizationStatusInput) {
      try { assertOrganizationStatus(input.status); } catch (cause) { throw organizationError("INVALID_ORGANIZATION_INPUT", cause); }
      return prisma.$transaction(async (transaction) => {
        await lockOrganizationHierarchy(transaction, input.organizationId);
        const organization = await requireOrganization(transaction, input.organizationId);
        return toOrganizationDto(await transaction.organization.update({ where: { id: organization.id }, data: { status: input.status } }));
      });
    },
  };
}
