import { platformManagementPermissions } from "@/platform/access-permissions";
import { createIdentitySessionService, type AccountStatus } from "@/platform/identity-session";
import { createRequestContext } from "@/platform/request-context";
import { assertOnlyKeys, authenticateRequest, errorResponse, readJsonObject, requirePlatformPermission, withRequestId } from "../../auth/_shared";

export const runtime = "nodejs";

function numberParam(value: string | null): number | undefined { return value === null ? undefined : Number(value); }

export async function GET(request: Request): Promise<Response> {
  const base = createRequestContext();
  try {
    const { context } = await authenticateRequest(request, base);
    await requirePlatformPermission(context, platformManagementPermissions.accountView);
    const query = new URL(request.url).searchParams;
    const statusText = query.get("status");
    const status = statusText ? statusText as AccountStatus : undefined;
    const page = await createIdentitySessionService().listManagedAccounts({ context, ...(query.get("search") ? { search: query.get("search")! } : {}), ...(status ? { status } : {}), ...(query.get("orgUnitId") ? { orgUnitId: query.get("orgUnitId")! } : {}), page: numberParam(query.get("page")), pageSize: numberParam(query.get("pageSize")) });
    return withRequestId(Response.json(page), context);
  } catch (error) { return errorResponse(error, base.requestId); }
}

export async function POST(request: Request): Promise<Response> {
  const base = createRequestContext();
  try {
    const { context } = await authenticateRequest(request, base);
    await requirePlatformPermission(context, platformManagementPermissions.accountCreate);
    const body = await readJsonObject(request);
    assertOnlyKeys(body, ["username", "displayName", "primaryOrgUnitId", "password"]);
    const account = await createIdentitySessionService().createManagedAccount({ context, username: typeof body.username === "string" ? body.username : "", displayName: typeof body.displayName === "string" ? body.displayName : "", primaryOrgUnitId: typeof body.primaryOrgUnitId === "string" ? body.primaryOrgUnitId : "", password: typeof body.password === "string" ? body.password : "" });
    return withRequestId(Response.json({ account }, { status: 201 }), context);
  } catch (error) { return errorResponse(error, base.requestId); }
}
