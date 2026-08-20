import { platformManagementPermissions } from "@/platform/access-permissions";
import { createIdentitySessionService } from "@/platform/identity-session";
import { createRequestContext } from "@/platform/request-context";
import { assertOnlyKeys, authenticateRequest, errorResponse, readJsonObject, requirePlatformPermission, withRequestId } from "../../../../auth/_shared";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ accountId: string }> }): Promise<Response> {
  const base = createRequestContext();
  try {
    const { context } = await authenticateRequest(request, base);
    await requirePlatformPermission(context, platformManagementPermissions.accountResetPassword);
    const body = await readJsonObject(request);
    assertOnlyKeys(body, ["newPassword"]);
    await createIdentitySessionService().resetManagedPassword({ context, accountId: (await params).accountId, newPassword: typeof body.newPassword === "string" ? body.newPassword : "" });
    return withRequestId(Response.json({ ok: true }), context);
  } catch (error) { return errorResponse(error, base.requestId); }
}
