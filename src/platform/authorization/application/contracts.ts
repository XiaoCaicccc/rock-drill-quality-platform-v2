import type { AccountRoleAssignmentDto, AuthorizationDecision, EvaluateAuthorizationInput, RoleCode } from "../domain/authorization";

export interface AssignRoleToAccountInput {
  readonly accountId: string;
  readonly organizationId: string;
  readonly role: RoleCode;
  readonly scopeOrgUnitId: string;
}

export interface RevokeRoleAssignmentInput { readonly assignmentId: string; }
export interface ListAccountRoleAssignmentsInput { readonly accountId: string; }

export interface AuthorizationService {
  evaluateAuthorization(input: EvaluateAuthorizationInput): Promise<AuthorizationDecision>;
  requireAuthorization(input: EvaluateAuthorizationInput): Promise<void>;
  assignRoleToAccount(input: AssignRoleToAccountInput): Promise<AccountRoleAssignmentDto>;
  revokeRoleAssignment(input: RevokeRoleAssignmentInput): Promise<void>;
  listAccountRoleAssignments(input: ListAccountRoleAssignmentsInput): Promise<readonly AccountRoleAssignmentDto[]>;
}
