-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('ADMIN', 'QUALITY_MANAGER', 'INSPECTOR', 'ENGINEER', 'VIEWER');

-- Add the composite target needed to enforce that a Role Assignment belongs
-- to the same Organization as its Account.
CREATE UNIQUE INDEX "account_id_organization_id_key" ON "account"("id", "organizationId");

-- CreateTable
CREATE TABLE "account_role_assignment" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "role" "RoleCode" NOT NULL,
    "scopeOrgUnitId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_role_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_role_assignment_exact_key" ON "account_role_assignment"("accountId", "role", "scopeOrgUnitId");
CREATE INDEX "account_role_assignment_account_organization_idx" ON "account_role_assignment"("accountId", "organizationId");
CREATE INDEX "account_role_assignment_scope_organization_idx" ON "account_role_assignment"("scopeOrgUnitId", "organizationId");
CREATE INDEX "account_role_assignment_organization_role_idx" ON "account_role_assignment"("organizationId", "role");

-- AddForeignKey
ALTER TABLE "account_role_assignment" ADD CONSTRAINT "account_role_assignment_accountId_organizationId_fkey" FOREIGN KEY ("accountId", "organizationId") REFERENCES "account"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "account_role_assignment" ADD CONSTRAINT "account_role_assignment_scopeOrgUnitId_organizationId_fkey" FOREIGN KEY ("scopeOrgUnitId", "organizationId") REFERENCES "org_unit"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
