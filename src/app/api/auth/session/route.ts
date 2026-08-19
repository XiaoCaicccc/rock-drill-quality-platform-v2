import { createIdentitySessionService } from "@/platform/identity-session";
import { createRequestContext } from "@/platform/request-context";
import { errorResponse, rawTokenFrom, requestContextFor, withRequestId } from "../_shared";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const context = createRequestContext();
  try {
    const authenticated = await createIdentitySessionService().validateSession(rawTokenFrom(request) ?? "");
    const authenticatedContext = requestContextFor(context, authenticated);
    return withRequestId(Response.json({ account: authenticated.account, session: authenticated.session }, { status: 200 }), authenticatedContext);
  } catch (error) {
    return errorResponse(error, context.requestId);
  }
}
