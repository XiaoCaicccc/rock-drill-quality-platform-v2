import { AppError } from "@/platform/errors";
export type EquipmentErrorKind = "INVALID_EQUIPMENT_INPUT" | "EQUIPMENT_NOT_FOUND" | "POSITION_NOT_FOUND" | "EQUIPMENT_INACTIVE" | "EQUIPMENT_NUMBER_CONFLICT" | "EQUIPMENT_POSITION_CODE_CONFLICT";
export function equipmentError(kind: EquipmentErrorKind, cause?: unknown): AppError {
  const notFound = kind === "EQUIPMENT_NOT_FOUND" || kind === "POSITION_NOT_FOUND";
  const conflict = kind === "EQUIPMENT_NUMBER_CONFLICT" || kind === "EQUIPMENT_POSITION_CODE_CONFLICT";
  const inactive = kind === "EQUIPMENT_INACTIVE";
  return new AppError({ code: conflict ? "STATE.CONFLICT" : notFound ? "RESOURCE.NOT_FOUND" : inactive ? "BUSINESS_RULE.VIOLATION" : "PLATFORM.VALIDATION_FAILED", httpStatus: conflict ? 409 : notFound ? 404 : inactive ? 422 : 400, internalMessage: kind, publicMessage: notFound ? "资源不存在。" : conflict ? "资源编号或位置编码已存在。" : inactive ? "设备已停用。" : "请求参数无效。", cause });
}
