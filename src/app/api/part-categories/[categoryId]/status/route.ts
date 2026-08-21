import { createPartCategoryService, partCategoryPermissions, type PartCategoryStatus } from "@/modules/part-category";
import { createRequestContext } from "@/platform/request-context";
import { assertOnlyKeys, authenticateRequest, errorResponse, readJsonObject, requireBusinessPermission, withRequestId } from "../../../auth/_shared";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ categoryId: string }> }): Promise<Response> {
  const base = createRequestContext();
  try {
    const { context } = await authenticateRequest(request, base);
    await requireBusinessPermission(context, partCategoryPermissions.setStatus);
    const { categoryId } = await params;
    const body = await readJsonObject(request);
    assertOnlyKeys(body, ["status"]);
    const category = await createPartCategoryService().setStatus({ context, categoryId, status: body.status as PartCategoryStatus });
    return withRequestId(Response.json(category), context);
  } catch (error) { return withRequestId(errorResponse(error, base.requestId), base); }
}
