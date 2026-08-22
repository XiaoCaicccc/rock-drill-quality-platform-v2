import { describe, expect, it, vi } from "vitest";

import { createAuthenticatedActor, createRequestContext } from "@/platform/request-context";

import { createPartRevisionService } from "./part-revision-service";
import type { PartRevisionTransactionBoundary } from "./part-revision-transaction-boundary";

const actorId = "11111111-1111-4111-8111-111111111111";
const context = createRequestContext({ actor: createAuthenticatedActor({ kind: "user", userId: actorId, sessionId: "22222222-2222-4222-8222-222222222222", organizationId: "33333333-3333-4333-8333-333333333333", organizationUnitId: "44444444-4444-4444-8444-444444444444" }) });
const revisionId = "66666666-6666-4666-8666-666666666666";

function setup() {
  const boundary = { getReviewTarget: vi.fn().mockResolvedValue({ createdByAccountId: actorId }), decide: vi.fn().mockResolvedValue({ id: revisionId }) } as unknown as PartRevisionTransactionBoundary;
  const authorization = { evaluateAuthorization: vi.fn(), requireAuthorization: vi.fn().mockResolvedValue(undefined) };
  return { boundary, authorization, service: createPartRevisionService(boundary, authorization) };
}

describe("PartRevision application authorization", () => {
  it("rejects a caller without a review business grant before reading the Review target", async () => {
    const { boundary, authorization, service } = setup();
    authorization.requireAuthorization.mockRejectedValueOnce(new Error("AUTH.PERMISSION_DENIED"));
    await expect(service.approve({ context, revisionId })).rejects.toThrow("AUTH.PERMISSION_DENIED");
    expect(boundary.getReviewTarget).not.toHaveBeenCalled();
  });

  it("permits a non-creator through the ordinary typed action", async () => {
    const { boundary, authorization, service } = setup();
    boundary.getReviewTarget = vi.fn().mockResolvedValue({ createdByAccountId: "55555555-5555-4555-8555-555555555555" });
    authorization.evaluateAuthorization.mockResolvedValue({ allowed: true, reason: "ALLOWED" });
    await expect(service.approve({ context, revisionId })).resolves.toEqual({ id: revisionId });
    expect(boundary.decide).toHaveBeenCalledWith(expect.objectContaining({ decision: "APPROVED", creatorReviewOverride: false }));
  });

  it("denies an ordinary creator review without an override", async () => {
    const { boundary, authorization, service } = setup();
    authorization.evaluateAuthorization.mockResolvedValue({ allowed: false, reason: "CREATOR_REVIEW_FORBIDDEN" });
    await expect(service.approve({ context, revisionId })).rejects.toMatchObject({ internalMessage: "PART_REVISION_CREATOR_REVIEW_FORBIDDEN" });
    expect(boundary.decide).not.toHaveBeenCalled();
  });

  it("allows a creator override only after original permission and override capability pass", async () => {
    const { boundary, authorization, service } = setup();
    authorization.evaluateAuthorization.mockResolvedValue({ allowed: false, reason: "CREATOR_REVIEW_FORBIDDEN" });
    await expect(service.approve({ context, revisionId, overrideCreatorReview: true, overrideReason: "Emergency coverage" })).resolves.toEqual({ id: revisionId });
    expect(authorization.requireAuthorization).toHaveBeenCalledTimes(2);
    expect(boundary.decide).toHaveBeenCalledWith(expect.objectContaining({ creatorReviewOverride: true, overrideReason: "Emergency coverage" }));
  });

  it("does not let review_override replace the original business permission", async () => {
    const { authorization, service } = setup();
    authorization.evaluateAuthorization.mockResolvedValue({ allowed: false, reason: "CREATOR_REVIEW_FORBIDDEN" });
    authorization.requireAuthorization.mockRejectedValueOnce(new Error("PERMISSION_DENIED"));
    await expect(service.returnForReview({ context, revisionId, comment: "reason", overrideCreatorReview: true, overrideReason: "Emergency coverage" })).rejects.toThrow("PERMISSION_DENIED");
    expect(authorization.requireAuthorization).toHaveBeenCalledTimes(1);
  });

  it("rejects a noncreator override before authorization or persistence", async () => {
    const { boundary, authorization, service } = setup();
    boundary.getReviewTarget = vi.fn().mockResolvedValue({ createdByAccountId: "55555555-5555-4555-8555-555555555555" });
    await expect(service.approve({ context, revisionId, overrideCreatorReview: true, overrideReason: "Emergency coverage" })).rejects.toMatchObject({ internalMessage: "PART_REVISION_OVERRIDE_NOT_APPLICABLE" });
    expect(authorization.evaluateAuthorization).not.toHaveBeenCalled();
  });

  it.each([undefined, "   ", "x".repeat(501)])("reports invalid override reason %j as a validation error", async (overrideReason) => {
    const { service } = setup();
    await expect(service.approve({ context, revisionId, overrideCreatorReview: true, overrideReason })).rejects.toMatchObject({ code: "PLATFORM.VALIDATION_FAILED", httpStatus: 400 });
  });

  it("rejects a non-boolean override before persistence", async () => {
    const { service } = setup();
    await expect(service.approve({ context, revisionId, overrideCreatorReview: "true" })).rejects.toMatchObject({ internalMessage: "INVALID_PART_REVISION_INPUT" });
  });
});
