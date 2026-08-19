import type { RequestContext } from "@/platform/request-context";

export const roleCodes = ["ADMIN", "QUALITY_MANAGER", "INSPECTOR", "ENGINEER", "VIEWER"] as const;
export type RoleCode = (typeof roleCodes)[number];

export const dataScopes = ["ALL", "ORG_SUBTREE", "ORG_UNIT", "ASSIGNED", "OWN_CREATED", "NONE"] as const;
export type DataScope = (typeof dataScopes)[number];

export type PermissionSeparation = "NONE" | "CREATOR_REVIEW";
declare const permissionCodeBrand: unique symbol;
export type PermissionCode = string & { readonly [permissionCodeBrand]: "PermissionCode" };

export interface PermissionGrant {
  readonly role: RoleCode;
  readonly dataScope: DataScope;
}

export interface PermissionDefinition {
  readonly code: PermissionCode;
  readonly grants: readonly PermissionGrant[];
  readonly separation: PermissionSeparation;
}

export interface PermissionDefinitionInput {
  readonly code: string;
  readonly grants: readonly PermissionGrant[];
  readonly separation?: PermissionSeparation;
}

export interface AuthorizationTarget {
  readonly organizationId: string;
  readonly orgUnitId?: string;
  readonly assignedAccountIds?: readonly string[];
  readonly createdByAccountId?: string;
}

export const authorizationReasons = [
  "ALLOWED",
  "ANONYMOUS",
  "CROSS_ORGANIZATION",
  "NO_PERMISSION_GRANT",
  "DATA_SCOPE_MISMATCH",
  "MISSING_TARGET_FACT",
  "CREATOR_REVIEW_FORBIDDEN",
] as const;
export type AuthorizationReason = (typeof authorizationReasons)[number];

export interface AuthorizationDecision {
  readonly allowed: boolean;
  readonly reason: AuthorizationReason;
}

export interface EvaluateAuthorizationInput {
  readonly context: RequestContext;
  readonly permission: PermissionDefinition;
  readonly target: AuthorizationTarget;
}

export interface AccountRoleAssignmentDto {
  readonly id: string;
  readonly accountId: string;
  readonly organizationId: string;
  readonly role: RoleCode;
  readonly scopeOrgUnitId: string;
  readonly createdAt: Date;
}
