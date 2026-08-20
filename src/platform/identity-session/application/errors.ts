import { AppError } from "../../errors";

export type IdentityErrorKind =
  | "INVALID_ACCOUNT_INPUT"
  | "INVALID_CREDENTIAL_INPUT"
  | "ACCOUNT_USERNAME_CONFLICT"
  | "ACCOUNT_NOT_FOUND"
  | "ACCOUNT_STATUS_INVALID"
  | "AUTHENTICATION_FAILED"
  | "AUTHENTICATION_REQUIRED"
  | "SESSION_LIMIT_REACHED"
  | "SESSION_NOT_FOUND"
  | "BOOTSTRAP_ALREADY_COMPLETED"
  | "BOOTSTRAP_EXISTING_ACCOUNT_REQUIRED"
  | "LAST_EFFECTIVE_ADMIN"
  | "ADMIN_CANNOT_RESET_SELF"
  | "ORGANIZATION_SCOPE_INVALID";

export function identityError(kind: IdentityErrorKind, cause?: unknown): AppError {
  const authFailure = kind === "AUTHENTICATION_FAILED";
  const required = kind === "AUTHENTICATION_REQUIRED";
  const limit = kind === "SESSION_LIMIT_REACHED";
  const notFound = kind === "SESSION_NOT_FOUND" || kind === "ACCOUNT_NOT_FOUND";
  const conflict = kind === "ACCOUNT_USERNAME_CONFLICT" || kind === "BOOTSTRAP_ALREADY_COMPLETED" || kind === "BOOTSTRAP_EXISTING_ACCOUNT_REQUIRED";
  return new AppError({
    code: authFailure ? "AUTH.AUTHENTICATION_FAILED" : limit ? "AUTH.SESSION_LIMIT_REACHED" : required ? "AUTH.AUTHENTICATION_REQUIRED" : conflict ? "STATE.CONFLICT" : notFound ? "RESOURCE.NOT_FOUND" : kind === "INVALID_ACCOUNT_INPUT" || kind === "INVALID_CREDENTIAL_INPUT" ? "PLATFORM.VALIDATION_FAILED" : "BUSINESS_RULE.VIOLATION",
    httpStatus: authFailure || required ? 401 : limit || conflict ? 409 : notFound ? 404 : kind === "INVALID_ACCOUNT_INPUT" || kind === "INVALID_CREDENTIAL_INPUT" ? 400 : 422,
    internalMessage: kind,
    publicMessage: authFailure ? "用户名或密码错误。" : required ? "需要认证。" : limit ? "当前账号已达到有效 Session 数量上限。" : kind === "LAST_EFFECTIVE_ADMIN" ? "此操作会移除最后一个有效管理员。" : "请求无法完成。",
    cause,
  });
}
