import { describe, expect, it } from "vitest";
import { AppError, isAppError, toErrorResponse } from "./index";

describe("platform errors", () => {
  it("maps a known AppError to its safe public response", () => {
    const error = new AppError({ code: "RESOURCE.NOT_FOUND", httpStatus: 404, internalMessage: "Part 7 was absent.", publicMessage: "未找到请求的资源。", details: { resource: "part" }, cause: new Error("private") });
    expect(isAppError(error)).toBe(true);
    expect(toErrorResponse(error, "request-1")).toEqual({ status: 404, body: { error: { code: "RESOURCE.NOT_FOUND", message: "未找到请求的资源。", requestId: "request-1", details: { resource: "part" } } } });
  });

  it("hides unknown Error and non-Error values", () => {
    for (const thrown of [new Error("database password leaked"), "raw failure"]) {
      const response = toErrorResponse(thrown, "request-2");
      expect(response).toEqual({ status: 500, body: { error: { code: "INTERNAL.UNEXPECTED", message: "系统暂时无法处理请求，请稍后重试。", requestId: "request-2" } } });
      expect(JSON.stringify(response)).not.toContain("raw failure");
      expect(JSON.stringify(response)).not.toContain("database password");
    }
  });

  it("never exposes internal fields and omits absent details", () => {
    const error = new AppError({ code: "STATE.CONFLICT", httpStatus: 409, internalMessage: "Internal state mismatch.", publicMessage: "状态发生冲突。", cause: new Error("private cause") });
    const serialized = JSON.stringify(toErrorResponse(error, "request-3"));
    expect(serialized).not.toContain("Internal state mismatch");
    expect(serialized).not.toContain("private cause");
    expect(serialized).not.toContain("stack");
    expect(serialized).not.toContain("details");
  });

  it("rejects illegal error status values", () => {
    expect(() => new AppError({ code: "PLATFORM.VALIDATION_FAILED", httpStatus: 200, internalMessage: "Invalid.", publicMessage: "无效。" })).toThrow(RangeError);
  });
});
