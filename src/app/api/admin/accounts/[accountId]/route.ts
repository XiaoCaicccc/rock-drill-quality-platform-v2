import { platformManagementPermissions } from "@/platform/access-permissions";
import { createIdentitySessionService } from "@/platform/identity-session";
import { createRequestContext } from "@/platform/request-context";
import { assertOnlyKeys, authenticateRequest, errorResponse, readJsonObject, requirePlatformPermission, withRequestId } from "../../../auth/_shared";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ accountId: string }> }): Promise<Response> {
  const base = createRequestContext();
  try {
    const { context } = await authenticateRequest(request, base);
    await requirePlatformPermission(context, platformManagementPermissions.accountView);
    const account = await createIdentitySessionService().getManagedAccount({ context, accountId: (await params).accountId });
    return withRequestId(Response.json({ account }), context);
  } catch (error) { return errorResponse(error, base.requestId); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ accountId: string }> }): Promise<Response> {
  const base = createRequestContext();
  try {
    const { context } = await authenticateRequest(request, base);
    await requirePlatformPermission(context, platformManagementPermissions.accountUpdate);
    const body = await readJsonObject(request);
    assertOnlyKeys(body, ["displayName", "primaryOrgUnitId"]);
    const account = await createIdentitySessionService().updateManagedAccount({ context, accountId: (await params).accountId, ...(typeof body.displayName === "string" ? { displayName: body.displayName } : {}), ...(typeof body.primaryOrgUnitId === "string" ? { primaryOrgUnitId: body.primaryOrgUnitId } : {}) });
    return withRequestId(Response.json({ account }), context);
  } catch (error) { return errorResponse(error, base.requestId); }
}
