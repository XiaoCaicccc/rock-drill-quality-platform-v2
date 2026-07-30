export interface AnonymousActor { readonly kind: "anonymous"; }
export interface AuthenticatedActor { readonly kind: "user"; readonly userId: string; readonly sessionId: string; readonly organizationId: string; readonly organizationUnitId: string | null; }
export type Actor = AnonymousActor | AuthenticatedActor;
export const anonymousActor: AnonymousActor = Object.freeze({ kind: "anonymous" });

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) throw new RangeError(`${field} must not be empty.`);
}

export function createAuthenticatedActor(actor: AuthenticatedActor): AuthenticatedActor {
  assertNonEmpty(actor.userId, "userId");
  assertNonEmpty(actor.sessionId, "sessionId");
  assertNonEmpty(actor.organizationId, "organizationId");
  if (actor.organizationUnitId !== null) assertNonEmpty(actor.organizationUnitId, "organizationUnitId");
  return Object.freeze({ ...actor });
}

export function normalizeActor(actor: Actor): Actor { return actor.kind === "anonymous" ? anonymousActor : createAuthenticatedActor(actor); }
