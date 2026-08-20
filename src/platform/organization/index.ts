import { getPrismaClient } from "../database";
import { createOrganizationServiceForPrisma } from "./application/organization-service";

export function createOrganizationService() {
  return createOrganizationServiceForPrisma(getPrismaClient());
}

export type { CreateOrganizationWithRootInput, CreateOrgUnitInput, IsOrgUnitInSubtreeInput, ListOrgUnitsInput, MoveOrgUnitInput, OrganizationService, RenameOrgUnitInput, SetOrganizationStatusInput, SetOrgUnitStatusInput } from "./application/contracts";
export type { OrganizationDto, OrganizationStatus, OrgUnitDto } from "./domain/organization";
