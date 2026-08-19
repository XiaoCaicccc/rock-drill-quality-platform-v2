import { createIdentitySessionService } from "@/platform/identity-session";
import { createRequestContext } from "@/platform/request-context";
import { clearSessionCookie, errorResponse, rawTokenFrom, requestContextFor, withRequestId } from "../../_shared";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: Promise<{ sessionId: string }> }): Promise<Response> {
  const context = createRequestContext();
  try {
    const rawToken = rawTokenFrom(request) ?? "";
    const service = createIdentitySessionService();
    const authenticated = await service.validateSession(rawToken);
    const authenticatedContext = requestContextFor(context, authenticated);
    const { sessionId } = await params;
    const result = await service.revokeOwnSession({ rawToken, sessionId });
    const response = withRequestId(Response.json({ ok: true }, { status: 200 }), authenticatedContext);
    return result.current ? clearSessionCookie(response) : response;
  } catch (error) {
    return errorResponse(error, context.requestId);
  }
}
