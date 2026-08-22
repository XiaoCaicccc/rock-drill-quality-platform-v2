import { getPrismaClient } from "@/platform/database";
import { createPartRevisionService as createPartRevisionApplicationService } from "./application/part-revision-service";
import { createAuthorizationService } from "@/platform/authorization";
import { systemClock } from "@/platform/time";
import { createPartRevisionTransactionBoundary } from "./infrastructure/part-revision-transaction-boundary";

export function createPartRevisionService() { return createPartRevisionApplicationService(createPartRevisionTransactionBoundary(getPrismaClient(), systemClock), createAuthorizationService()); }
export { partRevisionPermissions } from "./application/permissions";
export { partRevisionError } from "./application/errors";
export { isPartRevisionStatus, normalizeChangeSummary } from "./domain/part-revision";
export type { PartRevisionDto, PartRevisionPage, PartRevisionReviewDto, PartRevisionReviewPage, PartRevisionService, PartRevisionStatus } from "./domain/part-revision";
