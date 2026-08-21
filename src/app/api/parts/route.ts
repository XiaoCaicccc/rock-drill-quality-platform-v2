import { createPartMasterService, isUuid, partMasterError, partMasterPermissions, type PartMasterStatus } from "@/modules/part-master";
import { createRequestContext } from "@/platform/request-context";
import { assertOnlyKeys, authenticateRequest, errorResponse, readJsonObject, requireBusinessPermission, withRequestId } from "../auth/_shared";

export const runtime = "nodejs";

function safePart(part: Record<string, unknown>) {
  const safe = { ...part };
  delete safe.organizationId;
  delete safe.normalizedDrawingNumber;
  delete safe.numberingSequence;
  return safe;
}

function numberParam(value: string | null): number | undefined { return value === null ? undefined : Number(value); }

export async function GET(request: Request): Promise<Response> {
  const base = createRequestContext();
  try {
    const { context } = await authenticateRequest(request, base);
    await requireBusinessPermission(context, partMasterPermissions.view);
    const query = new URL(request.url).searchParams;
    const categoryId = query.get("categoryId");
    if (categoryId !== null && !isUuid(categoryId)) throw partMasterError("INVALID_PART_INPUT");
    const status = query.get("status") as PartMasterStatus | null;
    const page = await createPartMasterService().list({ context, ...(query.get("search") === null ? {} : { search: query.get("search")! }), ...(categoryId === null ? {} : { categoryId }), ...(status === null ? {} : { status }), page: numberParam(query.get("page")), pageSize: numberParam(query.get("pageSize")) });
    return withRequestId(Response.json({ ...page, items: page.items.map((item) => safePart(item as unknown as Record<string, unknown>)) }), context);
  } catch (error) { return withRequestId(errorResponse(error, base.requestId), base); }
}

export async function POST(request: Request): Promise<Response> {
  const base = createRequestContext();
  try {
    const { context } = await authenticateRequest(request, base);
    await requireBusinessPermission(context, partMasterPermissions.create);
    const body = await readJsonObject(request);
    assertOnlyKeys(body, ["categoryId", "drawingNumber", "name", "description"]);
    const part = await createPartMasterService().create({ context, categoryId: body.categoryId as string, drawingNumber: body.drawingNumber as string | null | undefined, name: body.name as string, description: body.description as string | null | undefined });
    return withRequestId(Response.json(safePart(part as unknown as Record<string, unknown>), { status: 201 }), context);
  } catch (error) { return withRequestId(errorResponse(error, base.requestId), base); }
}
