import { platformManagementPermissions } from "@/platform/access-permissions";
import { createAuthorizationService, roleCodes, type RoleCode } from "@/platform/authorization";
import { createRequestContext } from "@/platform/request-context";
import { assertOnlyKeys, authenticateRequest, errorResponse, readJsonObject, requirePlatformPermission, withRequestId } from "../../../../auth/_shared";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ accountId: string }> }): Promise<Response> {
  const base = createRequestContext();
  try {
    const { context } = await authenticateRequest(request, base);
    await requirePlatformPermission(context, platformManagementPermissions.roleAssignmentView);
    const assignments = await createAuthorizationService().listManagedRoleAssignments({ context, accountId: (await params).accountId });
    return withRequestId(Response.json({ assignments }), context);
  } catch (error) { return errorResponse(error, base.requestId); }
}

export async function POST(request: Request, { params }: { params: Promise<{ accountId: string }> }): Promise<Response> {
  const base = createRequestContext();
  try {
    const { context } = await authenticateRequest(request, base);
    await requirePlatformPermission(context, platformManagementPermissions.roleAssignmentManage);
    const body = await readJsonObject(request);
    assertOnlyKeys(body, ["role", "scopeOrgUnitId"]);
    const role = typeof body.role === "string" && roleCodes.includes(body.role as RoleCode) ? body.role as RoleCode : "" as RoleCode;
    const assignment = await createAuthorizationService().assignManagedRole({ context, accountId: (await params).accountId, role, scopeOrgUnitId: typeof body.scopeOrgUnitId === "string" ? body.scopeOrgUnitId : "" });
    return withRequestId(Response.json({ assignment }, { status: 201 }), context);
  } catch (error) { return errorResponse(error, base.requestId); }
}
