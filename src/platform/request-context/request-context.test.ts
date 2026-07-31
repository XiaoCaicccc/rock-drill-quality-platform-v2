import { describe, expect, it } from "vitest";
import { anonymousActor, createAuthenticatedActor, createRequestContext, createRequestId } from "./index";

const fixedClock = { now: (): Date => new Date("2026-07-30T01:23:45.678Z") };
const fixedRequestId = (): ReturnType<typeof createRequestId> => createRequestId("request-fixed");

describe("RequestContext", () => {
  it("creates a frozen anonymous context by default", () => {
    const context = createRequestContext({ clock: fixedClock, requestIdFactory: fixedRequestId });
    expect(context).toEqual({ requestId: "request-fixed", receivedAt: "2026-07-30T01:23:45.678Z", businessTimeZone: "Asia/Shanghai", actor: anonymousActor });
    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.actor)).toBe(true);
  });

  it("preserves an authenticated actor and injected values", () => {
    const actor = createAuthenticatedActor({ kind: "user", userId: "user-1", sessionId: "session-1", organizationId: "org-1", organizationUnitId: null });
    const context = createRequestContext({ actor, clock: fixedClock, requestIdFactory: fixedRequestId });
    expect(context.actor).toEqual(actor);
    expect(context.receivedAt).toBe("2026-07-30T01:23:45.678Z");
    expect(context.requestId).toBe("request-fixed");
  });

  it("keeps only the explicitly allowed authenticated actor fields", () => {
    const input = { kind: "user" as const, userId: "user-1", sessionId: "session-1", organizationId: "org-1", organizationUnitId: null, token: "secret", cookie: "session=secret", roles: ["admin"], permissions: ["all"] };
    const actor = createAuthenticatedActor(input);
    const context = createRequestContext({ actor: input, clock: fixedClock, requestIdFactory: fixedRequestId });
    expect(actor).toEqual({ kind: "user", userId: "user-1", sessionId: "session-1", organizationId: "org-1", organizationUnitId: null });
    expect(context.actor).toEqual(actor);
    expect(actor).not.toHaveProperty("token");
    expect(context.actor).not.toHaveProperty("roles");
  });

  it("rejects empty authenticated actor identifiers", () => {
    const base = { kind: "user" as const, userId: "user-1", sessionId: "session-1", organizationId: "org-1", organizationUnitId: "unit-1" };
    expect(() => createAuthenticatedActor({ ...base, userId: "" })).toThrow(RangeError);
    expect(() => createAuthenticatedActor({ ...base, sessionId: " " })).toThrow(RangeError);
    expect(() => createAuthenticatedActor({ ...base, organizationId: "" })).toThrow(RangeError);
    expect(() => createAuthenticatedActor({ ...base, organizationUnitId: "" })).toThrow(RangeError);
    expect(createAuthenticatedActor({ ...base, organizationUnitId: null }).organizationUnitId).toBeNull();
  });
});
