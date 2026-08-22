import type { RequestContext } from "@/platform/request-context";

export const partRevisionStatuses = ["DRAFT", "REVIEWING", "RETURNED", "APPROVED", "RELEASED"] as const;
export type PartRevisionStatus = (typeof partRevisionStatuses)[number];
export type PartRevisionReviewDecision = "RETURNED" | "APPROVED";

export interface AccountReference { readonly id: string; readonly username: string; readonly displayName: string; }
export interface PartReference { readonly id: string; readonly partNumber: string; readonly drawingNumber: string | null; readonly name: string; }
export interface PartRevisionDto { readonly id: string; readonly revisionNo: number; readonly status: PartRevisionStatus; readonly changeSummary: string; readonly part: PartReference; readonly createdBy: AccountReference; readonly createdAt: Date; readonly updatedAt: Date; readonly lastSubmittedAt: Date | null; readonly releasedBy: AccountReference | null; readonly releasedAt: Date | null; }
export interface PartRevisionReviewDto { readonly id: string; readonly decision: PartRevisionReviewDecision; readonly reviewer: AccountReference; readonly comment: string | null; readonly creatorReviewOverride: boolean; readonly overrideReason: string | null; readonly decidedAt: Date; }
export interface PartRevisionPage { readonly items: readonly PartRevisionDto[]; readonly page: number; readonly pageSize: number; readonly total: number; }
export interface PartRevisionReviewPage { readonly items: readonly PartRevisionReviewDto[]; readonly page: number; readonly pageSize: number; readonly total: number; }
export interface CreatePartRevisionInput { readonly context: RequestContext; readonly partId: string; readonly changeSummary: string; }
export interface GetPartRevisionInput { readonly context: RequestContext; readonly revisionId: string; }
export interface ListPartRevisionsInput { readonly context: RequestContext; readonly partId: string; readonly status?: PartRevisionStatus; readonly page?: number; readonly pageSize?: number; }
export interface UpdatePartRevisionInput { readonly context: RequestContext; readonly revisionId: string; readonly changeSummary: string; }
export interface SubmitPartRevisionInput { readonly context: RequestContext; readonly revisionId: string; }
export interface DecidePartRevisionInput { readonly context: RequestContext; readonly revisionId: string; readonly comment?: unknown; readonly overrideCreatorReview?: unknown; readonly overrideReason?: unknown; }
export interface ReleasePartRevisionInput { readonly context: RequestContext; readonly revisionId: string; }
export interface ListPartRevisionReviewsInput { readonly context: RequestContext; readonly revisionId: string; readonly page?: number; readonly pageSize?: number; }
export interface PartRevisionService {
  create(input: CreatePartRevisionInput): Promise<PartRevisionDto>;
  get(input: GetPartRevisionInput): Promise<PartRevisionDto>;
  list(input: ListPartRevisionsInput): Promise<PartRevisionPage>;
  update(input: UpdatePartRevisionInput): Promise<PartRevisionDto>;
  submit(input: SubmitPartRevisionInput): Promise<PartRevisionDto>;
  returnForReview(input: DecidePartRevisionInput): Promise<PartRevisionDto>;
  approve(input: DecidePartRevisionInput): Promise<PartRevisionDto>;
  release(input: ReleasePartRevisionInput): Promise<PartRevisionDto>;
  listReviews(input: ListPartRevisionReviewsInput): Promise<PartRevisionReviewPage>;
}

export function isPartRevisionStatus(value: string): value is PartRevisionStatus { return (partRevisionStatuses as readonly string[]).includes(value); }
export function normalizeChangeSummary(value: unknown): string { if (typeof value !== "string") throw new TypeError("CHANGE_SUMMARY_INVALID"); const normalized = value.trim(); if (Array.from(normalized).length < 1 || Array.from(normalized).length > 2000) throw new TypeError("CHANGE_SUMMARY_INVALID"); return normalized; }
export function normalizeReviewComment(value: unknown, required: boolean): string | null { if (value === undefined || value === null) { if (required) throw new TypeError("REVIEW_COMMENT_REQUIRED"); return null; } if (typeof value !== "string") throw new TypeError("REVIEW_COMMENT_INVALID"); const normalized = value.trim(); if ((required && normalized.length === 0) || Array.from(normalized).length > 2000) throw new TypeError("REVIEW_COMMENT_INVALID"); return normalized.length === 0 ? null : normalized; }
export function normalizeOverrideReason(value: unknown): string { if (typeof value !== "string") throw new TypeError("OVERRIDE_REASON_INVALID"); const normalized = value.trim(); if (Array.from(normalized).length < 1 || Array.from(normalized).length > 500) throw new TypeError("OVERRIDE_REASON_INVALID"); return normalized; }
export function normalizeOverrideCreatorReview(value: unknown): boolean | undefined { if (value === undefined) return undefined; if (typeof value !== "boolean") throw new TypeError("OVERRIDE_CREATOR_REVIEW_INVALID"); return value; }
