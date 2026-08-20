import type { AccountRoleAssignment, Prisma } from "@prisma/client";

import type { AccountRoleAssignmentDto, RoleCode } from "../domain/authorization";

export type AuthorizationTransaction = Prisma.TransactionClient;

export function toAccountRoleAssignmentDto(assignment: AccountRoleAssignment): AccountRoleAssignmentDto {
  return { id: assignment.id, accountId: assignment.accountId, organizationId: assignment.organizationId, role: assignment.role as RoleCode, scopeOrgUnitId: assignment.scopeOrgUnitId, createdAt: assignment.createdAt };
}

export function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === code;
}

export async function lockOrganizationAccess(transaction: AuthorizationTransaction, organizationId: string): Promise<void> {
  await transaction.$queryRaw`SELECT id FROM "organization" WHERE id = ${organizationId}::uuid FOR UPDATE`;
}

export async function countEffectiveAdminAccounts(transaction: AuthorizationTransaction, organizationId: string): Promise<number> {
  const rows = await transaction.$queryRaw<{ count: number }[]>`
    SELECT COUNT(DISTINCT a.id)::int AS count
    FROM "account" a
    JOIN "organization" o ON o.id = a."organizationId"
    JOIN "org_unit" u ON u.id = a."primaryOrgUnitId" AND u."organizationId" = a."organizationId"
    JOIN "account_role_assignment" r ON r."accountId" = a.id AND r."organizationId" = a."organizationId"
    WHERE a."organizationId" = ${organizationId}::uuid
      AND a.status = 'ACTIVE'
      AND o.status = 'ACTIVE'
      AND u.status = 'ACTIVE'
      AND r.role = 'ADMIN'
  `;
  return rows[0]?.count ?? 0;
}

export async function isCriticalEffectiveAdminAssignment(transaction: AuthorizationTransaction, organizationId: string, assignmentId: string): Promise<boolean> {
  const rows = await transaction.$queryRaw<{ critical: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM "account_role_assignment" target
      JOIN "account" a ON a.id = target."accountId" AND a."organizationId" = target."organizationId"
      JOIN "organization" o ON o.id = a."organizationId"
      JOIN "org_unit" u ON u.id = a."primaryOrgUnitId" AND u."organizationId" = a."organizationId"
      WHERE target.id = ${assignmentId}::uuid
        AND target."organizationId" = ${organizationId}::uuid
        AND target.role = 'ADMIN'
        AND a.status = 'ACTIVE'
        AND o.status = 'ACTIVE'
        AND u.status = 'ACTIVE'
        AND NOT EXISTS (
          SELECT 1 FROM "account_role_assignment" other
          WHERE other."accountId" = target."accountId"
            AND other."organizationId" = target."organizationId"
            AND other.role = 'ADMIN'
            AND other.id <> target.id
        )
    ) AS critical
  `;
  return rows[0]?.critical ?? false;
}
