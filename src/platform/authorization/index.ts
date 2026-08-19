import { getPrismaClient } from "@/platform/database";
import { createOrganizationService } from "@/platform/organization";

import { createAuthorizationServiceForPrisma } from "./application/authorization-factory";

export function createAuthorizationService() {
  return createAuthorizationServiceForPrisma(getPrismaClient(), createOrganizationService());
}

export { definePermission } from "./domain/permission";
export { authorizationReasons, dataScopes, roleCodes } from "./domain/authorization";
export type { AssignRoleToAccountInput, AuthorizationService, ListAccountRoleAssignmentsInput, RevokeRoleAssignmentInput } from "./application/contracts";
export type { AccountRoleAssignmentDto, AuthorizationDecision, AuthorizationReason, AuthorizationTarget, DataScope, EvaluateAuthorizationInput, PermissionCode, PermissionDefinition, PermissionDefinitionInput, PermissionGrant, PermissionSeparation, RoleCode } from "./domain/authorization";
