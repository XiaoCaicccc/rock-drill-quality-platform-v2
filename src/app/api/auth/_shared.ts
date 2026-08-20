import { createAuthenticatedActor, createRequestContext, withAuthenticatedActor } from "@/platform/request-context";
import { AppError, toErrorResponse } from "@/platform/errors";
import type { AuthenticatedSessionDto } from "@/platform/identity-session";
import type { RequestContext } from "@/platform/request-context";
import { createIdentitySessionService } from "@/platform/identity-session";
import { createAuthorizationService, type PermissionDefinition } from "@/platform/authorization";

export const sessionCookieName = "plm_session";
export const isProduction = process.env.NODE_ENV === "production";

export function errorResponse(error: unknown, requestId: string): Response {
  const response = toErrorResponse(error, requestId);
  return Response.json(response.body, { status: response.status });
}

export function clearSessionCookie(response: Response): Response {
  response.headers.append("Set-Cookie", `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProduction ? "; Secure" : ""}`);
  return response;
}

export function setSessionCookie(response: Response, rawToken: string, expiresAt: Date): Response {
  response.headers.append("Set-Cookie", `${sessionCookieName}=${encodeURIComponent(rawToken)}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}${isProduction ? "; Secure" : ""}`);
  return response;
}

export function requestContextFor(context: RequestContext, authenticated: AuthenticatedSessionDto): RequestContext {
  const authenticatedContext = withAuthenticatedActor(context, createAuthenticatedActor({ kind: "user", userId: authenticated.account.id, sessionId: authenticated.session.id, organizationId: authenticated.account.organizationId, organizationUnitId: authenticated.account.primaryOrgUnitId }));
  if (authenticatedContext.actor.kind !== "user") throw new Error("Authenticated identity did not create a user actor.");
  return authenticatedContext;
}

export function withRequestId(response: Response, context: RequestContext): Response {
  response.headers.set("X-Request-Id", context.requestId);
  return response;
}

export function rawTokenFrom(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${sessionCookieName}=`));
  if (match === undefined) return null;
  try { return decodeURIComponent(match.slice(sessionCookieName.length + 1)); } catch { return null; }
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try { body = await request.json(); } catch (cause) { throw new AppError({ code: "PLATFORM.VALIDATION_FAILED", httpStatus: 400, internalMessage: "INVALID_JSON_BODY", publicMessage: "请求格式无效。", cause }); }
  if (typeof body !== "object" || body === null || Array.isArray(body)) throw new AppError({ code: "PLATFORM.VALIDATION_FAILED", httpStatus: 400, internalMessage: "INVALID_JSON_BODY", publicMessage: "请求格式无效。" });
  return body as Record<string, unknown>;
}

export function assertOnlyKeys(body: Record<string, unknown>, allowed: readonly string[]): void {
  if (Object.keys(body).some((key) => !allowed.includes(key))) throw new AppError({ code: "PLATFORM.VALIDATION_FAILED", httpStatus: 400, internalMessage: "UNEXPECTED_REQUEST_FIELD", publicMessage: "请求字段无效。" });
}

export async function authenticateRequest(request: Request, baseContext: RequestContext = createRequestContext()): Promise<{ readonly context: RequestContext; readonly rawToken: string }> {
  const rawToken = rawTokenFrom(request) ?? "";
  const authenticated = await createIdentitySessionService().validateSession(rawToken);
  return { context: requestContextFor(baseContext, authenticated), rawToken };
}

export async function requirePlatformPermission(context: RequestContext, permission: PermissionDefinition): Promise<void> {
  if (context.actor.kind !== "user") throw new AppError({ code: "AUTH.AUTHENTICATION_REQUIRED", httpStatus: 401, internalMessage: "AUTHENTICATION_REQUIRED", publicMessage: "需要认证。" });
  await createAuthorizationService().requireAuthorization({ context, permission, target: { organizationId: context.actor.organizationId } });
}
