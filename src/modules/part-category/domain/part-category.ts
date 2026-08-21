import type { RequestContext } from "@/platform/request-context";

export type PartCategoryStatus = "ACTIVE" | "INACTIVE";

export interface PartCategoryDto {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: PartCategoryStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PartCategoryPage {
  readonly items: readonly PartCategoryDto[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface PartCategoryReference { readonly id: string; readonly name: string; readonly status: PartCategoryStatus; }
export interface PartCategoryLookup {
  getReference(organizationId: string, categoryId: string): Promise<PartCategoryReference | null>;
  getReferences(organizationId: string, categoryIds: readonly string[]): Promise<readonly PartCategoryReference[]>;
}

export interface CreatePartCategoryInput { readonly context: RequestContext; readonly name: string; readonly description?: string | null; }
export interface ListPartCategoriesInput { readonly context: RequestContext; readonly search?: string; readonly status?: PartCategoryStatus; readonly page?: number; readonly pageSize?: number; }
export interface UpdatePartCategoryInput { readonly context: RequestContext; readonly categoryId: string; readonly name?: string; readonly description?: string | null; }
export interface SetPartCategoryStatusInput { readonly context: RequestContext; readonly categoryId: string; readonly status: PartCategoryStatus; }

export interface PartCategoryService extends PartCategoryLookup {
  create(input: CreatePartCategoryInput): Promise<PartCategoryDto>;
  list(input: ListPartCategoriesInput): Promise<PartCategoryPage>;
  update(input: UpdatePartCategoryInput): Promise<PartCategoryDto>;
  setStatus(input: SetPartCategoryStatusInput): Promise<PartCategoryDto>;
}

export function normalizeCategoryName(value: string): { name: string; normalizedName: string } {
  if (typeof value !== "string") throw new TypeError("CATEGORY_NAME_INVALID");
  const name = value.trim();
  if (name.length === 0 || name.length > 200) throw new TypeError("CATEGORY_NAME_INVALID");
  const normalizedName = name.toLowerCase();
  if (normalizedName.length > 200) throw new TypeError("CATEGORY_NAME_INVALID");
  return { name, normalizedName };
}

export function normalizeCategoryDescription(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.trim().length > 2000) throw new TypeError("CATEGORY_DESCRIPTION_INVALID");
  const description = value.trim();
  return description.length === 0 ? null : description;
}

export function assertPartCategoryStatus(value: string): asserts value is PartCategoryStatus {
  if (value !== "ACTIVE" && value !== "INACTIVE") throw new TypeError("CATEGORY_STATUS_INVALID");
}
