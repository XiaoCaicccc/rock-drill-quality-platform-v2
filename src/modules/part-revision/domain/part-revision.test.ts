import { describe, expect, it } from "vitest";
import { normalizeChangeSummary, normalizeOverrideCreatorReview, normalizeOverrideReason, normalizeReviewComment } from "./part-revision";

describe("PartRevision domain validation", () => {
  it("trims and preserves valid Unicode change summaries without truncation", () => { expect(normalizeChangeSummary("  首次正式版本  ")).toBe("首次正式版本"); expect(() => normalizeChangeSummary(" ")).toThrow("CHANGE_SUMMARY_INVALID"); expect(() => normalizeChangeSummary("x".repeat(2001))).toThrow("CHANGE_SUMMARY_INVALID"); });
  it("requires a non-empty return comment while approve may omit it", () => { expect(normalizeReviewComment(undefined, false)).toBeNull(); expect(normalizeReviewComment("  ok ", false)).toBe("ok"); expect(() => normalizeReviewComment(" ", true)).toThrow("REVIEW_COMMENT_INVALID"); });
  it("requires an explicit 1-500-code-point override reason", () => { expect(normalizeOverrideReason("  紧急原因  ")).toBe("紧急原因"); expect(() => normalizeOverrideReason(" ")).toThrow("OVERRIDE_REASON_INVALID"); expect(() => normalizeOverrideReason("x".repeat(501))).toThrow("OVERRIDE_REASON_INVALID"); });
  it("accepts only a real boolean override flag", () => { expect(normalizeOverrideCreatorReview(undefined)).toBeUndefined(); expect(normalizeOverrideCreatorReview(true)).toBe(true); for (const value of ["true", 1, {}, null]) expect(() => normalizeOverrideCreatorReview(value)).toThrow("OVERRIDE_CREATOR_REVIEW_INVALID"); });
});
