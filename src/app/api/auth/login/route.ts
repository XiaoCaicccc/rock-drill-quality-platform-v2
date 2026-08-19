import { createIdentitySessionService } from "@/platform/identity-session";
import { createRequestContext } from "@/platform/request-context";
import { errorResponse, readJsonObject, requestContextFor, setSessionCookie, withRequestId } from "../_shared";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const context = createRequestContext();
  try {
    const body = await readJsonObject(request);
    const result = await createIdentitySessionService().authenticate({ username: typeof body.username === "string" ? body.username : "", password: typeof body.password === "string" ? body.password : "", userAgent: request.headers.get("user-agent") });
    const authenticatedContext = requestContextFor(context, result);
    const response = withRequestId(Response.json({ account: result.account, session: result.session }, { status: 200 }), authenticatedContext);
    return setSessionCookie(response, result.rawToken, result.session.expiresAt);
  } catch (error) {
    return errorResponse(error, context.requestId);
  }
}
