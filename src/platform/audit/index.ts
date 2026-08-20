import { getPrismaClient } from "../database";

import { createAuditQueryServiceForPrisma } from "./application/audit-service";
import { validateAuditEvent } from "./application/audit-validation";
import type { AuditEventWriter, AuditRecorder } from "./application/contracts";

export function createAuditQueryService() { return createAuditQueryServiceForPrisma(getPrismaClient()); }

export function createTransactionBoundAuditRecorder(write: AuditEventWriter): AuditRecorder {
  return { async record(event) { await write(validateAuditEvent(event)); } };
}

export { validateAuditEvent };
export type { AuditEventWriter, AuditQueryService, AuditRecorder } from "./application/contracts";
export type { AuditActorKind, AuditEvent, AuditLogDto, AuditPage, AuditQuery, SystemAuditEvent, UserAuditEvent, ValidatedAuditEvent } from "./domain/audit";
