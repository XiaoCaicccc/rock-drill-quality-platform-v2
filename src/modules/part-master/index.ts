import { getPrismaClient } from "@/platform/database";
import { definePermission } from "@/platform/authorization";
import { createNumberingService } from "@/platform/numbering";
import { createPartCategoryService } from "@/modules/part-category";

import { createPartMasterServiceForPrisma } from "./application/part-master-service";

export function createPartMasterService() {
  const prisma = getPrismaClient();
  return createPartMasterServiceForPrisma(prisma, { categories: createPartCategoryService(), numbering: createNumberingService() });
}

export const partMasterPermissions = Object.freeze({
  view: definePermission({ code: "part_master.view", grants: [{ role: "ENGINEER", dataScope: "ALL" }, { role: "QUALITY_MANAGER", dataScope: "ALL" }, { role: "INSPECTOR", dataScope: "ALL" }, { role: "VIEWER", dataScope: "ALL" }] }),
  create: definePermission({ code: "part_master.create", grants: [{ role: "ENGINEER", dataScope: "ALL" }] }),
  update: definePermission({ code: "part_master.update", grants: [{ role: "ENGINEER", dataScope: "ALL" }] }),
  setStatus: definePermission({ code: "part_master.set_status", grants: [{ role: "ENGINEER", dataScope: "ALL" }] }),
});

export { partCategoryInactiveError, partMasterError } from "./application/errors";
export { assertPartMasterStatus, isUuid, normalizeDrawingNumber, normalizePartDescription, normalizePartName, partMasterNumberingPolicy } from "./domain/part-master";
export type { CreatePartMasterInput, GetPartMasterInput, ListPartMastersInput, PartMasterDependencies, PartMasterDto, PartMasterPage, PartMasterService, PartMasterStatus, SetPartMasterStatusInput, UpdatePartMasterInput } from "./domain/part-master";
