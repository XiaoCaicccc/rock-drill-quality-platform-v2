import { createIdentitySessionService } from "@/platform/identity-session";
import { createRequestContext } from "@/platform/request-context";
import { clearSessionCookie, errorResponse, rawTokenFrom } from "../_shared";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const context = createRequestContext();
  try {
    await createIdentitySessionService().logout(rawTokenFrom(request));
    return clearSessionCookie(Response.json({ ok: true }, { status: 200 }));
  } catch (error) {
    return errorResponse(error, context.requestId);
  }
}
