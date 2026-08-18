export type OrganizationStatus = "ACTIVE" | "INACTIVE";

export interface OrganizationDto {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly status: OrganizationStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface OrgUnitDto {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly status: OrganizationStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly organizationId: string;
  readonly parentId: string | null;
  readonly sortOrder: number;
}

function invalidInput(message: string): never {
  throw new TypeError(message);
}

export function normalizeCode(value: string): string {
  if (typeof value !== "string") invalidInput("Organization code must be a string.");
  const normalized = value.trim().toUpperCase();
  if (!normalized) invalidInput("Organization code must not be blank.");
  return normalized;
}

export function normalizeName(value: string): string {
  if (typeof value !== "string") invalidInput("Organization name must be a string.");
  const normalized = value.trim();
  if (!normalized) invalidInput("Organization name must not be blank.");
  return normalized;
}

export function normalizeSortOrder(value: number): number {
  if (!Number.isInteger(value) || value < 0) invalidInput("Sort order must be a non-negative integer.");
  return value;
}

export function assertOrganizationStatus(value: string): asserts value is OrganizationStatus {
  if (value !== "ACTIVE" && value !== "INACTIVE") invalidInput("Organization status must be ACTIVE or INACTIVE.");
}
