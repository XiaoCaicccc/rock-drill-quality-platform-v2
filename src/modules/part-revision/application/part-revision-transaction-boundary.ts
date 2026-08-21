import type { RequestContext } from "@/platform/request-context";

import type { CreatePartRevisionInput, GetPartRevisionInput, ListPartRevisionReviewsInput, ListPartRevisionsInput, PartRevisionDto, PartRevisionPage, PartRevisionReviewPage, ReleasePartRevisionInput, SubmitPartRevisionInput, UpdatePartRevisionInput } from "../domain/part-revision";

export interface PartRevisionReviewTarget {
  readonly createdByAccountId: string;
}

export interface PersistDecisionInput {
  readonly context: RequestContext;
  readonly revisionId: string;
  readonly decision: "RETURNED" | "APPROVED";
  readonly comment: string | null;
  readonly creatorReviewOverride: boolean;
  readonly overrideReason: string | null;
}

/** Slice 2B-only cross-Aggregate transaction boundary; never a generic UnitOfWork. */
export interface PartRevisionTransactionBoundary {
  create(input: CreatePartRevisionInput): Promise<PartRevisionDto>;
  get(input: GetPartRevisionInput): Promise<PartRevisionDto>;
  list(input: ListPartRevisionsInput): Promise<PartRevisionPage>;
  update(input: UpdatePartRevisionInput): Promise<PartRevisionDto>;
  submit(input: SubmitPartRevisionInput): Promise<PartRevisionDto>;
  getReviewTarget(context: RequestContext, revisionId: string): Promise<PartRevisionReviewTarget>;
  decide(input: PersistDecisionInput): Promise<PartRevisionDto>;
  release(input: ReleasePartRevisionInput): Promise<PartRevisionDto>;
  listReviews(input: ListPartRevisionReviewsInput): Promise<PartRevisionReviewPage>;
}
