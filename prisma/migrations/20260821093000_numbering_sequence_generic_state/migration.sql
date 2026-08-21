-- Forward-only repair: keep generic sequence state independent from business formatting policy.
DROP INDEX "numbering_sequence_organization_id_idx";
DROP INDEX "numbering_sequence_id_organization_id_key";
ALTER TABLE "numbering_sequence" DROP CONSTRAINT "numbering_sequence_minimum_width_check";
ALTER TABLE "numbering_sequence" DROP COLUMN "prefix";
ALTER TABLE "numbering_sequence" DROP COLUMN "minimumWidth";
