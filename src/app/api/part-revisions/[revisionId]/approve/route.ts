import { createPartRevisionService } from "@/modules/part-revision";
import { createRequestContext } from "@/platform/request-context";
import { assertOnlyKeys, authenticateRequest, errorResponse, readJsonObject, withRequestId } from "../../../auth/_shared";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ revisionId: string }> }) { const base = createRequestContext(); try { const { context } = await authenticateRequest(request, base); const body = await readJsonObject(request); assertOnlyKeys(body, ["comment", "overrideCreatorReview", "overrideReason"]); const { revisionId } = await params; return withRequestId(Response.json(await createPartRevisionService().approve({ context, revisionId, comment: body.comment as string | undefined, overrideCreatorReview: body.overrideCreatorReview, overrideReason: body.overrideReason })), context); } catch (error) { return withRequestId(errorResponse(error, base.requestId), base); } }
