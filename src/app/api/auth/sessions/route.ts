import { createIdentitySessionService } from "@/platform/identity-session";
import { createRequestContext } from "@/platform/request-context";
import { errorResponse, rawTokenFrom, requestContextFor, withRequestId } from "../_shared";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const context = createRequestContext();
  try {
    const rawToken = rawTokenFrom(request) ?? "";
    const service = createIdentitySessionService();
    const authenticated = await service.validateSession(rawToken);
    const authenticatedContext = requestContextFor(context, authenticated);
    const sessions = await service.listOwnSessions(rawToken);
    return withRequestId(Response.json({ sessions }, { status: 200 }), authenticatedContext);
  } catch (error) {
    return errorResponse(error, context.requestId);
  }
}
