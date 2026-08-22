CREATE TYPE "EquipmentStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "EquipmentPositionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "equipment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "equipmentNumber" VARCHAR(64) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "model" VARCHAR(200),
  "description" VARCHAR(2000),
  "status" "EquipmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "equipment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "equipment_organization_id_equipment_number_key" UNIQUE ("organizationId", "equipmentNumber"),
  CONSTRAINT "equipment_id_organization_id_key" UNIQUE ("id", "organizationId"),
  CONSTRAINT "equipment_organization_id_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "equipment_position" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "equipmentId" UUID NOT NULL,
  "positionCode" VARCHAR(100) NOT NULL,
  "normalizedPositionCode" VARCHAR(100) NOT NULL,
  "name" VARCHAR(200) NOT NULL,
  "description" VARCHAR(2000),
  "status" "EquipmentPositionStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "equipment_position_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "equipment_position_equipment_id_normalized_code_key" UNIQUE ("equipmentId", "normalizedPositionCode"),
  CONSTRAINT "equipment_position_id_organization_id_key" UNIQUE ("id", "organizationId"),
  CONSTRAINT "equipment_position_organization_id_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "equipment_position_equipment_organization_fkey" FOREIGN KEY ("equipmentId", "organizationId") REFERENCES "equipment"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "equipment_position_code_trim_check" CHECK ("positionCode" = btrim("positionCode") AND char_length("positionCode") BETWEEN 1 AND 100),
  CONSTRAINT "equipment_position_normalized_code_check" CHECK ("normalizedPositionCode" = upper(btrim("positionCode")))
);

CREATE INDEX "equipment_organization_id_status_idx" ON "equipment"("organizationId", "status");
CREATE INDEX "equipment_organization_id_name_idx" ON "equipment"("organizationId", "name");
CREATE INDEX "equipment_position_organization_equipment_status_idx" ON "equipment_position"("organizationId", "equipmentId", "status");
CREATE INDEX "equipment_position_equipment_name_idx" ON "equipment_position"("equipmentId", "name");
