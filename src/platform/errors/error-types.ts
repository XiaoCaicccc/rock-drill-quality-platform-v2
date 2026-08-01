export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonArray | JsonObject | JsonPrimitive;
export type JsonArray = readonly JsonValue[];
export interface JsonObject { readonly [key: string]: JsonValue; }

export interface AppErrorOptions {
  readonly code: import("./error-codes").ErrorCode;
  readonly httpStatus: number;
  readonly internalMessage: string;
  readonly publicMessage: string;
  readonly details?: JsonObject;
  readonly cause?: unknown;
}
