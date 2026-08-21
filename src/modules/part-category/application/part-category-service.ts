import type { Prisma, PrismaClient } from "@prisma/client";

import { createTransactionBoundAuditRecorder, type AuditEvent } from "@/platform/audit";
import { AppError, type JsonObject } from "@/platform/errors";
import type { RequestContext } from "@/platform/request-context";

import { partCategoryError } from "./errors";
import { isPrismaError, toPartCategoryDto } from "../infrastructure/part-category-prisma";
import { assertPartCategoryStatus, normalizeCategoryDescription, normalizeCategoryName, type CreatePartCategoryInput, type ListPartCategoriesInput, type PartCategoryDto, type PartCategoryPage, type PartCategoryService, type SetPartCategoryStatusInput, type UpdatePartCategoryInput } from "../domain/part-category";

type CategoryTransaction = Prisma.TransactionClient;

function actor(context: RequestContext) {
  if (context.actor.kind !== "user") throw new AppError({ code: "AUTH.AUTHENTICATION_REQUIRED", httpStatus: 401, internalMessage: "AUTHENTICATION_REQUIRED", publicMessage: "需要认证。" });
  return context.actor;
}

function occurredAt(context: RequestContext): Date { return new Date(context.receivedAt); }
function isUuid(value: unknown): value is string { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }

function auditData(event: AuditEvent): Prisma.AuditLogUncheckedCreateInput {
  return { organizationId: event.organizationId, actorKind: event.actorKind, actorAccountId: event.actorKind === "USER" ? event.actorAccountId : null, actorSessionId: event.actorKind === "USER" ? event.actorSessionId : null, requestId: event.requestId, action: event.action, targetType: event.targetType, targetId: event.targetId, reason: event.reason ?? null, details: event.details === null || event.details === undefined ? undefined : event.details as Prisma.InputJsonValue, occurredAt: event.occurredAt };
}

function recorder(transaction: CategoryTransaction) {
  return createTransactionBoundAuditRecorder(async (event) => { await transaction.auditLog.create({ data: auditData(event) }); });
}

function pageValue(value: number | undefined, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 1 || value > max) throw partCategoryError("INVALID_CATEGORY_INPUT");
  return value;
}

function mapError(error: unknown): never {
  if (isPrismaError(error, "P2002")) throw partCategoryError("CATEGORY_NAME_CONFLICT", error);
  if (isPrismaError(error, "P2025") || isPrismaError(error, "P2003")) throw partCategoryError("CATEGORY_NOT_FOUND", error);
  throw error;
}

async function requireCategory(transaction: CategoryTransaction, categoryId: string, organizationId: string) {
  if (!isUuid(categoryId)) throw partCategoryError("CATEGORY_NOT_FOUND");
  const category = await transaction.partCategory.findFirst({ where: { id: categoryId, organizationId } });
  if (!category) throw partCategoryError("CATEGORY_NOT_FOUND");
  return category;
}

export function createPartCategoryServiceForPrisma(prisma: PrismaClient): PartCategoryService {
  return {
    async getReference(organizationId: string, categoryId: string) {
      if (!isUuid(categoryId)) return null;
      const row = await prisma.partCategory.findFirst({ where: { id: categoryId, organizationId }, select: { id: true, name: true, status: true } });
      return row;
    },

    async getReferences(organizationId: string, categoryIds: readonly string[]) {
      if (categoryIds.length === 0) return [];
      return prisma.partCategory.findMany({ where: { organizationId, id: { in: [...new Set(categoryIds)] } }, select: { id: true, name: true, status: true } });
    },

    async create(input: CreatePartCategoryInput): Promise<PartCategoryDto> {
      const currentActor = actor(input.context);
      let normalized: { name: string; normalizedName: string };
      let description: string | null;
      try { normalized = normalizeCategoryName(input.name); description = normalizeCategoryDescription(input.description); } catch (cause) { throw partCategoryError("INVALID_CATEGORY_INPUT", cause); }
      try {
        return await prisma.$transaction(async (transaction) => {
          const row = await transaction.partCategory.create({ data: { organizationId: currentActor.organizationId, name: normalized.name, normalizedName: normalized.normalizedName, description, status: "ACTIVE" } });
          await recorder(transaction).record({ actorKind: "USER", actorAccountId: currentActor.userId, actorSessionId: currentActor.sessionId, organizationId: currentActor.organizationId, requestId: input.context.requestId, action: "part_category.create", targetType: "part_category", targetId: row.id, details: { name: row.name, status: row.status }, occurredAt: occurredAt(input.context) });
          return toPartCategoryDto(row);
        });
      } catch (error) { mapError(error); }
    },

    async list(input: ListPartCategoriesInput): Promise<PartCategoryPage> {
      const currentActor = actor(input.context);
      if (input.status !== undefined) { try { assertPartCategoryStatus(input.status); } catch (cause) { throw partCategoryError("INVALID_CATEGORY_INPUT", cause); } }
      const page = pageValue(input.page, 1, Number.MAX_SAFE_INTEGER);
      const pageSize = pageValue(input.pageSize, 25, 100);
      const search = input.search?.trim();
      const where = { organizationId: currentActor.organizationId, ...(input.status ? { status: input.status } : {}), ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { normalizedName: { contains: search.toLowerCase() } }] } : {}) };
      const [total, rows] = await prisma.$transaction([prisma.partCategory.count({ where }), prisma.partCategory.findMany({ where, orderBy: [{ name: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize })]);
      return { items: rows.map(toPartCategoryDto), page, pageSize, total };
    },

    async update(input: UpdatePartCategoryInput): Promise<PartCategoryDto> {
      const currentActor = actor(input.context);
      let name: string | undefined;
      let normalizedName: string | undefined;
      let description: string | null | undefined;
      try {
        if (input.name !== undefined) { const normalized = normalizeCategoryName(input.name); name = normalized.name; normalizedName = normalized.normalizedName; }
        if (input.description !== undefined) description = normalizeCategoryDescription(input.description);
      } catch (cause) { throw partCategoryError("INVALID_CATEGORY_INPUT", cause); }
      try {
        return await prisma.$transaction(async (transaction) => {
          const existing = await requireCategory(transaction, input.categoryId, currentActor.organizationId);
          const changed = (name !== undefined && name !== existing.name) || (normalizedName !== undefined && normalizedName !== existing.normalizedName) || (description !== undefined && description !== existing.description);
          if (!changed) return toPartCategoryDto(existing);
          const row = await transaction.partCategory.update({ where: { id: existing.id }, data: { ...(name === undefined ? {} : { name, normalizedName }), ...(description === undefined ? {} : { description }) } });
          const changedDetails: Record<string, unknown> = {};
          if (name !== undefined && name !== existing.name) changedDetails.name = name;
          if (description !== undefined && description !== existing.description) changedDetails.description = description;
          await recorder(transaction).record({ actorKind: "USER", actorAccountId: currentActor.userId, actorSessionId: currentActor.sessionId, organizationId: currentActor.organizationId, requestId: input.context.requestId, action: "part_category.update", targetType: "part_category", targetId: row.id, details: { changed: changedDetails } as unknown as JsonObject, occurredAt: occurredAt(input.context) });
          return toPartCategoryDto(row);
        });
      } catch (error) { mapError(error); }
    },

    async setStatus(input: SetPartCategoryStatusInput): Promise<PartCategoryDto> {
      const currentActor = actor(input.context);
      try { assertPartCategoryStatus(input.status); } catch (cause) { throw partCategoryError("INVALID_CATEGORY_INPUT", cause); }
      try {
        return await prisma.$transaction(async (transaction) => {
          const existing = await requireCategory(transaction, input.categoryId, currentActor.organizationId);
          if (existing.status === input.status) return toPartCategoryDto(existing);
          const row = await transaction.partCategory.update({ where: { id: existing.id }, data: { status: input.status } });
          await recorder(transaction).record({ actorKind: "USER", actorAccountId: currentActor.userId, actorSessionId: currentActor.sessionId, organizationId: currentActor.organizationId, requestId: input.context.requestId, action: "part_category.set_status", targetType: "part_category", targetId: row.id, details: { status: row.status }, occurredAt: occurredAt(input.context) });
          return toPartCategoryDto(row);
        });
      } catch (error) { mapError(error); }
    },
  };
}
