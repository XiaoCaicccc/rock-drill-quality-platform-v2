import { AppError, isAppError } from "./app-error";
import type { ErrorCode } from "./error-codes";
import type { JsonObject } from "./error-types";

export interface PublicErrorBody { readonly error: { readonly code: ErrorCode; readonly message: string; readonly requestId: string; readonly details?: JsonObject; }; }
export interface ErrorResponse { readonly status: number; readonly body: PublicErrorBody; }
const unexpectedErrorMessage = "系统暂时无法处理请求，请稍后重试。";

export function toErrorResponse(error: unknown, requestId: string): ErrorResponse {
  if (isAppError(error)) {
    const body: PublicErrorBody = { error: { code: error.code, message: error.publicMessage, requestId, ...(error.details === undefined ? {} : { details: error.details }) } };
    return { status: error.httpStatus, body };
  }
  return { status: 500, body: { error: { code: "INTERNAL.UNEXPECTED", message: unexpectedErrorMessage, requestId } } };
}

export function createUnexpectedAppError(cause: unknown): AppError {
  return new AppError({ code: "INTERNAL.UNEXPECTED", httpStatus: 500, internalMessage: "An unexpected error occurred.", publicMessage: unexpectedErrorMessage, cause });
}
