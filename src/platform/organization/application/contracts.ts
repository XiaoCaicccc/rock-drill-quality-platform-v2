import type { OrganizationDto, OrganizationStatus, OrgUnitDto } from "../domain/organization";

export interface CreateOrganizationWithRootInput {
  readonly code: string;
  readonly name: string;
  readonly root: { readonly code: string; readonly name: string; readonly sortOrder: number };
}

export interface CreateOrgUnitInput {
  readonly organizationId: string;
  readonly parentId: string;
  readonly code: string;
  readonly name: string;
  readonly sortOrder: number;
}

export interface RenameOrgUnitInput { readonly orgUnitId: string; readonly code: string; readonly name: string; }
export interface MoveOrgUnitInput { readonly orgUnitId: string; readonly newParentId: string; }
export interface SetOrgUnitStatusInput { readonly orgUnitId: string; readonly status: OrganizationStatus; }
export interface SetOrganizationStatusInput { readonly organizationId: string; readonly status: OrganizationStatus; }

export interface OrganizationService {
  createOrganizationWithRoot(input: CreateOrganizationWithRootInput): Promise<{ organization: OrganizationDto; rootOrgUnit: OrgUnitDto }>;
  createOrgUnit(input: CreateOrgUnitInput): Promise<OrgUnitDto>;
  renameOrgUnit(input: RenameOrgUnitInput): Promise<OrgUnitDto>;
  moveOrgUnit(input: MoveOrgUnitInput): Promise<OrgUnitDto>;
  setOrgUnitStatus(input: SetOrgUnitStatusInput): Promise<OrgUnitDto>;
  setOrganizationStatus(input: SetOrganizationStatusInput): Promise<OrganizationDto>;
}
