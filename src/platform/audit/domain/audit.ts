import type { JsonObject } from "../../errors";
import type { RequestContext } from "../../request-context";

export type AuditActorKind = "USER" | "SYSTEM";

interface AuditEventBase {
  readonly organizationId: string;
  readonly requestId: string;
  readonly action: string;
  readonly targetType: string;
  readonly targetId: string;
  readonly reason?: string | null;
  readonly details?: JsonObject | null;
  readonly occurredAt: Date;
}

export interface UserAuditEvent extends AuditEventBase {
  readonly actorKind: "USER";
  readonly actorAccountId: string;
  readonly actorSessionId: string;
}

export interface SystemAuditEvent extends AuditEventBase {
  readonly actorKind: "SYSTEM";
  readonly actorAccountId?: null;
  readonly actorSessionId?: null;
}

export type AuditEvent = UserAuditEvent | SystemAuditEvent;
export type ValidatedAuditEvent = AuditEvent;

export interface AuditLogDto extends AuditEventBase {
  readonly id: string;
  readonly actorKind: AuditActorKind;
  readonly actorAccountId: string | null;
  readonly actorSessionId: string | null;
  readonly actorDisplayName: string | null;
}

export interface AuditQuery {
  readonly context: RequestContext;
  readonly action?: string;
  readonly actorAccountId?: string;
  readonly targetType?: string;
  readonly targetId?: string;
  readonly from?: Date;
  readonly to?: Date;
  readonly page?: number;
  readonly pageSize?: number;
}

export interface AuditPage {
  readonly items: readonly AuditLogDto[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}
