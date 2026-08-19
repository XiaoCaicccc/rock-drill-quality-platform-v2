import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/platform/errors";
import { createRequestContext, createRequestId } from "@/platform/request-context";
import { requestContextFor } from "./_shared";

const account = { id: "account-1", organizationId: "org-1", primaryOrgUnitId: "unit-1", username: "alice", displayName: "Alice", status: "ACTIVE", createdAt: new Date("2026-08-19T00:00:00.000Z"), updatedAt: new Date("2026-08-19T00:00:00.000Z") } as const;
const session = { id: "session-1", accountId: "account-1", createdAt: new Date("2026-08-19T00:00:00.000Z"), expiresAt: new Date("2026-08-26T00:00:00.000Z"), revokedAt: null, userAgent: "test" } as const;
const authenticated = { account, session };
const service = { authenticate: vi.fn(), validateSession: vi.fn(), listOwnSessions: vi.fn(), revokeOwnSession: vi.fn(), logout: vi.fn() };

vi.mock("@/platform/identity-session", () => ({ createIdentitySessionService: () => service }));

describe("authentication transport contracts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("upgrades the existing request context without creating a second request identity", () => {
    const context = createRequestContext({ requestIdFactory: () => createRequestId("request-1") });
    const authenticatedContext = requestContextFor(context, authenticated);
    expect(authenticatedContext.requestId).toBe("request-1");
    expect(authenticatedContext.receivedAt).toBe(context.receivedAt);
    expect(authenticatedContext.actor).toMatchObject({ kind: "user", userId: account.id, sessionId: session.id });
  });

  it("returns safe login data and sets the required cookie", async () => {
    service.authenticate.mockResolvedValue({ ...authenticated, rawToken: "opaque-token-for-test" });
    const { POST } = await import("./login/route");
    const response = await POST(new Request("http://localhost/api/auth/login", { method: "POST", body: JSON.stringify({ username: "alice", password: "password that is long" }), headers: { "content-type": "application/json" } }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("plm_session=");
    expect(body).toEqual({ account: { ...account, createdAt: account.createdAt.toISOString(), updatedAt: account.updatedAt.toISOString() }, session: { ...session, createdAt: session.createdAt.toISOString(), expiresAt: session.expiresAt.toISOString() } });
    expect(JSON.stringify(body)).not.toContain("opaque-token-for-test");
    expect(JSON.stringify(body)).not.toContain("passwordHash");
  });

  it("returns authentication required for an invalid session", async () => {
    service.validateSession.mockRejectedValue(new AppError({ code: "AUTH.AUTHENTICATION_REQUIRED", httpStatus: 401, internalMessage: "AUTHENTICATION_REQUIRED", publicMessage: "需要认证。" }));
    const { GET } = await import("./session/route");
    const response = await GET(new Request("http://localhost/api/auth/session"));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: "AUTH.AUTHENTICATION_REQUIRED" } });
  });

  it("lists only the authenticated account's own session metadata", async () => {
    service.validateSession.mockResolvedValue(authenticated);
    service.listOwnSessions.mockResolvedValue([{ sessionId: session.id, createdAt: session.createdAt, expiresAt: session.expiresAt, current: true, userAgent: session.userAgent }]);
    const { GET } = await import("./sessions/route");
    const response = await GET(new Request("http://localhost/api/auth/sessions", { headers: { cookie: "plm_session=opaque-token-for-test" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sessions: [{ sessionId: session.id, createdAt: session.createdAt.toISOString(), expiresAt: session.expiresAt.toISOString(), current: true, userAgent: "test" }] });
    expect(service.listOwnSessions).toHaveBeenCalledWith("opaque-token-for-test");
  });

  it("makes logout idempotent and clears the cookie", async () => {
    const { POST } = await import("./logout/route");
    const response = await POST(new Request("http://localhost/api/auth/logout", { method: "POST" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("plm_session=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(service.logout).toHaveBeenCalledWith(null);
  });

  it("clears the current-session cookie after own-session DELETE", async () => {
    service.validateSession.mockResolvedValue(authenticated);
    service.revokeOwnSession.mockResolvedValue({ current: true });
    const { DELETE } = await import("./sessions/[sessionId]/route");
    const response = await DELETE(new Request("http://localhost/api/auth/sessions/session-1", { method: "DELETE", headers: { cookie: "plm_session=opaque-token-for-test" } }), { params: Promise.resolve({ sessionId: "session-1" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(service.revokeOwnSession).toHaveBeenCalledWith({ rawToken: "opaque-token-for-test", sessionId: "session-1" });
  });
});
