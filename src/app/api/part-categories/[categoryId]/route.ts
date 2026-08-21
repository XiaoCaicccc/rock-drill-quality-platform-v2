import { createPartCategoryService, partCategoryPermissions } from "@/modules/part-category";
import { createRequestContext } from "@/platform/request-context";
import { assertOnlyKeys, authenticateRequest, errorResponse, readJsonObject, requireBusinessPermission, withRequestId } from "../../auth/_shared";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ categoryId: string }> }): Promise<Response> {
  const base = createRequestContext();
  try {
    const { context } = await authenticateRequest(request, base);
    await requireBusinessPermission(context, partCategoryPermissions.update);
    const { categoryId } = await params;
    const body = await readJsonObject(request);
    assertOnlyKeys(body, ["name", "description"]);
    const category = await createPartCategoryService().update({ context, categoryId, ...(Object.prototype.hasOwnProperty.call(body, "name") ? { name: body.name as string } : {}), ...(Object.prototype.hasOwnProperty.call(body, "description") ? { description: body.description as string | null } : {}) });
    return withRequestId(Response.json(category), context);
  } catch (error) { return withRequestId(errorResponse(error, base.requestId), base); }
}
