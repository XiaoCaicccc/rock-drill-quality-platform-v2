import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, type ErrorCode } from "@/platform/errors";

const mocks = vi.hoisted(() => ({
  identity: {
    validateSession: vi.fn(),
    listManagedAccounts: vi.fn(),
    createManagedAccount: vi.fn(),
    getManagedAccount: vi.fn(),
    updateManagedAccount: vi.fn(),
    resetManagedPassword: vi.fn(),
  },
  authorization: {
    requireAuthorization: vi.fn(),
    listManagedRoleAssignments: vi.fn(),
    assignManagedRole: vi.fn(),
    revokeManagedRole: vi.fn(),
  },
  audit: { query: vi.fn() },
}));

vi.mock("@/platform/identity-session", () => ({ createIdentitySessionService: () => mocks.identity }));
vi.mock("@/platform/authorization", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/platform/authorization")>();
  return { ...actual, createAuthorizationService: () => mocks.authorization };
});
vi.mock("@/platform/audit", () => ({ createAuditQueryService: () => mocks.audit }));

const account = {
  id: "account-1",
  organizationId: "org-1",
  primaryOrgUnitId: "unit-1",
  username: "alice",
  displayName: "Alice",
  status: "ACTIVE",
  createdAt: new Date("2026-08-20T00:00:00.000Z"),
  updatedAt: new Date("2026-08-20T00:00:00.000Z"),
} as const;

const authenticated = {
  account,
  session: {
    id: "session-1",
    accountId: account.id,
    createdAt: new Date("2026-08-20T00:00:00.000Z"),
    expiresAt: new Date("2026-08-27T00:00:00.000Z"),
    revokedAt: null,
    userAgent: "test",
  },
} as const;

function request(method: "GET" | "POST", body?: Record<string, unknown>): Request {
  return new Request("http://localhost/api/admin/accounts", {
    method,
    headers: { cookie: "plm_session=opaque-token", ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function apiRequest(path: string, method: "GET" | "POST" | "PATCH" | "DELETE", body?: Record<string, unknown>): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { cookie: "plm_session=opaque-token", ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

const appError = (code: ErrorCode, httpStatus: number, internalMessage: string) => new AppError({ code, httpStatus, internalMessage, publicMessage: "请求无法完成。" });

describe("management API contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.identity.validateSession.mockResolvedValue(authenticated);
    mocks.authorization.requireAuthorization.mockResolvedValue(undefined);
  });

  it("returns 401 before querying accounts when the session is invalid", async () => {
    mocks.identity.validateSession.mockRejectedValue(new AppError({ code: "AUTH.AUTHENTICATION_REQUIRED", httpStatus: 401, internalMessage: "AUTHENTICATION_REQUIRED", publicMessage: "需要认证。" }));
    const { GET } = await import("./accounts/route");
    const response = await GET(request("GET"));
    expect(response.status).toBe(401);
    expect(mocks.identity.listManagedAccounts).not.toHaveBeenCalled();
  });

  it("returns 403 before querying accounts when authorization is denied", async () => {
    mocks.authorization.requireAuthorization.mockRejectedValue(new AppError({ code: "AUTH.PERMISSION_DENIED", httpStatus: 403, internalMessage: "AUTHORIZATION_DENIED", publicMessage: "无权执行此操作。" }));
    const { GET } = await import("./accounts/route");
    const response = await GET(request("GET"));
    expect(response.status).toBe(403);
    expect(mocks.identity.listManagedAccounts).not.toHaveBeenCalled();
  });

  it("rejects unknown write fields before invoking the managed account mutation", async () => {
    const { POST } = await import("./accounts/route");
    const response = await POST(request("POST", { username: "alice", displayName: "Alice", primaryOrgUnitId: "unit-1", password: "long enough password", unexpected: true }));
    expect(response.status).toBe(400);
    expect(mocks.identity.createManagedAccount).not.toHaveBeenCalled();
  });

  it("passes the authenticated Organization context and returns only the safe Account DTO", async () => {
    mocks.identity.createManagedAccount.mockResolvedValue(account);
    const { POST } = await import("./accounts/route");
    const response = await POST(request("POST", { username: "alice", displayName: "Alice", primaryOrgUnitId: "unit-1", password: "long enough password" }));
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(mocks.identity.createManagedAccount).toHaveBeenCalledWith(expect.objectContaining({ context: expect.objectContaining({ actor: expect.objectContaining({ organizationId: "org-1" }) }) }));
    expect(body).toEqual({ account: { ...account, createdAt: account.createdAt.toISOString(), updatedAt: account.updatedAt.toISOString() } });
    expect(JSON.stringify(body)).not.toMatch(/password|token/i);
  });

  it.each([
    ["create", async () => {
      mocks.identity.createManagedAccount.mockRejectedValue(appError("BUSINESS_RULE.VIOLATION", 422, "ORGANIZATION_SCOPE_INVALID"));
      const { POST } = await import("./accounts/route");
      return POST(apiRequest("/api/admin/accounts", "POST", { username: "alice", displayName: "Alice", primaryOrgUnitId: "cross-org-unit", password: "long enough password" }));
    }],
    ["update", async () => {
      mocks.identity.updateManagedAccount.mockRejectedValue(appError("BUSINESS_RULE.VIOLATION", 422, "ORGANIZATION_SCOPE_INVALID"));
      const { PATCH } = await import("./accounts/[accountId]/route");
      return PATCH(apiRequest("/api/admin/accounts/account-1", "PATCH", { primaryOrgUnitId: "cross-org-unit" }), { params: Promise.resolve({ accountId: "account-1" }) });
    }],
  ])("maps cross-Organization OrgUnit %s failures to the stable 422 AppError contract", async (_label, invoke) => {
    const response = await invoke();
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: { code: "BUSINESS_RULE.VIOLATION" } });
  });

  it("returns 404 for cross-Organization Account IDOR without leaking the resource", async () => {
    mocks.identity.getManagedAccount.mockRejectedValue(appError("RESOURCE.NOT_FOUND", 404, "ACCOUNT_NOT_FOUND"));
    const { GET } = await import("./accounts/[accountId]/route");
    const response = await GET(apiRequest("/api/admin/accounts/other-org-account", "GET"), { params: Promise.resolve({ accountId: "other-org-account" }) });
    expect(response.status).toBe(404);
    expect(JSON.stringify(await response.json())).not.toContain("other-org-account");
  });

  it("returns 404 for cross-Organization Role Assignment account and assignment IDOR attempts", async () => {
    mocks.authorization.listManagedRoleAssignments.mockRejectedValue(appError("RESOURCE.NOT_FOUND", 404, "ACCOUNT_NOT_FOUND"));
    const listRoute = await import("./accounts/[accountId]/role-assignments/route");
    const listResponse = await listRoute.GET(apiRequest("/api/admin/accounts/other-account/role-assignments", "GET"), { params: Promise.resolve({ accountId: "other-account" }) });
    expect(listResponse.status).toBe(404);

    mocks.authorization.revokeManagedRole.mockRejectedValue(appError("RESOURCE.NOT_FOUND", 404, "ROLE_ASSIGNMENT_NOT_FOUND"));
    const revokeRoute = await import("./role-assignments/[assignmentId]/route");
    const revokeResponse = await revokeRoute.DELETE(apiRequest("/api/admin/role-assignments/other-assignment", "DELETE"), { params: Promise.resolve({ assignmentId: "other-assignment" }) });
    expect(revokeResponse.status).toBe(404);
  });

  it("denies non-Admin management before invoking the Role Assignment mutation", async () => {
    mocks.authorization.requireAuthorization.mockRejectedValue(appError("AUTH.PERMISSION_DENIED", 403, "PERMISSION_DENIED"));
    const { POST } = await import("./accounts/[accountId]/role-assignments/route");
    const response = await POST(apiRequest("/api/admin/accounts/account-1/role-assignments", "POST", { role: "VIEWER", scopeOrgUnitId: "unit-1" }), { params: Promise.resolve({ accountId: "account-1" }) });
    expect(response.status).toBe(403);
    expect(mocks.authorization.assignManagedRole).not.toHaveBeenCalled();
  });

  it("requires offset-bearing Audit instants and passes explicit Asia/Shanghai boundaries as UTC", async () => {
    mocks.audit.query.mockImplementation(async (input) => {
      if (input.from instanceof Date && Number.isNaN(input.from.getTime())) throw appError("PLATFORM.VALIDATION_FAILED", 400, "INVALID_AUDIT_FROM");
      return { items: [], page: 1, pageSize: 25, total: 0 };
    });
    const { GET } = await import("./audit/route");
    const invalid = await GET(apiRequest("/api/admin/audit?from=2026-08-20T00%3A00%3A00", "GET"));
    expect(invalid.status).toBe(400);
    const valid = await GET(apiRequest("/api/admin/audit?from=2026-08-20T00%3A00%3A00%2B08%3A00&to=2026-08-21T00%3A00%3A00%2B08%3A00", "GET"));
    expect(valid.status).toBe(200);
    expect(mocks.audit.query).toHaveBeenLastCalledWith(expect.objectContaining({ from: new Date("2026-08-19T16:00:00.000Z"), to: new Date("2026-08-20T16:00:00.000Z") }));
  });

  it("returns a secret-free Audit DTO contract", async () => {
    mocks.audit.query.mockResolvedValue({ items: [{ id: "audit-1", organizationId: "org-1", actorKind: "USER", actorAccountId: "account-1", actorSessionId: "session-1", actorDisplayName: "Alice", requestId: "request-1", action: "account.update", targetType: "account", targetId: "account-2", reason: null, details: { changed: ["displayName"] }, occurredAt: new Date("2026-08-20T00:00:00.000Z") }], page: 1, pageSize: 25, total: 1 });
    const { GET } = await import("./audit/route");
    const response = await GET(apiRequest("/api/admin/audit", "GET"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(JSON.stringify(body)).not.toMatch(/password|rawToken|tokenHash|authorization|cookie|secret/i);
  });
});
