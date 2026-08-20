import type { PrismaClient } from "@prisma/client";

import { AppError } from "../../errors";
import type { AuditQueryService } from "./contracts";
import { toAuditLogDto } from "../infrastructure/audit-prisma";

const actionPattern = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;
const targetTypePattern = /^[a-z][a-z0-9_]*$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalid(message: string): never {
  throw new AppError({ code: "PLATFORM.VALIDATION_FAILED", httpStatus: 400, internalMessage: message, publicMessage: "审计查询参数无效。" });
}

function requireOrganizationId(input: Parameters<AuditQueryService["query"]>[0]): string {
  if (input.context.actor.kind !== "user") throw new AppError({ code: "AUTH.AUTHENTICATION_REQUIRED", httpStatus: 401, internalMessage: "AUTHENTICATION_REQUIRED", publicMessage: "需要认证。" });
  return input.context.actor.organizationId;
}

function positiveInteger(value: number | undefined, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 1 || value > max) invalid("INVALID_AUDIT_PAGINATION");
  return value;
}

function validDate(value: Date | undefined, field: string): void {
  if (value !== undefined && (!(value instanceof Date) || Number.isNaN(value.getTime()))) invalid(`INVALID_AUDIT_${field}`);
}

function optionalString(value: string | undefined, field: string, max: number, pattern?: RegExp): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length === 0 || value.length > max || pattern && !pattern.test(value)) invalid(`INVALID_AUDIT_${field}`);
  return value;
}

export function createAuditQueryServiceForPrisma(prisma: PrismaClient): AuditQueryService {
  return {
    async query(input) {
      const organizationId = requireOrganizationId(input);
      const page = positiveInteger(input.page, 1, Number.MAX_SAFE_INTEGER);
      const pageSize = positiveInteger(input.pageSize, 25, 100);
      validDate(input.from, "FROM");
      validDate(input.to, "TO");
      if (input.from && input.to && input.from > input.to) invalid("INVALID_AUDIT_DATE_RANGE");
      const action = optionalString(input.action, "ACTION", 128, actionPattern);
      const actorAccountId = optionalString(input.actorAccountId, "ACTOR_ACCOUNT_ID", 36, uuidPattern);
      const targetType = optionalString(input.targetType, "TARGET_TYPE", 64, targetTypePattern);
      const targetId = optionalString(input.targetId, "TARGET_ID", 128);
      const where = {
        organizationId,
        ...(action ? { action } : {}),
        ...(actorAccountId ? { actorAccountId } : {}),
        ...(targetType ? { targetType } : {}),
        ...(targetId ? { targetId } : {}),
        ...(input.from || input.to ? { occurredAt: { ...(input.from ? { gte: input.from } : {}), ...(input.to ? { lt: input.to } : {}) } } : {}),
      };
      const [total, rows] = await prisma.$transaction([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({ where, include: { actorAccount: { select: { displayName: true } } }, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
      ]);
      return { items: rows.map(toAuditLogDto), page, pageSize, total };
    },
  };
}
