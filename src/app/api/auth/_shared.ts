import { createAuthenticatedActor, withAuthenticatedActor } from "@/platform/request-context";
import { AppError, toErrorResponse } from "@/platform/errors";
import type { AuthenticatedSessionDto } from "@/platform/identity-session";
import type { RequestContext } from "@/platform/request-context";

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
