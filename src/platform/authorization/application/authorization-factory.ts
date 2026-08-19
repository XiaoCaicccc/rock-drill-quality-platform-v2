import type { PrismaClient } from "@prisma/client";

import type { OrganizationService } from "@/platform/organization";

import type { AuthorizationService } from "./contracts";
import { createAuthorizationEvaluator } from "./authorization-service";
import { createRoleAssignmentService } from "./role-assignment-service";

export function createAuthorizationServiceForPrisma(prisma: PrismaClient, organization: Pick<OrganizationService, "isOrgUnitInSubtree">): AuthorizationService {
  return { ...createAuthorizationEvaluator(prisma, organization), ...createRoleAssignmentService(prisma) };
}
