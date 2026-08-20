import type { AccountRoleAssignmentDto, AuthorizationDecision, EvaluateAuthorizationInput, RoleCode } from "../domain/authorization";
import type { RequestContext } from "@/platform/request-context";

export interface AssignRoleToAccountInput {
  readonly accountId: string;
  readonly organizationId: string;
  readonly role: RoleCode;
  readonly scopeOrgUnitId: string;
}

export interface RevokeRoleAssignmentInput { readonly assignmentId: string; }
export interface ListAccountRoleAssignmentsInput { readonly accountId: string; }
export interface AssignManagedRoleInput { readonly context: RequestContext; readonly accountId: string; readonly role: RoleCode; readonly scopeOrgUnitId: string; }
export interface RevokeManagedRoleInput { readonly context: RequestContext; readonly assignmentId: string; }
export interface ListManagedRoleAssignmentsInput { readonly context: RequestContext; readonly accountId: string; }

export interface AuthorizationService {
  evaluateAuthorization(input: EvaluateAuthorizationInput): Promise<AuthorizationDecision>;
  requireAuthorization(input: EvaluateAuthorizationInput): Promise<void>;
  assignRoleToAccount(input: AssignRoleToAccountInput): Promise<AccountRoleAssignmentDto>;
  revokeRoleAssignment(input: RevokeRoleAssignmentInput): Promise<void>;
  listAccountRoleAssignments(input: ListAccountRoleAssignmentsInput): Promise<readonly AccountRoleAssignmentDto[]>;
  assignManagedRole(input: AssignManagedRoleInput): Promise<AccountRoleAssignmentDto>;
  revokeManagedRole(input: RevokeManagedRoleInput): Promise<void>;
  listManagedRoleAssignments(input: ListManagedRoleAssignmentsInput): Promise<readonly AccountRoleAssignmentDto[]>;
}
