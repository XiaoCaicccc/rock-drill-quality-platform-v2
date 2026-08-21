import { createPartMasterService, partMasterPermissions, type PartMasterStatus } from "@/modules/part-master";
import { createRequestContext } from "@/platform/request-context";
import { assertOnlyKeys, authenticateRequest, errorResponse, readJsonObject, requireBusinessPermission, withRequestId } from "../../../auth/_shared";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ partId: string }> }): Promise<Response> {
  const base = createRequestContext();
  try {
    const { context } = await authenticateRequest(request, base);
    await requireBusinessPermission(context, partMasterPermissions.setStatus);
    const { partId } = await params;
    const body = await readJsonObject(request);
    assertOnlyKeys(body, ["status"]);
    const part = await createPartMasterService().setStatus({ context, partId, status: body.status as PartMasterStatus });
    return withRequestId(Response.json(part), context);
  } catch (error) { return withRequestId(errorResponse(error, base.requestId), base); }
}
