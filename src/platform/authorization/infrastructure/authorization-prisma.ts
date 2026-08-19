import type { AccountRoleAssignment, Prisma } from "@prisma/client";

import type { AccountRoleAssignmentDto, RoleCode } from "../domain/authorization";

export type AuthorizationTransaction = Prisma.TransactionClient;

export function toAccountRoleAssignmentDto(assignment: AccountRoleAssignment): AccountRoleAssignmentDto {
  return { id: assignment.id, accountId: assignment.accountId, organizationId: assignment.organizationId, role: assignment.role as RoleCode, scopeOrgUnitId: assignment.scopeOrgUnitId, createdAt: assignment.createdAt };
}

export function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === code;
}
