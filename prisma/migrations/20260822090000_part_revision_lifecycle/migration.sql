-- CreateEnum
CREATE TYPE "PartRevisionStatus" AS ENUM ('DRAFT', 'REVIEWING', 'RETURNED', 'APPROVED', 'RELEASED');

-- CreateEnum
CREATE TYPE "PartRevisionReviewDecision" AS ENUM ('RETURNED', 'APPROVED');

-- CreateTable
CREATE TABLE "part_revision" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "partMasterId" UUID NOT NULL,
    "revisionNo" INTEGER NOT NULL,
    "status" "PartRevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "changeSummary" VARCHAR(2000) NOT NULL,
    "createdByAccountId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSubmittedAt" TIMESTAMPTZ(6),
    "releasedByAccountId" UUID,
    "releasedAt" TIMESTAMPTZ(6),
    CONSTRAINT "part_revision_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "part_revision_revision_no_check" CHECK ("revisionNo" > 0),
    CONSTRAINT "part_revision_timestamp_state_check" CHECK (
      ("status" = 'DRAFT' AND "lastSubmittedAt" IS NULL AND "releasedAt" IS NULL AND "releasedByAccountId" IS NULL)
      OR ("status" IN ('REVIEWING', 'RETURNED', 'APPROVED') AND "lastSubmittedAt" IS NOT NULL AND "releasedAt" IS NULL AND "releasedByAccountId" IS NULL)
      OR ("status" = 'RELEASED' AND "lastSubmittedAt" IS NOT NULL AND "releasedAt" IS NOT NULL AND "releasedByAccountId" IS NOT NULL)
    )
);

-- CreateTable
CREATE TABLE "part_revision_review" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "partRevisionId" UUID NOT NULL,
    "reviewerAccountId" UUID NOT NULL,
    "decision" "PartRevisionReviewDecision" NOT NULL,
    "comment" VARCHAR(2000),
    "creatorReviewOverride" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" VARCHAR(500),
    "decidedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "part_revision_review_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "part_revision_review_override_check" CHECK (("creatorReviewOverride" = false AND "overrideReason" IS NULL) OR ("creatorReviewOverride" = true AND "overrideReason" IS NOT NULL AND char_length(btrim("overrideReason")) BETWEEN 1 AND 500)),
    CONSTRAINT "part_revision_review_return_comment_check" CHECK ("decision" <> 'RETURNED' OR ("comment" IS NOT NULL AND char_length(btrim("comment")) BETWEEN 1 AND 2000))
);

CREATE UNIQUE INDEX "part_revision_part_master_id_revision_no_key" ON "part_revision"("partMasterId", "revisionNo");
CREATE UNIQUE INDEX "part_revision_id_organization_id_key" ON "part_revision"("id", "organizationId");
CREATE UNIQUE INDEX "part_revision_one_unreleased_per_part_master_key" ON "part_revision"("partMasterId") WHERE "status" <> 'RELEASED';
CREATE INDEX "part_revision_organization_part_master_status_idx" ON "part_revision"("organizationId", "partMasterId", "status");
CREATE UNIQUE INDEX "part_revision_review_id_organization_id_key" ON "part_revision_review"("id", "organizationId");
CREATE INDEX "part_revision_review_organization_revision_decided_idx" ON "part_revision_review"("organizationId", "partRevisionId", "decidedAt", "id");
CREATE INDEX "part_revision_review_reviewer_organization_idx" ON "part_revision_review"("reviewerAccountId", "organizationId");

ALTER TABLE "part_revision" ADD CONSTRAINT "part_revision_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "part_revision" ADD CONSTRAINT "part_revision_partMasterId_organizationId_fkey" FOREIGN KEY ("partMasterId", "organizationId") REFERENCES "part_master"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "part_revision" ADD CONSTRAINT "part_revision_createdByAccountId_organizationId_fkey" FOREIGN KEY ("createdByAccountId", "organizationId") REFERENCES "account"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "part_revision" ADD CONSTRAINT "part_revision_releasedByAccountId_organizationId_fkey" FOREIGN KEY ("releasedByAccountId", "organizationId") REFERENCES "account"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "part_revision_review" ADD CONSTRAINT "part_revision_review_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "part_revision_review" ADD CONSTRAINT "part_revision_review_partRevisionId_organizationId_fkey" FOREIGN KEY ("partRevisionId", "organizationId") REFERENCES "part_revision"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "part_revision_review" ADD CONSTRAINT "part_revision_review_reviewerAccountId_organizationId_fkey" FOREIGN KEY ("reviewerAccountId", "organizationId") REFERENCES "account"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "part_master_drawing_number_revision_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW."drawingNumber" IS DISTINCT FROM OLD."drawingNumber" OR NEW."normalizedDrawingNumber" IS DISTINCT FROM OLD."normalizedDrawingNumber") AND EXISTS (SELECT 1 FROM "part_revision" WHERE "partMasterId" = OLD."id") THEN
    RAISE EXCEPTION 'PART_MASTER_DRAWING_NUMBER_LOCKED' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "part_master_drawing_number_revision_guard_trigger"
BEFORE UPDATE OF "drawingNumber", "normalizedDrawingNumber" ON "part_master"
FOR EACH ROW EXECUTE FUNCTION "part_master_drawing_number_revision_guard"();
