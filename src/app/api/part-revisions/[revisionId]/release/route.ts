import { createPartRevisionService, partRevisionPermissions } from "@/modules/part-revision";
import { createRequestContext } from "@/platform/request-context";
import { assertOnlyKeys, authenticateRequest, errorResponse, readOptionalJsonObject, requireBusinessPermission, withRequestId } from "../../../auth/_shared";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ revisionId: string }> }) { const base = createRequestContext(); try { const { context } = await authenticateRequest(request, base); await requireBusinessPermission(context, partRevisionPermissions.release); const body = await readOptionalJsonObject(request); assertOnlyKeys(body, []); const { revisionId } = await params; return withRequestId(Response.json(await createPartRevisionService().release({ context, revisionId })), context); } catch (error) { return withRequestId(errorResponse(error, base.requestId), base); } }
