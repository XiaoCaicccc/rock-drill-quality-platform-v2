import { definePermission } from "@/platform/authorization";

export const partRevisionPermissions = Object.freeze({
  view: definePermission({ code: "part_revision.view", grants: [{ role: "ENGINEER", dataScope: "ALL" }, { role: "QUALITY_MANAGER", dataScope: "ALL" }, { role: "INSPECTOR", dataScope: "ALL" }, { role: "VIEWER", dataScope: "ALL" }] }),
  create: definePermission({ code: "part_revision.create", grants: [{ role: "ENGINEER", dataScope: "ALL" }] }),
  update: definePermission({ code: "part_revision.update", grants: [{ role: "ENGINEER", dataScope: "ALL" }] }),
  submitReview: definePermission({ code: "part_revision.submit_review", grants: [{ role: "ENGINEER", dataScope: "ALL" }] }),
  return: definePermission({ code: "part_revision.return", grants: [{ role: "QUALITY_MANAGER", dataScope: "ALL" }], separation: "CREATOR_REVIEW" }),
  approve: definePermission({ code: "part_revision.approve", grants: [{ role: "QUALITY_MANAGER", dataScope: "ALL" }], separation: "CREATOR_REVIEW" }),
  reviewOverride: definePermission({ code: "part_revision.review_override", grants: [], separation: "NONE" }),
  release: definePermission({ code: "part_revision.release", grants: [{ role: "QUALITY_MANAGER", dataScope: "ALL" }] }),
});

/** Internal counterparts prove that an emergency override bypasses separation only. */
export const partRevisionPermissionWithoutCreatorReview = Object.freeze({
  return: definePermission({ code: "part_revision.return", grants: [{ role: "QUALITY_MANAGER", dataScope: "ALL" }], separation: "NONE" }),
  approve: definePermission({ code: "part_revision.approve", grants: [{ role: "QUALITY_MANAGER", dataScope: "ALL" }], separation: "NONE" }),
});
