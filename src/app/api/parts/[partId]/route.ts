import { createPartMasterService, partMasterPermissions } from "@/modules/part-master";
import { createRequestContext } from "@/platform/request-context";
import { assertOnlyKeys, authenticateRequest, errorResponse, readJsonObject, requireBusinessPermission, withRequestId } from "../../auth/_shared";

export const runtime = "nodejs";

function safePart(part: Record<string, unknown>) {
  const safe = { ...part };
  delete safe.organizationId;
  delete safe.normalizedDrawingNumber;
  delete safe.numberingSequence;
  return safe;
}

export async function GET(_request: Request, { params }: { params: Promise<{ partId: string }> }): Promise<Response> {
  const base = createRequestContext();
  try {
    const { context } = await authenticateRequest(_request, base);
    await requireBusinessPermission(context, partMasterPermissions.view);
    const { partId } = await params;
    const part = await createPartMasterService().get({ context, partId });
    return withRequestId(Response.json(safePart(part as unknown as Record<string, unknown>)), context);
  } catch (error) { return withRequestId(errorResponse(error, base.requestId), base); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ partId: string }> }): Promise<Response> {
  const base = createRequestContext();
  try {
    const { context } = await authenticateRequest(request, base);
    await requireBusinessPermission(context, partMasterPermissions.update);
    const { partId } = await params;
    const body = await readJsonObject(request);
    assertOnlyKeys(body, ["categoryId", "drawingNumber", "name", "description"]);
    const part = await createPartMasterService().update({ context, partId, ...(Object.prototype.hasOwnProperty.call(body, "categoryId") ? { categoryId: body.categoryId as string } : {}), ...(Object.prototype.hasOwnProperty.call(body, "drawingNumber") ? { drawingNumber: body.drawingNumber as string | null } : {}), ...(Object.prototype.hasOwnProperty.call(body, "name") ? { name: body.name as string } : {}), ...(Object.prototype.hasOwnProperty.call(body, "description") ? { description: body.description as string | null } : {}) });
    return withRequestId(Response.json(safePart(part as unknown as Record<string, unknown>)), context);
  } catch (error) { return withRequestId(errorResponse(error, base.requestId), base); }
}
