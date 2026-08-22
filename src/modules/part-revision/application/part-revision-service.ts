import type { AuthorizationService } from "@/platform/authorization";
import { AppError } from "@/platform/errors";

import { partRevisionError } from "./errors";
import { partRevisionPermissions, partRevisionPermissionWithoutCreatorReview } from "./permissions";
import type { PartRevisionTransactionBoundary } from "./part-revision-transaction-boundary";
import { normalizeChangeSummary, normalizeOverrideCreatorReview, normalizeOverrideReason, normalizeReviewComment, type DecidePartRevisionInput, type PartRevisionService } from "../domain/part-revision";

type Authorization = Pick<AuthorizationService, "evaluateAuthorization" | "requireAuthorization">;

async function authorizeDecision(authorization: Authorization, input: DecidePartRevisionInput, createdByAccountId: string, override: boolean, decision: "RETURNED" | "APPROVED") {
  if (input.context.actor.kind !== "user") throw new AppError({ code: "AUTH.AUTHENTICATION_REQUIRED", httpStatus: 401, internalMessage: "AUTHENTICATION_REQUIRED", publicMessage: "需要认证。" });
  const target = { organizationId: input.context.actor.organizationId, createdByAccountId };
  const permission = decision === "RETURNED" ? partRevisionPermissions.return : partRevisionPermissions.approve;
  const result = await authorization.evaluateAuthorization({ context: input.context, permission, target });
  if (result.allowed) return;
  if (result.reason === "CREATOR_REVIEW_FORBIDDEN") {
    if (!override) throw partRevisionError("PART_REVISION_CREATOR_REVIEW_FORBIDDEN");
    await authorization.requireAuthorization({ context: input.context, permission: partRevisionPermissions.reviewOverride, target });
    return;
  }
  await authorization.requireAuthorization({ context: input.context, permission, target });
}

async function requireDecisionBusinessGrant(authorization: Authorization, input: DecidePartRevisionInput, decision: "RETURNED" | "APPROVED") {
  if (input.context.actor.kind !== "user") throw new AppError({ code: "AUTH.AUTHENTICATION_REQUIRED", httpStatus: 401, internalMessage: "AUTHENTICATION_REQUIRED", publicMessage: "需要认证。" });
  const permission = decision === "RETURNED" ? partRevisionPermissionWithoutCreatorReview.return : partRevisionPermissionWithoutCreatorReview.approve;
  await authorization.requireAuthorization({ context: input.context, permission, target: { organizationId: input.context.actor.organizationId } });
}

export function createPartRevisionService(boundary: PartRevisionTransactionBoundary, authorization: Authorization): PartRevisionService {
  async function decide(input: DecidePartRevisionInput, decision: "RETURNED" | "APPROVED") {
    let comment: string | null; let override: boolean | undefined;
    try { comment = normalizeReviewComment(input.comment, decision === "RETURNED"); override = normalizeOverrideCreatorReview(input.overrideCreatorReview); } catch (cause) { throw partRevisionError("INVALID_PART_REVISION_INPUT", cause); }
    if (override !== true && input.overrideReason !== undefined) throw partRevisionError("INVALID_PART_REVISION_INPUT");
    await requireDecisionBusinessGrant(authorization, input, decision);
    const target = await boundary.getReviewTarget(input.context, input.revisionId);
    const creatorCollision = input.context.actor.kind === "user" && target.createdByAccountId === input.context.actor.userId;
    if (override === true && !creatorCollision) throw partRevisionError("PART_REVISION_OVERRIDE_NOT_APPLICABLE");
    let overrideReason: string | null = null;
    if (override === true) { try { overrideReason = normalizeOverrideReason(input.overrideReason); } catch (cause) { throw partRevisionError("INVALID_PART_REVISION_INPUT", cause); } }
    await authorizeDecision(authorization, input, target.createdByAccountId, override === true, decision);
    return boundary.decide({ context: input.context, revisionId: input.revisionId, decision, comment, creatorReviewOverride: override === true, overrideReason });
  }
  return {
    async create(input) { try { return await boundary.create({ ...input, changeSummary: normalizeChangeSummary(input.changeSummary) }); } catch (cause) { if (cause instanceof TypeError) throw partRevisionError("INVALID_PART_REVISION_INPUT", cause); throw cause; } },
    get: (input) => boundary.get(input),
    list: (input) => boundary.list(input),
    async update(input) { try { return await boundary.update({ ...input, changeSummary: normalizeChangeSummary(input.changeSummary) }); } catch (cause) { if (cause instanceof TypeError) throw partRevisionError("INVALID_PART_REVISION_INPUT", cause); throw cause; } },
    submit: (input) => boundary.submit(input),
    returnForReview: (input) => decide(input, "RETURNED"),
    approve: (input) => decide(input, "APPROVED"),
    release: (input) => boundary.release(input),
    listReviews: (input) => boundary.listReviews(input),
  };
}
