import { getPrismaClient } from "@/platform/database";
import { definePermission } from "@/platform/authorization";

import { createPartCategoryServiceForPrisma } from "./application/part-category-service";

export function createPartCategoryService() { return createPartCategoryServiceForPrisma(getPrismaClient()); }

export const partCategoryPermissions = Object.freeze({
  view: definePermission({ code: "part_category.view", grants: [{ role: "ENGINEER", dataScope: "ALL" }, { role: "QUALITY_MANAGER", dataScope: "ALL" }, { role: "INSPECTOR", dataScope: "ALL" }, { role: "VIEWER", dataScope: "ALL" }] }),
  create: definePermission({ code: "part_category.create", grants: [{ role: "ENGINEER", dataScope: "ALL" }] }),
  update: definePermission({ code: "part_category.update", grants: [{ role: "ENGINEER", dataScope: "ALL" }] }),
  setStatus: definePermission({ code: "part_category.set_status", grants: [{ role: "ENGINEER", dataScope: "ALL" }] }),
});

export { categoryInactiveError, partCategoryError } from "./application/errors";
export { assertPartCategoryStatus, normalizeCategoryDescription, normalizeCategoryName } from "./domain/part-category";
export type { CreatePartCategoryInput, ListPartCategoriesInput, PartCategoryDto, PartCategoryLookup, PartCategoryPage, PartCategoryReference, PartCategoryService, PartCategoryStatus, SetPartCategoryStatusInput, UpdatePartCategoryInput } from "./domain/part-category";
