import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createAuthorizationService, type PermissionDefinition } from "@/platform/authorization";
import { createIdentitySessionService } from "@/platform/identity-session";
import { createRequestContext } from "@/platform/request-context";
import { requestContextFor, sessionCookieName } from "./api/auth/_shared";

export async function pageAuthentication(next = "/") {
  const store = await cookies();
  const rawToken = store.get(sessionCookieName)?.value ?? "";
  try {
    const authenticated = await createIdentitySessionService().validateSession(rawToken);
    return { authenticated, context: requestContextFor(createRequestContext(), authenticated), rawToken };
  } catch {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
}

export async function pageAuthorization(permission: PermissionDefinition, next: string) {
  const result = await pageAuthentication(next);
  if (result.context.actor.kind !== "user") redirect("/login");
  try {
    await createAuthorizationService().requireAuthorization({ context: result.context, permission, target: { organizationId: result.context.actor.organizationId } });
  } catch { redirect("/forbidden"); }
  return result;
}

export async function redirectAuthenticatedFromLogin(): Promise<void> {
  const store = await cookies();
  const token = store.get(sessionCookieName)?.value;
  if (!token) return;
  try { await createIdentitySessionService().validateSession(token); } catch { return; }
  redirect("/");
}
