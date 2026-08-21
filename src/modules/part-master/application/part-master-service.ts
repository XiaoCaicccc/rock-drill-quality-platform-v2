import type { Prisma, PrismaClient } from "@prisma/client";

import { createTransactionBoundAuditRecorder, type AuditEvent } from "@/platform/audit";
import { AppError, type JsonObject } from "@/platform/errors";
import type { RequestContext } from "@/platform/request-context";

import { partCategoryInactiveError, partMasterError } from "./errors";
import { isPrismaError, prismaConflictConstraint, prismaConflictTarget } from "../infrastructure/part-master-prisma";
import { assertPartMasterStatus, isUuid, normalizeDrawingNumber, normalizePartDescription, normalizePartName, partMasterNumberingPolicy, type CreatePartMasterInput, type GetPartMasterInput, type ListPartMastersInput, type PartMasterDependencies, type PartMasterDto, type PartMasterPage, type PartMasterService, type SetPartMasterStatusInput, type UpdatePartMasterInput } from "../domain/part-master";
import type { PartCategoryReference } from "@/modules/part-category";

type PartTransaction = Prisma.TransactionClient;

function actor(context: RequestContext) {
  if (context.actor.kind !== "user") throw new AppError({ code: "AUTH.AUTHENTICATION_REQUIRED", httpStatus: 401, internalMessage: "AUTHENTICATION_REQUIRED", publicMessage: "需要认证。" });
  return context.actor;
}

function occurredAt(context: RequestContext): Date { return new Date(context.receivedAt); }

function auditData(event: AuditEvent): Prisma.AuditLogUncheckedCreateInput {
  return { organizationId: event.organizationId, actorKind: event.actorKind, actorAccountId: event.actorKind === "USER" ? event.actorAccountId : null, actorSessionId: event.actorKind === "USER" ? event.actorSessionId : null, requestId: event.requestId, action: event.action, targetType: event.targetType, targetId: event.targetId, reason: event.reason ?? null, details: event.details === null || event.details === undefined ? undefined : event.details as Prisma.InputJsonValue, occurredAt: event.occurredAt };
}

function recorder(transaction: PartTransaction) {
  return createTransactionBoundAuditRecorder(async (event) => { await transaction.auditLog.create({ data: auditData(event) }); });
}

function pageValue(value: number | undefined, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 1 || value > max) throw partMasterError("INVALID_PART_INPUT");
  return value;
}

function mapError(error: unknown): never {
  if (isPrismaError(error, "P2002")) {
    const target = prismaConflictTarget(error);
    const constraint = prismaConflictConstraint(error);
    if (constraint === "part_master_organization_id_part_number_key" || target.includes("partNumber") || target.includes("part_number")) throw partMasterError("PART_NUMBER_CONFLICT", error);
    if (constraint === "part_master_organization_id_normalized_drawing_number_key" || target.includes("normalizedDrawingNumber") || target.includes("normalized_drawing_number")) throw partMasterError("DRAWING_NUMBER_CONFLICT", error);
  }
  if (isPrismaError(error, "P2025") || isPrismaError(error, "P2003")) throw partMasterError("PART_NOT_FOUND", error);
  throw error;
}

function dto(row: { id: string; partNumber: string; drawingNumber: string | null; name: string; description: string | null; status: "ACTIVE" | "INACTIVE"; createdAt: Date; updatedAt: Date }, category: PartCategoryReference): PartMasterDto {
  return { id: row.id, partNumber: row.partNumber, drawingNumber: row.drawingNumber, name: row.name, description: row.description, status: row.status, category, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

async function requirePart(client: PrismaClient | Prisma.TransactionClient, partId: string, organizationId: string) {
  if (!isUuid(partId)) throw partMasterError("PART_NOT_FOUND");
  const row = await client.partMaster.findFirst({ where: { id: partId, organizationId } });
  if (!row) throw partMasterError("PART_NOT_FOUND");
  return row;
}

async function requireActiveCategory(dependencies: PartMasterDependencies, organizationId: string, categoryId: string) {
  if (!isUuid(categoryId)) throw partMasterError("INVALID_PART_INPUT");
  const category = await dependencies.categories.getReference(organizationId, categoryId);
  if (!category) throw partMasterError("PART_NOT_FOUND");
  if (category.status !== "ACTIVE") throw partCategoryInactiveError();
  return category;
}

async function categoryFor(dependencies: PartMasterDependencies, organizationId: string, categoryId: string): Promise<PartCategoryReference> {
  if (!isUuid(categoryId)) throw partMasterError("PART_NOT_FOUND");
  const category = await dependencies.categories.getReference(organizationId, categoryId);
  if (!category) throw partMasterError("PART_NOT_FOUND");
  return category;
}

export function createPartMasterServiceForPrisma(prisma: PrismaClient, dependencies: PartMasterDependencies): PartMasterService {
  const service: PartMasterService = {
    async create(input: CreatePartMasterInput): Promise<PartMasterDto> {
      const currentActor = actor(input.context);
      let name: string; let description: string | null; let drawing: { drawingNumber: string | null; normalizedDrawingNumber: string | null };
      try { name = normalizePartName(input.name); description = normalizePartDescription(input.description); drawing = normalizeDrawingNumber(input.drawingNumber); } catch (cause) { throw partMasterError("INVALID_PART_INPUT", cause); }
      const category = await requireActiveCategory(dependencies, currentActor.organizationId, input.categoryId);
      const partNumber = (await dependencies.numbering.allocate(currentActor.organizationId, partMasterNumberingPolicy)).formatted;
      try {
        const row = await prisma.$transaction(async (transaction) => {
          const created = await transaction.partMaster.create({ data: { organizationId: currentActor.organizationId, categoryId: category.id, partNumber, drawingNumber: drawing.drawingNumber, normalizedDrawingNumber: drawing.normalizedDrawingNumber, name, description, status: "ACTIVE" } });
          await recorder(transaction).record({ actorKind: "USER", actorAccountId: currentActor.userId, actorSessionId: currentActor.sessionId, organizationId: currentActor.organizationId, requestId: input.context.requestId, action: "part_master.create", targetType: "part_master", targetId: created.id, details: { partNumber: created.partNumber, categoryId: created.categoryId }, occurredAt: occurredAt(input.context) });
          return created;
        });
        return dto(row, category);
      } catch (error) { mapError(error); }
    },

    async list(input: ListPartMastersInput): Promise<PartMasterPage> {
      const currentActor = actor(input.context);
      if (input.categoryId !== undefined && !isUuid(input.categoryId)) throw partMasterError("INVALID_PART_INPUT");
      if (input.status !== undefined) { try { assertPartMasterStatus(input.status); } catch (cause) { throw partMasterError("INVALID_PART_INPUT", cause); } }
      const page = pageValue(input.page, 1, Number.MAX_SAFE_INTEGER); const pageSize = pageValue(input.pageSize, 25, 100); const search = input.search?.trim();
      const where = { organizationId: currentActor.organizationId, ...(input.categoryId ? { categoryId: input.categoryId } : {}), ...(input.status ? { status: input.status } : {}), ...(search ? { OR: [{ partNumber: { contains: search, mode: "insensitive" as const } }, { drawingNumber: { contains: search, mode: "insensitive" as const } }, { name: { contains: search, mode: "insensitive" as const } }] } : {}) };
      const [total, rows] = await prisma.$transaction([prisma.partMaster.count({ where }), prisma.partMaster.findMany({ where, orderBy: [{ partNumber: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize })]);
      const categories = await dependencies.categories.getReferences(currentActor.organizationId, rows.map((row) => row.categoryId));
      const categoryMap = new Map(categories.map((category) => [category.id, category]));
      return { items: rows.map((row) => { const category = categoryMap.get(row.categoryId); if (!category) throw partMasterError("PART_NOT_FOUND"); return dto(row, category); }), page, pageSize, total };
    },

    async get(input: GetPartMasterInput): Promise<PartMasterDto> {
      const currentActor = actor(input.context);
      try { const row = await requirePart(prisma, input.partId, currentActor.organizationId); return dto(row, await categoryFor(dependencies, currentActor.organizationId, row.categoryId)); } catch (error) { mapError(error); }
    },

    async update(input: UpdatePartMasterInput): Promise<PartMasterDto> {
      const currentActor = actor(input.context);
      let name: string | undefined; let description: string | null | undefined; let drawing: { drawingNumber: string | null; normalizedDrawingNumber: string | null } | undefined; let category: PartCategoryReference | undefined;
      try { if (input.name !== undefined) name = normalizePartName(input.name); if (input.description !== undefined) description = normalizePartDescription(input.description); if (input.drawingNumber !== undefined) drawing = normalizeDrawingNumber(input.drawingNumber); } catch (cause) { throw partMasterError("INVALID_PART_INPUT", cause); }
      if (input.categoryId !== undefined && (typeof input.categoryId !== "string" || input.categoryId.trim().length === 0)) throw partMasterError("INVALID_PART_INPUT");
      try {
        const row = await prisma.$transaction(async (transaction) => {
          const existing = await requirePart(transaction, input.partId, currentActor.organizationId);
          if (input.categoryId !== undefined && input.categoryId !== existing.categoryId) category = await requireActiveCategory(dependencies, currentActor.organizationId, input.categoryId);
          const changed = (name !== undefined && name !== existing.name) || (description !== undefined && description !== existing.description) || (drawing !== undefined && (drawing.drawingNumber !== existing.drawingNumber || drawing.normalizedDrawingNumber !== existing.normalizedDrawingNumber)) || (category !== undefined && category.id !== existing.categoryId);
          if (!changed) return existing;
          const updated = await transaction.partMaster.update({ where: { id: existing.id }, data: { ...(name === undefined ? {} : { name }), ...(description === undefined ? {} : { description }), ...(drawing === undefined ? {} : drawing), ...(category === undefined ? {} : { categoryId: category.id }) } });
          const changedDetails: Record<string, unknown> = {};
          if (name !== undefined && name !== existing.name) changedDetails.name = name;
          if (description !== undefined && description !== existing.description) changedDetails.description = description;
          if (drawing !== undefined && drawing.drawingNumber !== existing.drawingNumber) changedDetails.drawingNumber = drawing.drawingNumber;
          if (category !== undefined && category.id !== existing.categoryId) changedDetails.categoryId = category.id;
          await recorder(transaction).record({ actorKind: "USER", actorAccountId: currentActor.userId, actorSessionId: currentActor.sessionId, organizationId: currentActor.organizationId, requestId: input.context.requestId, action: "part_master.update", targetType: "part_master", targetId: updated.id, details: { changed: changedDetails } as unknown as JsonObject, occurredAt: occurredAt(input.context) });
          return updated;
        });
        return dto(row, category ?? await categoryFor(dependencies, currentActor.organizationId, row.categoryId));
      } catch (error) { mapError(error); }
    },

    async setStatus(input: SetPartMasterStatusInput): Promise<PartMasterDto> {
      const currentActor = actor(input.context);
      try { assertPartMasterStatus(input.status); } catch (cause) { throw partMasterError("INVALID_PART_INPUT", cause); }
      try {
        const row = await prisma.$transaction(async (transaction) => {
          const existing = await requirePart(transaction, input.partId, currentActor.organizationId);
          if (existing.status === input.status) return existing;
          const updated = await transaction.partMaster.update({ where: { id: existing.id }, data: { status: input.status } });
          await recorder(transaction).record({ actorKind: "USER", actorAccountId: currentActor.userId, actorSessionId: currentActor.sessionId, organizationId: currentActor.organizationId, requestId: input.context.requestId, action: "part_master.set_status", targetType: "part_master", targetId: updated.id, details: { status: updated.status }, occurredAt: occurredAt(input.context) });
          return updated;
        });
        return dto(row, await categoryFor(dependencies, currentActor.organizationId, row.categoryId));
      } catch (error) { mapError(error); }
    },
  };
  return service;
}
