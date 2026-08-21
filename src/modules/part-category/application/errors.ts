import { AppError } from "@/platform/errors";

export type PartCategoryErrorKind = "INVALID_CATEGORY_INPUT" | "CATEGORY_NOT_FOUND" | "CATEGORY_NAME_CONFLICT";

export function partCategoryError(kind: PartCategoryErrorKind, cause?: unknown): AppError {
  const conflict = kind === "CATEGORY_NAME_CONFLICT";
  const notFound = kind === "CATEGORY_NOT_FOUND";
  return new AppError({
    code: conflict ? "STATE.CONFLICT" : notFound ? "RESOURCE.NOT_FOUND" : "PLATFORM.VALIDATION_FAILED",
    httpStatus: conflict ? 409 : notFound ? 404 : 400,
    internalMessage: kind,
    publicMessage: notFound ? "资源不存在。" : conflict ? "名称已存在。" : "请求参数无效。",
    cause,
  });
}

export function categoryInactiveError(cause?: unknown): AppError {
  return new AppError({ code: "BUSINESS_RULE.VIOLATION", httpStatus: 422, internalMessage: "PART_CATEGORY_INACTIVE", publicMessage: "目标零件类别已停用。", cause });
}
