import { platformManagementPermissions } from "@/platform/access-permissions";
import { createOrganizationService } from "@/platform/organization";
import { createRequestContext } from "@/platform/request-context";
import { authenticateRequest, errorResponse, requirePlatformPermission, withRequestId } from "../../auth/_shared";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const base = createRequestContext();
  try {
    const { context } = await authenticateRequest(request, base);
    await requirePlatformPermission(context, platformManagementPermissions.organizationView);
    if (context.actor.kind !== "user") throw new Error("Authenticated actor required.");
    const orgUnits = await createOrganizationService().listOrgUnits({ organizationId: context.actor.organizationId, activeOnly: new URL(request.url).searchParams.get("activeOnly") === "true" });
    return withRequestId(Response.json({ orgUnits }), context);
  } catch (error) { return errorResponse(error, base.requestId); }
}
