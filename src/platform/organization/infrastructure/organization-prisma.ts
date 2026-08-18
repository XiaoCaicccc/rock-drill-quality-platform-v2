import type { OrgUnit, Organization, Prisma } from "@prisma/client";

import type { OrganizationDto, OrgUnitDto } from "../domain/organization";

export type OrganizationTransaction = Prisma.TransactionClient;

export function toOrganizationDto(model: Organization): OrganizationDto {
  return { id: model.id, code: model.code, name: model.name, status: model.status, createdAt: model.createdAt, updatedAt: model.updatedAt };
}

export function toOrgUnitDto(model: OrgUnit): OrgUnitDto {
  return { id: model.id, organizationId: model.organizationId, parentId: model.parentId, code: model.code, name: model.name, status: model.status, sortOrder: model.sortOrder, createdAt: model.createdAt, updatedAt: model.updatedAt };
}

export async function lockOrganizationHierarchy(transaction: OrganizationTransaction, organizationId: string): Promise<void> {
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId}::text, 0))`;
}
