import { AppError } from "@/platform/errors";

export type PartMasterErrorKind = "INVALID_PART_INPUT" | "PART_NOT_FOUND" | "PART_NUMBER_CONFLICT" | "DRAWING_NUMBER_CONFLICT" | "PART_MASTER_DRAWING_NUMBER_LOCKED";

export function partMasterError(kind: PartMasterErrorKind, cause?: unknown): AppError {
  const conflict = kind === "PART_NUMBER_CONFLICT" || kind === "DRAWING_NUMBER_CONFLICT";
  const notFound = kind === "PART_NOT_FOUND";
  const locked = kind === "PART_MASTER_DRAWING_NUMBER_LOCKED";
  return new AppError({ code: conflict ? "STATE.CONFLICT" : notFound ? "RESOURCE.NOT_FOUND" : locked ? "BUSINESS_RULE.VIOLATION" : "PLATFORM.VALIDATION_FAILED", httpStatus: conflict ? 409 : notFound ? 404 : locked ? 422 : 400, internalMessage: kind, publicMessage: notFound ? "资源不存在。" : conflict ? "业务编号或图号已存在。" : locked ? "零件已有版本，图号不可修改。" : "请求参数无效。", cause });
}

export function partCategoryInactiveError(cause?: unknown): AppError {
  return new AppError({ code: "BUSINESS_RULE.VIOLATION", httpStatus: 422, internalMessage: "PART_CATEGORY_INACTIVE", publicMessage: "目标零件类别已停用。", cause });
}
