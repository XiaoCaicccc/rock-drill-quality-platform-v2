import type { AuditLog } from "@prisma/client";

import type { AuditLogDto } from "../domain/audit";

export function toAuditLogDto(row: AuditLog & { actorAccount?: { displayName: string } | null }): AuditLogDto {
  return {
    id: row.id,
    organizationId: row.organizationId,
    actorKind: row.actorKind,
    actorAccountId: row.actorAccountId,
    actorSessionId: row.actorSessionId,
    actorDisplayName: row.actorAccount?.displayName ?? null,
    requestId: row.requestId,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    reason: row.reason,
    details: row.details as AuditLogDto["details"],
    occurredAt: row.occurredAt,
  };
}
