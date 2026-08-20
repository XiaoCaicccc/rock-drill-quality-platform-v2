import { platformManagementPermissions } from "@/platform/access-permissions";
import { createIdentitySessionService, type AccountStatus } from "@/platform/identity-session";
import { createRequestContext } from "@/platform/request-context";
import { assertOnlyKeys, authenticateRequest, errorResponse, readJsonObject, requirePlatformPermission, withRequestId } from "../../../../auth/_shared";

export const runtime = "nodejs";
const statuses = new Set<AccountStatus>(["ACTIVE", "INACTIVE", "LOCKED"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ accountId: string }> }): Promise<Response> {
  const base = createRequestContext();
  try {
    const { context } = await authenticateRequest(request, base);
    await requirePlatformPermission(context, platformManagementPermissions.accountSetStatus);
    const body = await readJsonObject(request);
    assertOnlyKeys(body, ["status"]);
    const status = typeof body.status === "string" && statuses.has(body.status as AccountStatus) ? body.status as AccountStatus : "" as AccountStatus;
    const account = await createIdentitySessionService().setManagedAccountStatus({ context, accountId: (await params).accountId, status });
    return withRequestId(Response.json({ account }), context);
  } catch (error) { return errorResponse(error, base.requestId); }
}
