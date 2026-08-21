import { AppError } from "@/platform/errors";

export type PartRevisionErrorKind = "INVALID_PART_REVISION_INPUT" | "PART_REVISION_NOT_FOUND" | "PART_REVISION_INVALID_TRANSITION" | "PART_REVISION_UNRELEASED_EXISTS" | "PART_MASTER_INACTIVE" | "PART_REVISION_CREATOR_REVIEW_FORBIDDEN" | "PART_REVISION_OVERRIDE_NOT_APPLICABLE" | "PART_MASTER_DRAWING_NUMBER_LOCKED";
export function partRevisionError(kind: PartRevisionErrorKind, cause?: unknown): AppError {
  const notFound = kind === "PART_REVISION_NOT_FOUND";
  const conflict = kind === "PART_REVISION_INVALID_TRANSITION" || kind === "PART_REVISION_UNRELEASED_EXISTS";
  const business = !notFound && !conflict && kind !== "INVALID_PART_REVISION_INPUT";
  return new AppError({ code: notFound ? "RESOURCE.NOT_FOUND" : conflict ? "STATE.CONFLICT" : business ? "BUSINESS_RULE.VIOLATION" : "PLATFORM.VALIDATION_FAILED", httpStatus: notFound ? 404 : conflict ? 409 : business ? 422 : 400, internalMessage: kind, publicMessage: notFound ? "资源不存在。" : conflict ? "当前状态不允许此操作。" : business ? "不满足业务规则。" : "请求参数无效。", cause });
}
