import type { ErrorCode } from "./error-codes";
import type { AppErrorOptions, JsonObject, JsonValue } from "./error-types";

const forbiddenDetailKey = /(password|token|cookie|connection\s*string|database\s*url|database\s*connection)/i;
const databaseConnectionString = /^(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\//i;

function isJsonPrimitive(value: unknown): value is boolean | null | number | string {
  return value === null || typeof value === "boolean" || typeof value === "string" || (typeof value === "number" && Number.isFinite(value));
}

function createSafeJsonSnapshot(value: unknown, seen: Set<object>): JsonValue {
  if (isJsonPrimitive(value)) {
    if (typeof value === "string" && databaseConnectionString.test(value)) throw new TypeError("Error details must not contain database connection strings.");
    return value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new TypeError("Error details must not contain circular references.");
    seen.add(value);
    const snapshot = value.map((item) => createSafeJsonSnapshot(item, seen));
    seen.delete(value);
    return Object.freeze(snapshot);
  }
  if (typeof value !== "object" || value === null || Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError("Error details must be JSON-safe data.");
  if (seen.has(value)) throw new TypeError("Error details must not contain circular references.");
  seen.add(value);
  const snapshot: Record<string, JsonValue> = {};
  for (const [key, item] of Object.entries(value)) {
    if (forbiddenDetailKey.test(key)) throw new TypeError("Error details must not contain sensitive data.");
    snapshot[key] = createSafeJsonSnapshot(item, seen);
  }
  seen.delete(value);
  return Object.freeze(snapshot);
}

function createSafeDetailsSnapshot(details: JsonObject): JsonObject {
  const snapshot = createSafeJsonSnapshot(details, new Set<object>());
  if (typeof snapshot !== "object" || snapshot === null || Array.isArray(snapshot)) throw new TypeError("Error details must be a JSON object.");
  return snapshot as JsonObject;
}

function assertErrorHttpStatus(httpStatus: number): void {
  if (!Number.isInteger(httpStatus) || httpStatus < 400 || httpStatus > 599) throw new RangeError("AppError httpStatus must be an integer from 400 to 599.");
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: number;
  public readonly internalMessage: string;
  public readonly publicMessage: string;
  public readonly details: JsonObject | undefined;

  public constructor(options: AppErrorOptions) {
    assertErrorHttpStatus(options.httpStatus);
    const details = options.details === undefined ? undefined : createSafeDetailsSnapshot(options.details);
    super(options.internalMessage, { cause: options.cause });
    this.name = "AppError";
    this.code = options.code;
    this.httpStatus = options.httpStatus;
    this.internalMessage = options.internalMessage;
    this.publicMessage = options.publicMessage;
    this.details = details;
  }
}

export function isAppError(value: unknown): value is AppError { return value instanceof AppError; }
