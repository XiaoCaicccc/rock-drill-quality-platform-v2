-- CreateEnum
CREATE TYPE "AuditActorKind" AS ENUM ('USER', 'SYSTEM');

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "actorKind" "AuditActorKind" NOT NULL,
    "actorAccountId" UUID,
    "actorSessionId" UUID,
    "requestId" VARCHAR(128) NOT NULL,
    "action" VARCHAR(128) NOT NULL,
    "targetType" VARCHAR(128) NOT NULL,
    "targetId" VARCHAR(128) NOT NULL,
    "reason" VARCHAR(500),
    "details" JSONB,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "audit_log_actor_fields_check" CHECK (
        ("actorKind" = 'USER' AND "actorAccountId" IS NOT NULL AND "actorSessionId" IS NOT NULL)
        OR
        ("actorKind" = 'SYSTEM' AND "actorAccountId" IS NULL AND "actorSessionId" IS NULL)
    )
);

-- CreateIndex
CREATE INDEX "audit_log_organization_occurred_at_idx" ON "audit_log"("organizationId", "occurredAt");
CREATE INDEX "audit_log_organization_actor_occurred_at_idx" ON "audit_log"("organizationId", "actorAccountId", "occurredAt");
CREATE INDEX "audit_log_organization_action_occurred_at_idx" ON "audit_log"("organizationId", "action", "occurredAt");
CREATE INDEX "audit_log_organization_target_idx" ON "audit_log"("organizationId", "targetType", "targetId");

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorAccountId_organizationId_fkey" FOREIGN KEY ("actorAccountId", "organizationId") REFERENCES "account"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
