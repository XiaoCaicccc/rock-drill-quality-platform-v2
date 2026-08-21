-- CreateEnum
CREATE TYPE "PartCategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PartMasterStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "numbering_sequence" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "key" VARCHAR(128) NOT NULL,
    "prefix" VARCHAR(32) NOT NULL,
    "minimumWidth" INTEGER NOT NULL,
    "currentValue" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "numbering_sequence_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "numbering_sequence_minimum_width_check" CHECK ("minimumWidth" > 0),
    CONSTRAINT "numbering_sequence_current_value_check" CHECK ("currentValue" >= 0)
);

-- CreateTable
CREATE TABLE "part_category" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "normalizedName" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000),
    "status" "PartCategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_master" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "partNumber" VARCHAR(64) NOT NULL,
    "drawingNumber" VARCHAR(200),
    "normalizedDrawingNumber" VARCHAR(200),
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000),
    "status" "PartMasterStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_master_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "numbering_sequence_organization_id_key_key" ON "numbering_sequence"("organizationId", "key");
CREATE UNIQUE INDEX "numbering_sequence_id_organization_id_key" ON "numbering_sequence"("id", "organizationId");
CREATE INDEX "numbering_sequence_organization_id_idx" ON "numbering_sequence"("organizationId");
CREATE UNIQUE INDEX "part_category_organization_id_normalized_name_key" ON "part_category"("organizationId", "normalizedName");
CREATE UNIQUE INDEX "part_category_id_organization_id_key" ON "part_category"("id", "organizationId");
CREATE INDEX "part_category_organization_id_status_idx" ON "part_category"("organizationId", "status");
CREATE INDEX "part_category_organization_id_name_idx" ON "part_category"("organizationId", "name");
CREATE UNIQUE INDEX "part_master_organization_id_part_number_key" ON "part_master"("organizationId", "partNumber");
CREATE UNIQUE INDEX "part_master_organization_id_normalized_drawing_number_key" ON "part_master"("organizationId", "normalizedDrawingNumber");
CREATE UNIQUE INDEX "part_master_id_organization_id_key" ON "part_master"("id", "organizationId");
CREATE INDEX "part_master_organization_id_status_idx" ON "part_master"("organizationId", "status");
CREATE INDEX "part_master_organization_id_category_id_idx" ON "part_master"("organizationId", "categoryId");
CREATE INDEX "part_master_organization_id_name_idx" ON "part_master"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "numbering_sequence" ADD CONSTRAINT "numbering_sequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "part_category" ADD CONSTRAINT "part_category_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "part_master" ADD CONSTRAINT "part_master_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "part_master" ADD CONSTRAINT "part_master_categoryId_organizationId_fkey" FOREIGN KEY ("categoryId", "organizationId") REFERENCES "part_category"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
