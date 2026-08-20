import { AppError } from "@/platform/errors";

export type AuthorizationErrorKind =
  | "INVALID_ROLE_ASSIGNMENT_INPUT"
  | "ACCOUNT_NOT_FOUND"
  | "SCOPE_ORG_UNIT_NOT_FOUND"
  | "CROSS_ORGANIZATION_ASSIGNMENT"
  | "ROLE_ASSIGNMENT_CONFLICT"
  | "ROLE_ASSIGNMENT_NOT_FOUND"
  | "AUTHENTICATION_REQUIRED"
  | "PERMISSION_DENIED"
  | "LAST_EFFECTIVE_ADMIN";

export function authorizationError(kind: AuthorizationErrorKind, cause?: unknown): AppError {
  const invalid = kind === "INVALID_ROLE_ASSIGNMENT_INPUT";
  const notFound = kind === "ACCOUNT_NOT_FOUND" || kind === "SCOPE_ORG_UNIT_NOT_FOUND" || kind === "ROLE_ASSIGNMENT_NOT_FOUND";
  const conflict = kind === "ROLE_ASSIGNMENT_CONFLICT";
  const authentication = kind === "AUTHENTICATION_REQUIRED";
  const denied = kind === "PERMISSION_DENIED";
  return new AppError({
    code: invalid ? "PLATFORM.VALIDATION_FAILED" : notFound ? "RESOURCE.NOT_FOUND" : conflict ? "STATE.CONFLICT" : authentication ? "AUTH.AUTHENTICATION_REQUIRED" : denied ? "AUTH.PERMISSION_DENIED" : "BUSINESS_RULE.VIOLATION",
    httpStatus: invalid ? 400 : notFound ? 404 : conflict ? 409 : authentication ? 401 : denied ? 403 : 422,
    internalMessage: kind,
    publicMessage: authentication ? "需要认证。" : denied ? "没有执行此操作的权限。" : kind === "LAST_EFFECTIVE_ADMIN" ? "此操作会移除最后一个有效管理员。" : "请求无法完成。",
    cause,
  });
}
