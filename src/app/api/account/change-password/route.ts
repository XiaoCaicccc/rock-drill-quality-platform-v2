import { createIdentitySessionService } from "@/platform/identity-session";
import { createRequestContext } from "@/platform/request-context";
import { assertOnlyKeys, authenticateRequest, errorResponse, readJsonObject, withRequestId } from "../../auth/_shared";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const base = createRequestContext();
  try {
    const { context } = await authenticateRequest(request, base);
    const body = await readJsonObject(request);
    assertOnlyKeys(body, ["currentPassword", "newPassword"]);
    await createIdentitySessionService().changeOwnPassword({ context, currentPassword: typeof body.currentPassword === "string" ? body.currentPassword : "", newPassword: typeof body.newPassword === "string" ? body.newPassword : "" });
    return withRequestId(Response.json({ ok: true }), context);
  } catch (error) { return errorResponse(error, base.requestId); }
}
