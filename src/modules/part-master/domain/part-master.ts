import type { RequestContext } from "@/platform/request-context";
import type { PartCategoryLookup, PartCategoryReference } from "@/modules/part-category";
import type { NumberingPolicy, NumberingService } from "@/platform/numbering";

export type PartMasterStatus = "ACTIVE" | "INACTIVE";

export const partMasterNumberingPolicy: NumberingPolicy = Object.freeze({ key: "part_master", prefix: "PART-", minimumWidth: 6, start: 1 });

export interface PartMasterDto {
  readonly id: string;
  readonly partNumber: string;
  readonly drawingNumber: string | null;
  readonly name: string;
  readonly description: string | null;
  readonly status: PartMasterStatus;
  readonly category: PartCategoryReference;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PartMasterPage {
  readonly items: readonly PartMasterDto[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export interface CreatePartMasterInput { readonly context: RequestContext; readonly categoryId: string; readonly drawingNumber?: string | null; readonly name: string; readonly description?: string | null; }
export interface ListPartMastersInput { readonly context: RequestContext; readonly search?: string; readonly categoryId?: string; readonly status?: PartMasterStatus; readonly page?: number; readonly pageSize?: number; }
export interface GetPartMasterInput { readonly context: RequestContext; readonly partId: string; }
export interface UpdatePartMasterInput { readonly context: RequestContext; readonly partId: string; readonly categoryId?: string; readonly drawingNumber?: string | null; readonly name?: string; readonly description?: string | null; }
export interface SetPartMasterStatusInput { readonly context: RequestContext; readonly partId: string; readonly status: PartMasterStatus; }

export interface PartMasterDependencies {
  readonly categories: PartCategoryLookup;
  readonly numbering: NumberingService;
}

export interface PartMasterService {
  create(input: CreatePartMasterInput): Promise<PartMasterDto>;
  list(input: ListPartMastersInput): Promise<PartMasterPage>;
  get(input: GetPartMasterInput): Promise<PartMasterDto>;
  update(input: UpdatePartMasterInput): Promise<PartMasterDto>;
  setStatus(input: SetPartMasterStatusInput): Promise<PartMasterDto>;
}

export function normalizePartName(value: string): string {
  if (typeof value !== "string") throw new TypeError("PART_NAME_INVALID");
  const name = value.trim();
  if (name.length === 0 || name.length > 200) throw new TypeError("PART_NAME_INVALID");
  return name;
}

export function normalizePartDescription(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.trim().length > 2000) throw new TypeError("PART_DESCRIPTION_INVALID");
  const description = value.trim();
  return description.length === 0 ? null : description;
}

export function normalizeDrawingNumber(value: string | null | undefined): { drawingNumber: string | null; normalizedDrawingNumber: string | null } {
  if (value === undefined || value === null) return { drawingNumber: null, normalizedDrawingNumber: null };
  if (typeof value !== "string") throw new TypeError("DRAWING_NUMBER_INVALID");
  const drawingNumber = value.trim();
  if (drawingNumber.length > 200) throw new TypeError("DRAWING_NUMBER_INVALID");
  if (drawingNumber.length === 0) return { drawingNumber: null, normalizedDrawingNumber: null };
  const normalizedDrawingNumber = drawingNumber.toUpperCase();
  if (normalizedDrawingNumber.length > 200) throw new TypeError("DRAWING_NUMBER_INVALID");
  return { drawingNumber, normalizedDrawingNumber };
}

export function assertPartMasterStatus(value: string): asserts value is PartMasterStatus {
  if (value !== "ACTIVE" && value !== "INACTIVE") throw new TypeError("PART_STATUS_INVALID");
}

export function isUuid(value: unknown): value is string { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
