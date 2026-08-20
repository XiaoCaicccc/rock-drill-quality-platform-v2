import { platformManagementPermissions } from "@/platform/access-permissions";
import { createAuditQueryService } from "@/platform/audit";
import { createRequestContext } from "@/platform/request-context";
import { parseInstant } from "@/platform/time";
import { authenticateRequest, errorResponse, requirePlatformPermission, withRequestId } from "../../auth/_shared";

export const runtime = "nodejs";

function integer(value: string | null): number | undefined { return value === null ? undefined : Number(value); }
function date(value: string | null): Date | undefined {
  if (value === null) return undefined;
  try { return new Date(parseInstant(value)); } catch { return new Date(Number.NaN); }
}

export async function GET(request: Request): Promise<Response> {
  const base = createRequestContext();
  try {
    const { context } = await authenticateRequest(request, base);
    await requirePlatformPermission(context, platformManagementPermissions.auditView);
    if (context.actor.kind !== "user") throw new Error("Authenticated actor required.");
    const query = new URL(request.url).searchParams;
    const result = await createAuditQueryService().query({ context, ...(query.get("action") ? { action: query.get("action")! } : {}), ...(query.get("actorAccountId") ? { actorAccountId: query.get("actorAccountId")! } : {}), ...(query.get("targetType") ? { targetType: query.get("targetType")! } : {}), ...(query.get("targetId") ? { targetId: query.get("targetId")! } : {}), ...(query.get("from") ? { from: date(query.get("from"))! } : {}), ...(query.get("to") ? { to: date(query.get("to"))! } : {}), page: integer(query.get("page")), pageSize: integer(query.get("pageSize")) });
    return withRequestId(Response.json(result), context);
  } catch (error) { return errorResponse(error, base.requestId); }
}
