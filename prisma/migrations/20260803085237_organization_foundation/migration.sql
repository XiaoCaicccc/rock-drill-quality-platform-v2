-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "organization" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_unit" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "parentId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "org_unit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_code_key" ON "organization"("code");

-- CreateIndex
CREATE INDEX "org_unit_organization_id_idx" ON "org_unit"("organizationId");

-- CreateIndex
CREATE INDEX "org_unit_parent_id_idx" ON "org_unit"("parentId");

-- CreateIndex
CREATE INDEX "org_unit_status_idx" ON "org_unit"("status");

-- CreateIndex
CREATE UNIQUE INDEX "org_unit_organization_id_code_key" ON "org_unit"("organizationId", "code");

-- AddForeignKey
ALTER TABLE "org_unit" ADD CONSTRAINT "org_unit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_unit" ADD CONSTRAINT "org_unit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "org_unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prisma schema cannot express these PostgreSQL constraints. They enforce the
-- normalized business values and single-root hierarchy at the database boundary.
ALTER TABLE "organization"
  ADD CONSTRAINT "organization_code_normalized_check" CHECK ("code" = upper(btrim("code"))),
  ADD CONSTRAINT "organization_code_not_blank_check" CHECK (btrim("code") <> ''),
  ADD CONSTRAINT "organization_name_not_blank_check" CHECK (btrim("name") <> '');

ALTER TABLE "org_unit"
  ADD CONSTRAINT "org_unit_code_normalized_check" CHECK ("code" = upper(btrim("code"))),
  ADD CONSTRAINT "org_unit_code_not_blank_check" CHECK (btrim("code") <> ''),
  ADD CONSTRAINT "org_unit_name_not_blank_check" CHECK (btrim("name") <> ''),
  ADD CONSTRAINT "org_unit_sort_order_non_negative_check" CHECK ("sortOrder" >= 0),
  ADD CONSTRAINT "org_unit_not_own_parent_check" CHECK ("id" <> "parentId");

CREATE UNIQUE INDEX "org_unit_one_root_per_organization_key"
  ON "org_unit" ("organizationId")
  WHERE "parentId" IS NULL;
