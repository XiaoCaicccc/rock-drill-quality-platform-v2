import { describe, expect, it, vi } from "vitest";

import { createTransactionBoundAuditRecorder, validateAuditEvent } from "./index";
import { createAuditQueryServiceForPrisma } from "./application/audit-service";
import { createAuthenticatedActor, createRequestContext, createRequestId } from "../request-context";

const base = { organizationId: "org", requestId: "request", action: "account.update", targetType: "account", targetId: "target", occurredAt: new Date("2026-08-20T00:00:00.000Z") } as const;
const context = createRequestContext({ actor: createAuthenticatedActor({ kind: "user", userId: "account", sessionId: "session", organizationId: "org", organizationUnitId: null }), clock: { now: () => new Date("2026-08-20T00:00:00.000Z") }, requestIdFactory: () => createRequestId("audit-query") });

describe("Audit foundation", () => {
  it("validates USER and SYSTEM actor shapes", () => {
    expect(validateAuditEvent({ ...base, actorKind: "USER", actorAccountId: "account", actorSessionId: "session" })).toMatchObject({ actorKind: "USER" });
    expect(validateAuditEvent({ ...base, actorKind: "SYSTEM" })).toMatchObject({ actorKind: "SYSTEM" });
    expect(() => validateAuditEvent({ ...base, actorKind: "SYSTEM", actorAccountId: "account" } as never)).toThrow();
  });

  it.each(["password", "currentPassword", "new_password", "passwordHash", "rawToken", "access-token", "sessionToken", "refresh_token", "clientSecret", "apiKey", "private_key", "credential", "connectionString", "plm_session", "cookie", "authorization", "secret", "DATABASE_URL", "TEST_DATABASE_URL"])("rejects secret-bearing details key %s recursively", (key) => {
    expect(() => validateAuditEvent({ ...base, actorKind: "SYSTEM", details: { nested: { [key]: "must-not-enter-audit" } } })).toThrow();
  });

  it("validates before invoking the transaction-bound writer", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const recorder = createTransactionBoundAuditRecorder(write);
    await recorder.record({ ...base, actorKind: "SYSTEM", details: { fromStatus: "ACTIVE", toStatus: "INACTIVE" } });
    expect(write).toHaveBeenCalledOnce();
    await expect(recorder.record({ ...base, actorKind: "SYSTEM", details: { password: "forbidden" } })).rejects.toMatchObject({ internalMessage: "AUDIT_DETAILS_SECRET_FORBIDDEN" });
    expect(write).toHaveBeenCalledOnce();
  });

  it("maps oversized action and target type to stable validation errors before writing", () => {
    expect(() => validateAuditEvent({ ...base, action: `account.${"x".repeat(121)}`, actorKind: "SYSTEM" })).toThrow();
    expect(() => validateAuditEvent({ ...base, targetType: `a${"x".repeat(128)}`, actorKind: "SYSTEM" })).toThrow();
  });

  it("requires an authenticated RequestContext for Organization-isolated queries", async () => {
    const transaction = vi.fn();
    const service = createAuditQueryServiceForPrisma({ $transaction: transaction } as never);
    await expect(service.query({ context: createRequestContext({ clock: { now: () => new Date("2026-08-20T00:00:00.000Z") }, requestIdFactory: () => createRequestId("anonymous-audit-query") }) })).rejects.toMatchObject({ code: "AUTH.AUTHENTICATION_REQUIRED", httpStatus: 401 });
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([
    { page: 0 },
    { pageSize: 101 },
    { page: Number.NaN },
    { from: new Date(Number.NaN) },
    { from: new Date("2026-08-21T00:00:00.000Z"), to: new Date("2026-08-20T00:00:00.000Z") },
    { action: "invalid action" },
    { actorAccountId: "not-a-uuid" },
    { targetType: "Invalid-Type" },
    { targetId: "" },
  ])("rejects invalid audit query input before database access", async (query) => {
    const transaction = vi.fn();
    const service = createAuditQueryServiceForPrisma({ $transaction: transaction } as never);
    await expect(service.query({ context, ...query })).rejects.toMatchObject({ code: "PLATFORM.VALIDATION_FAILED" });
    expect(transaction).not.toHaveBeenCalled();
  });
});
