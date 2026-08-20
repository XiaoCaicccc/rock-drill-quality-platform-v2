import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  token: "valid-session",
  validateSession: vi.fn(),
  redirect: vi.fn((destination: string) => { throw new Error(`NEXT_REDIRECT:${destination}`); }),
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => mocks.token ? { value: mocks.token } : undefined }) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/platform/identity-session", () => ({ createIdentitySessionService: () => ({ validateSession: mocks.validateSession }) }));

describe("/login authenticated redirect behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.token = "valid-session";
  });

  it("redirects an authenticated valid Session from /login to /", async () => {
    mocks.validateSession.mockResolvedValue({ account: { id: "account-1" }, session: { id: "session-1" } });
    const { redirectAuthenticatedFromLogin } = await import("../_auth");
    await expect(redirectAuthenticatedFromLogin()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(mocks.validateSession).toHaveBeenCalledWith("valid-session");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("keeps rendering login for a missing or invalid Session", async () => {
    const { redirectAuthenticatedFromLogin } = await import("../_auth");
    mocks.token = "";
    await expect(redirectAuthenticatedFromLogin()).resolves.toBeUndefined();
    expect(mocks.validateSession).not.toHaveBeenCalled();
    mocks.token = "invalid-session";
    mocks.validateSession.mockRejectedValue(new Error("invalid"));
    await expect(redirectAuthenticatedFromLogin()).resolves.toBeUndefined();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
