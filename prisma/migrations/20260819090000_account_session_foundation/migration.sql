-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED');

-- Add the composite target needed to enforce that an Account's primary OrgUnit
-- belongs to the same Organization as the Account.
CREATE UNIQUE INDEX "org_unit_id_organization_id_key" ON "org_unit"("id", "organizationId");

-- CreateTable
CREATE TABLE "account" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "primaryOrgUnitId" UUID NOT NULL,
    "username" VARCHAR(128) NOT NULL,
    "normalizedUsername" VARCHAR(128) NOT NULL,
    "displayName" VARCHAR(200) NOT NULL,
    "passwordHash" VARCHAR(512) NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),
    "userAgent" VARCHAR(512),

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_normalized_username_key" ON "account"("normalizedUsername");
CREATE INDEX "account_organization_id_idx" ON "account"("organizationId");
CREATE INDEX "account_status_idx" ON "account"("status");
CREATE UNIQUE INDEX "session_token_hash_key" ON "session"("tokenHash");
CREATE INDEX "session_account_id_expires_at_idx" ON "session"("accountId", "expiresAt");
CREATE INDEX "session_account_id_revoked_at_idx" ON "session"("accountId", "revokedAt");

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "account" ADD CONSTRAINT "account_primaryOrgUnitId_organizationId_fkey" FOREIGN KEY ("primaryOrgUnitId", "organizationId") REFERENCES "org_unit"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "session" ADD CONSTRAINT "session_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
