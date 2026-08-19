import type { PrismaClient } from "@prisma/client";

import type { AssignRoleToAccountInput, ListAccountRoleAssignmentsInput, RevokeRoleAssignmentInput } from "./contracts";
import { authorizationError } from "./errors";
import { isRoleCode } from "../domain/permission";
import { isPrismaError, toAccountRoleAssignmentDto } from "../infrastructure/authorization-prisma";

function requireIdentifier(value: string): void {
  if (typeof value !== "string" || value.trim().length === 0) throw authorizationError("INVALID_ROLE_ASSIGNMENT_INPUT");
}

function mapDatabaseError(error: unknown): never {
  if (isPrismaError(error, "P2002")) throw authorizationError("ROLE_ASSIGNMENT_CONFLICT", error);
  if (isPrismaError(error, "P2003")) throw authorizationError("CROSS_ORGANIZATION_ASSIGNMENT", error);
  throw error;
}

export function createRoleAssignmentService(prisma: PrismaClient) {
  return {
    async assignRoleToAccount(input: AssignRoleToAccountInput) {
      requireIdentifier(input.accountId);
      requireIdentifier(input.organizationId);
      requireIdentifier(input.scopeOrgUnitId);
      if (!isRoleCode(input.role)) throw authorizationError("INVALID_ROLE_ASSIGNMENT_INPUT");
      try {
        return await prisma.$transaction(async (transaction) => {
          const [account, scopeOrgUnit] = await Promise.all([
            transaction.account.findUnique({ where: { id: input.accountId }, select: { organizationId: true } }),
            transaction.orgUnit.findUnique({ where: { id: input.scopeOrgUnitId }, select: { organizationId: true } }),
          ]);
          if (!account) throw authorizationError("ACCOUNT_NOT_FOUND");
          if (!scopeOrgUnit) throw authorizationError("SCOPE_ORG_UNIT_NOT_FOUND");
          if (account.organizationId !== input.organizationId || scopeOrgUnit.organizationId !== input.organizationId) throw authorizationError("CROSS_ORGANIZATION_ASSIGNMENT");
          return toAccountRoleAssignmentDto(await transaction.accountRoleAssignment.create({ data: input }));
        });
      } catch (error) { mapDatabaseError(error); }
    },

    async revokeRoleAssignment(input: RevokeRoleAssignmentInput): Promise<void> {
      requireIdentifier(input.assignmentId);
      const result = await prisma.accountRoleAssignment.deleteMany({ where: { id: input.assignmentId } });
      if (result.count === 0) throw authorizationError("ROLE_ASSIGNMENT_NOT_FOUND");
    },

    async listAccountRoleAssignments(input: ListAccountRoleAssignmentsInput) {
      requireIdentifier(input.accountId);
      if (!await prisma.account.findUnique({ where: { id: input.accountId }, select: { id: true } })) throw authorizationError("ACCOUNT_NOT_FOUND");
      const assignments = await prisma.accountRoleAssignment.findMany({ where: { accountId: input.accountId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      return assignments.map(toAccountRoleAssignmentDto);
    },
  };
}
