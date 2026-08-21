import type { PartCategory } from "@prisma/client";

import type { PartCategoryDto } from "../domain/part-category";

export function toPartCategoryDto(row: PartCategory): PartCategoryDto {
  return { id: row.id, name: row.name, description: row.description, status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

export function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === code;
}
