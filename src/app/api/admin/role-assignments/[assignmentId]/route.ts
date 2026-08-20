import { platformManagementPermissions } from "@/platform/access-permissions";
import { createAuthorizationService } from "@/platform/authorization";
import { createRequestContext } from "@/platform/request-context";
import { authenticateRequest, errorResponse, requirePlatformPermission, withRequestId } from "../../../auth/_shared";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: Promise<{ assignmentId: string }> }): Promise<Response> {
  const base = createRequestContext();
  try {
    const { context } = await authenticateRequest(request, base);
    await requirePlatformPermission(context, platformManagementPermissions.roleAssignmentManage);
    await createAuthorizationService().revokeManagedRole({ context, assignmentId: (await params).assignmentId });
    return withRequestId(Response.json({ ok: true }), context);
  } catch (error) { return errorResponse(error, base.requestId); }
}
