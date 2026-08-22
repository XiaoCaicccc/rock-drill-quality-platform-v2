import type { NumberingPolicy } from "@/platform/numbering";
import type { RequestContext } from "@/platform/request-context";

export type EquipmentStatus = "ACTIVE" | "INACTIVE";
export type EquipmentPositionStatus = "ACTIVE" | "INACTIVE";
export const equipmentNumberingPolicy: NumberingPolicy = Object.freeze({ key: "equipment", prefix: "EQ-", minimumWidth: 6, start: 1 });
export interface EquipmentDto { readonly id: string; readonly equipmentNumber: string; readonly name: string; readonly model: string | null; readonly description: string | null; readonly status: EquipmentStatus; readonly createdAt: Date; readonly updatedAt: Date; }
export interface EquipmentPositionDto { readonly id: string; readonly positionCode: string; readonly name: string; readonly description: string | null; readonly status: EquipmentPositionStatus; readonly equipment: Pick<EquipmentDto, "id" | "equipmentNumber" | "name" | "status">; readonly createdAt: Date; readonly updatedAt: Date; }
export interface Page<T> { readonly items: readonly T[]; readonly page: number; readonly pageSize: number; readonly total: number; }
export interface EquipmentService {
  createEquipment(input: { context: RequestContext; name: string; model?: string | null; description?: string | null }): Promise<EquipmentDto>;
  listEquipment(input: { context: RequestContext; search?: string; status?: EquipmentStatus; page?: number; pageSize?: number }): Promise<Page<EquipmentDto>>;
  getEquipment(input: { context: RequestContext; equipmentId: string }): Promise<EquipmentDto>;
  updateEquipment(input: { context: RequestContext; equipmentId: string; name?: string; model?: string | null; description?: string | null }): Promise<EquipmentDto>;
  setEquipmentStatus(input: { context: RequestContext; equipmentId: string; status: EquipmentStatus }): Promise<EquipmentDto>;
  createPosition(input: { context: RequestContext; equipmentId: string; positionCode: string; name: string; description?: string | null }): Promise<EquipmentPositionDto>;
  listPositions(input: { context: RequestContext; equipmentId: string; search?: string; status?: EquipmentPositionStatus; page?: number; pageSize?: number }): Promise<Page<EquipmentPositionDto>>;
  getPosition(input: { context: RequestContext; positionId: string }): Promise<EquipmentPositionDto>;
  updatePosition(input: { context: RequestContext; positionId: string; positionCode?: string; name?: string; description?: string | null }): Promise<EquipmentPositionDto>;
  setPositionStatus(input: { context: RequestContext; positionId: string; status: EquipmentPositionStatus }): Promise<EquipmentPositionDto>;
}
export function isUuid(value: unknown): value is string { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function codePointLength(value: string): number { return Array.from(value).length; }
export function requiredText(value: unknown, max: number, code: string): string { if (typeof value !== "string") throw new TypeError(code); const normalized = value.trim(); if (normalized.length === 0 || codePointLength(normalized) > max) throw new TypeError(code); return normalized; }
export function optionalText(value: unknown, max: number, code: string): string | null { if (value === undefined || value === null) return null; if (typeof value !== "string") throw new TypeError(code); const normalized = value.trim(); if (codePointLength(normalized) > max) throw new TypeError(code); return normalized || null; }
export function positionCode(value: unknown): { positionCode: string; normalizedPositionCode: string } { const code = requiredText(value, 100, "POSITION_CODE_INVALID"); const normalizedPositionCode = code.toUpperCase(); if (codePointLength(normalizedPositionCode) > 100) throw new TypeError("POSITION_CODE_INVALID"); return { positionCode: code, normalizedPositionCode }; }
export function assertEquipmentStatus(value: unknown): asserts value is EquipmentStatus { if (value !== "ACTIVE" && value !== "INACTIVE") throw new TypeError("EQUIPMENT_STATUS_INVALID"); }
export function assertPositionStatus(value: unknown): asserts value is EquipmentPositionStatus { if (value !== "ACTIVE" && value !== "INACTIVE") throw new TypeError("POSITION_STATUS_INVALID"); }
