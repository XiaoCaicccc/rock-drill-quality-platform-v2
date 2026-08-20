import { AppError, type JsonObject, type JsonValue } from "../../errors";

import type { AuditEvent, ValidatedAuditEvent } from "../domain/audit";

const machineCodePattern = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;
const targetTypePattern = /^[a-z][a-z0-9_]*$/;
const forbiddenKeyPart = /(?:password|passphrase|secret|token|cookie|authorization|credential|privatekey|apikey|connectionstring|databaseurl|plmsession)/;

function isForbiddenKey(key: string): boolean {
  return forbiddenKeyPart.test(key.replace(/[^a-z0-9]/gi, "").toLowerCase());
}

function invalid(internalMessage: string): never {
  throw new AppError({ code: "PLATFORM.VALIDATION_FAILED", httpStatus: 400, internalMessage, publicMessage: "审计事件无效。" });
}

function bounded(value: string, max: number, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > max) invalid(`INVALID_AUDIT_${field}`);
  return value;
}

function validateJson(value: JsonValue, seen: Set<object>): JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string" || (typeof value === "number" && Number.isFinite(value))) return value;
  if (Array.isArray(value)) {
    if (seen.has(value)) invalid("AUDIT_DETAILS_CIRCULAR");
    seen.add(value);
    const result = Object.freeze(value.map((item) => validateJson(item, seen)));
    seen.delete(value);
    return result;
  }
  if (typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype || seen.has(value)) invalid("AUDIT_DETAILS_INVALID");
  seen.add(value);
  const result: Record<string, JsonValue> = {};
  for (const [key, item] of Object.entries(value)) {
    if (isForbiddenKey(key)) invalid("AUDIT_DETAILS_SECRET_FORBIDDEN");
    result[key] = validateJson(item, seen);
  }
  seen.delete(value);
  return Object.freeze(result);
}

export function validateAuditEvent(event: AuditEvent): ValidatedAuditEvent {
  bounded(event.organizationId, 128, "ORGANIZATION_ID");
  bounded(event.requestId, 128, "REQUEST_ID");
  if (!machineCodePattern.test(bounded(event.action, 128, "ACTION"))) invalid("INVALID_AUDIT_ACTION");
  if (!targetTypePattern.test(bounded(event.targetType, 128, "TARGET_TYPE"))) invalid("INVALID_AUDIT_TARGET_TYPE");
  bounded(event.targetId, 128, "TARGET_ID");
  if (!(event.occurredAt instanceof Date) || Number.isNaN(event.occurredAt.getTime())) invalid("INVALID_AUDIT_OCCURRED_AT");
  if (event.reason !== undefined && event.reason !== null && event.reason.length > 500) invalid("INVALID_AUDIT_REASON");
  if (event.actorKind === "USER") {
    bounded(event.actorAccountId, 128, "ACTOR_ACCOUNT_ID");
    bounded(event.actorSessionId, 128, "ACTOR_SESSION_ID");
  } else if (event.actorAccountId !== undefined && event.actorAccountId !== null || event.actorSessionId !== undefined && event.actorSessionId !== null) {
    invalid("SYSTEM_AUDIT_ACTOR_FIELDS_FORBIDDEN");
  }
  const details = event.details === undefined || event.details === null ? event.details : validateJson(event.details, new Set<object>()) as JsonObject;
  return Object.freeze({ ...event, details, occurredAt: new Date(event.occurredAt.getTime()) }) as ValidatedAuditEvent;
}
