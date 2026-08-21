import { createPartCategoryService, partCategoryPermissions, type PartCategoryStatus } from "@/modules/part-category";
import { createRequestContext } from "@/platform/request-context";
import { assertOnlyKeys, authenticateRequest, errorResponse, readJsonObject, requireBusinessPermission, withRequestId } from "../auth/_shared";

export const runtime = "nodejs";

function numberParam(value: string | null): number | undefined { return value === null ? undefined : Number(value); }

export async function GET(request: Request): Promise<Response> {
  const base = createRequestContext();
  try {
    const { context } = await authenticateRequest(request, base);
    await requireBusinessPermission(context, partCategoryPermissions.view);
    const query = new URL(request.url).searchParams;
    const status = query.get("status") as PartCategoryStatus | null;
    const page = await createPartCategoryService().list({ context, ...(query.get("search") === null ? {} : { search: query.get("search")! }), ...(status === null ? {} : { status }), page: numberParam(query.get("page")), pageSize: numberParam(query.get("pageSize")) });
    return withRequestId(Response.json(page), context);
  } catch (error) { return withRequestId(errorResponse(error, base.requestId), base); }
}

export async function POST(request: Request): Promise<Response> {
  const base = createRequestContext();
  try {
    const { context } = await authenticateRequest(request, base);
    await requireBusinessPermission(context, partCategoryPermissions.create);
    const body = await readJsonObject(request);
    assertOnlyKeys(body, ["name", "description"]);
    const category = await createPartCategoryService().create({ context, name: body.name as string, description: body.description as string | null | undefined });
    return withRequestId(Response.json(category, { status: 201 }), context);
  } catch (error) { return withRequestId(errorResponse(error, base.requestId), base); }
}
