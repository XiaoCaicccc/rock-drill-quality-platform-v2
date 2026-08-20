import type { Account, OrgUnit, Organization, Prisma, Session } from "@prisma/client";

import type { AccountDto, SessionDto } from "../domain/identity";

export type IdentityTransaction = Prisma.TransactionClient;

export function toAccountDto(account: Account): AccountDto {
  return { id: account.id, organizationId: account.organizationId, primaryOrgUnitId: account.primaryOrgUnitId, username: account.username, displayName: account.displayName, status: account.status, createdAt: account.createdAt, updatedAt: account.updatedAt };
}

export function toSessionDto(session: Session): SessionDto {
  return { id: session.id, accountId: session.accountId, createdAt: session.createdAt, expiresAt: session.expiresAt, revokedAt: session.revokedAt, userAgent: session.userAgent };
}

export async function lockAccount(transaction: IdentityTransaction, accountId: string): Promise<void> {
  await transaction.$queryRaw`SELECT id FROM "account" WHERE id = ${accountId}::uuid FOR UPDATE`;
}

export async function lockOrganizationAccess(transaction: IdentityTransaction, organizationId: string): Promise<void> {
  await transaction.$queryRaw`SELECT id FROM "organization" WHERE id = ${organizationId}::uuid FOR UPDATE`;
}

export async function countEffectiveAdminAccounts(transaction: IdentityTransaction, organizationId: string): Promise<number> {
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

export async function isEffectiveAdminAccount(transaction: IdentityTransaction, organizationId: string, accountId: string): Promise<boolean> {
  const rows = await transaction.$queryRaw<{ effective: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM "account" a
      JOIN "organization" o ON o.id = a."organizationId"
      JOIN "org_unit" u ON u.id = a."primaryOrgUnitId" AND u."organizationId" = a."organizationId"
      JOIN "account_role_assignment" r ON r."accountId" = a.id AND r."organizationId" = a."organizationId"
      WHERE a.id = ${accountId}::uuid
        AND a."organizationId" = ${organizationId}::uuid
        AND a.status = 'ACTIVE'
        AND o.status = 'ACTIVE'
        AND u.status = 'ACTIVE'
        AND r.role = 'ADMIN'
    ) AS effective
  `;
  return rows[0]?.effective ?? false;
}

export async function lockBootstrap(transaction: IdentityTransaction): Promise<void> {
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('identity-session-bootstrap', 0))`;
}

export async function requireActiveOrganizationScope(transaction: IdentityTransaction, organizationId: string, primaryOrgUnitId: string): Promise<{ organization: Organization; primaryOrgUnit: OrgUnit }> {
  const organization = await transaction.organization.findUnique({ where: { id: organizationId } });
  const primaryOrgUnit = await transaction.orgUnit.findUnique({ where: { id: primaryOrgUnitId } });
  if (!organization || !primaryOrgUnit || primaryOrgUnit.organizationId !== organizationId || organization.status !== "ACTIVE" || primaryOrgUnit.status !== "ACTIVE") {
    throw new Error("IDENTITY_ORGANIZATION_SCOPE_INVALID");
  }
  return { organization, primaryOrgUnit };
}

export function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === code;
}
