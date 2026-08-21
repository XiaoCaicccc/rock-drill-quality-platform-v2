import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

import { formatNumber, validateNumberingPolicy, type NumberingPolicy, type NumberingService } from "../domain/numbering";

export function createNumberingServiceForPrisma(prisma: PrismaClient): NumberingService {
  return {
    async allocate(organizationId: string, policy: NumberingPolicy) {
      if (typeof organizationId !== "string" || organizationId.trim().length === 0) throw new RangeError("Numbering organizationId is required.");
      validateNumberingPolicy(policy);
      const rows = await prisma.$queryRaw<{ currentValue: bigint }[]>`
        INSERT INTO "numbering_sequence" ("id", "organizationId", "key", "currentValue")
        VALUES (${randomUUID()}::uuid, ${organizationId}::uuid, ${policy.key}, ${BigInt(policy.start)})
        ON CONFLICT ("organizationId", "key")
        DO UPDATE SET
          "currentValue" = "numbering_sequence"."currentValue" + 1,
          "updatedAt" = CURRENT_TIMESTAMP
        RETURNING "currentValue"
      `;
      const currentValue = rows[0]?.currentValue;
      if (currentValue === undefined) throw new Error("NUMBERING_ALLOCATION_EMPTY");
      const value = typeof currentValue === "bigint" ? currentValue : BigInt(currentValue);
      return { value, formatted: formatNumber(policy.prefix, value, policy.minimumWidth) };
    },
  };
}
