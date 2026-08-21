import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/platform/errors";

const mocks = vi.hoisted(() => ({
  identity: { validateSession: vi.fn() },
  authorization: { requireAuthorization: vi.fn() },
  parts: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn() },
  categories: { list: vi.fn(), getReference: vi.fn(), getReferences: vi.fn(), create: vi.fn(), update: vi.fn(), setStatus: vi.fn() },
}));

vi.mock("@/platform/identity-session", () => ({ createIdentitySessionService: () => mocks.identity }));
vi.mock("@/platform/authorization", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/platform/authorization")>()), createAuthorizationService: () => mocks.authorization }));
vi.mock("@/modules/part-master", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/modules/part-master")>()), createPartMasterService: () => mocks.parts }));
vi.mock("@/modules/part-category", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/modules/part-category")>()), createPartCategoryService: () => mocks.categories }));

const account = { id: "11111111-1111-4111-8111-111111111111", organizationId: "22222222-2222-4222-8222-222222222222", primaryOrgUnitId: "33333333-3333-4333-8333-333333333333", username: "engineer", displayName: "Engineer", status: "ACTIVE", createdAt: new Date(), updatedAt: new Date() } as const;
const authenticated = { account, session: { id: "44444444-4444-4444-8444-444444444444", accountId: account.id, createdAt: new Date(), expiresAt: new Date(Date.now() + 1000), revokedAt: null, userAgent: "test" } } as const;
const denied = () => new AppError({ code: "AUTH.PERMISSION_DENIED", httpStatus: 403, internalMessage: "PERMISSION_DENIED", publicMessage: "无权执行此操作。" });
const notFound = () => new AppError({ code: "RESOURCE.NOT_FOUND", httpStatus: 404, internalMessage: "PART_NOT_FOUND", publicMessage: "资源不存在。" });

function request(path: string, method: "GET" | "POST" | "PATCH", body?: Record<string, unknown>) {
  return new Request(`http://localhost${path}`, { method, headers: { cookie: "plm_session=opaque-token", ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}

describe("Part Category / Part Master API contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.identity.validateSession.mockResolvedValue(authenticated);
    mocks.authorization.requireAuthorization.mockResolvedValue(undefined);
    mocks.parts.list.mockResolvedValue({ items: [], page: 1, pageSize: 25, total: 0 });
    mocks.categories.list.mockResolvedValue({ items: [], page: 1, pageSize: 25, total: 0 });
  });

  it("returns 401 for an unauthenticated mutation", async () => {
    mocks.identity.validateSession.mockRejectedValue(new AppError({ code: "AUTH.AUTHENTICATION_REQUIRED", httpStatus: 401, internalMessage: "AUTHENTICATION_REQUIRED", publicMessage: "需要认证。" }));
    const { POST } = await import("./parts/route");
    expect((await POST(request("/api/parts", "POST", { categoryId: "55555555-5555-4555-8555-555555555555", name: "P" }))).status).toBe(401);
    expect(mocks.parts.create).not.toHaveBeenCalled();
  });

  it("denies Quality Manager, Inspector, and Viewer mutation through the same authorization gate while reads remain allowed", async () => {
    const { POST } = await import("./parts/route");
    for (let attempt = 0; attempt < 3; attempt += 1) {
      mocks.authorization.requireAuthorization.mockRejectedValueOnce(denied());
      expect((await POST(request("/api/parts", "POST", { categoryId: "55555555-5555-4555-8555-555555555555", name: "P" }))).status).toBe(403);
    }
    mocks.authorization.requireAuthorization.mockResolvedValue(undefined);
    const { GET } = await import("./parts/route");
    expect((await GET(request("/api/parts", "GET"))).status).toBe(200);
  });

  it("allows an Engineer/Admin-authorized mutation after the authorization gate", async () => {
    mocks.parts.create.mockResolvedValue({ id: account.id, partNumber: "PART-000001", drawingNumber: null, name: "P", description: null, status: "ACTIVE", category: { id: "55555555-5555-4555-8555-555555555555", name: "Cat", status: "ACTIVE" }, createdAt: new Date(), updatedAt: new Date() });
    const { POST } = await import("./parts/route");
    expect((await POST(request("/api/parts", "POST", { categoryId: "55555555-5555-4555-8555-555555555555", name: "P" }))).status).toBe(201);
    expect(mocks.parts.create).toHaveBeenCalled();
  });

  it.each([
    ["category", "/api/part-categories", { name: "New", organizationId: account.organizationId, status: "INACTIVE", id: account.id, normalizedName: "new" }],
    ["part", "/api/parts", { categoryId: "55555555-5555-4555-8555-555555555555", name: "P", organizationId: account.organizationId, status: "INACTIVE", id: account.id, partNumber: "CLIENT", normalizedDrawingNumber: "CLIENT" }],
  ])("rejects protected %s write fields", async (_label, path, body) => {
    const route = path.endsWith("parts") ? await import("./parts/route") : await import("./part-categories/route");
    const response = await route.POST(request(path, "POST", body));
    expect(response.status).toBe(400);
  });

  it("rejects protected PartMaster PATCH fields and exposes no DELETE surface", async () => {
    const partRoute = await import("./parts/[partId]/route");
    const patchResponse = await partRoute.PATCH(request(`/api/parts/${account.id}`, "PATCH", { partNumber: "CLIENT", name: "P" }), { params: Promise.resolve({ partId: account.id }) });
    expect(patchResponse.status).toBe(400);
    const categoryRoute = await import("./part-categories/[categoryId]/route");
    expect((categoryRoute as { DELETE?: unknown }).DELETE).toBeUndefined();
    expect((partRoute as { DELETE?: unknown }).DELETE).toBeUndefined();
  });

  it("returns a safe DTO and never exposes organization or normalized drawing internals", async () => {
    mocks.parts.get.mockResolvedValue({ id: account.id, partNumber: "PART-000001", drawingNumber: "dr-1", name: "P", description: null, status: "ACTIVE", category: { id: "55555555-5555-4555-8555-555555555555", name: "Cat", status: "ACTIVE" }, createdAt: new Date(), updatedAt: new Date(), organizationId: account.organizationId, normalizedDrawingNumber: "DR-1" });
    const { GET } = await import("./parts/[partId]/route");
    const response = await GET(request(`/api/parts/${account.id}`, "GET"), { params: Promise.resolve({ partId: account.id }) } as never);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).not.toHaveProperty("organizationId");
    expect(body).not.toHaveProperty("normalizedDrawingNumber");
    expect(body).not.toHaveProperty("numberingSequence");
  });

  it("maps valid cross-Organization category and part IDs to 404", async () => {
    mocks.parts.get.mockRejectedValue(notFound());
    const partRoute = await import("./parts/[partId]/route");
    expect((await partRoute.GET(request("/api/parts/66666666-6666-4666-8666-666666666666", "GET"), { params: Promise.resolve({ partId: "66666666-6666-4666-8666-666666666666" }) })).status).toBe(404);
    mocks.categories.update.mockRejectedValue(notFound());
    const categoryRoute = await import("./part-categories/[categoryId]/route");
    expect((await categoryRoute.PATCH(request("/api/part-categories/66666666-6666-4666-8666-666666666666", "PATCH", { name: "Nope" }), { params: Promise.resolve({ categoryId: "66666666-6666-4666-8666-666666666666" }) })).status).toBe(404);
  });

  it("maps malformed direct UUID paths to 404 and malformed categoryId filters to 400", async () => {
    mocks.parts.get.mockRejectedValue(notFound());
    const partRoute = await import("./parts/[partId]/route");
    expect((await partRoute.GET(request("/api/parts/not-a-uuid", "GET"), { params: Promise.resolve({ partId: "not-a-uuid" }) })).status).toBe(404);
    const { GET } = await import("./parts/route");
    const response = await GET(request("/api/parts?categoryId=not-a-uuid", "GET"));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "PLATFORM.VALIDATION_FAILED" } });
    mocks.categories.update.mockRejectedValue(notFound());
    const categoryRoute = await import("./part-categories/[categoryId]/route");
    expect((await categoryRoute.PATCH(request("/api/part-categories/not-a-uuid", "PATCH", { name: "Nope" }), { params: Promise.resolve({ categoryId: "not-a-uuid" }) })).status).toBe(404);
  });
});
