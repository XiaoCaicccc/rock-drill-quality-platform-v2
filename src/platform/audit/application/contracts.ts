import type { AuditEvent, AuditPage, AuditQuery, ValidatedAuditEvent } from "../domain/audit";

export interface AuditRecorder { record(event: AuditEvent): Promise<void>; }
export type AuditEventWriter = (event: ValidatedAuditEvent) => Promise<void>;
export interface AuditQueryService { query(input: AuditQuery): Promise<AuditPage>; }
