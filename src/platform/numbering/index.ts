import { getPrismaClient } from "@/platform/database";

import { createNumberingServiceForPrisma } from "./application/numbering-service";

export function createNumberingService() { return createNumberingServiceForPrisma(getPrismaClient()); }

export { formatNumber, validateNumberingPolicy } from "./domain/numbering";
export type { NumberAllocation, NumberingPolicy, NumberingService } from "./domain/numbering";
