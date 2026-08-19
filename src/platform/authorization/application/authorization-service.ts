import type { PrismaClient } from "@prisma/client";

import type { OrganizationService } from "@/platform/organization";

import type { AuthorizationDecision, DataScope, EvaluateAuthorizationInput } from "../domain/authorization";
import { authorizationError } from "./errors";

type SubtreeReader = Pick<OrganizationService, "isOrgUnitInSubtree">;

const allow = (): AuthorizationDecision => ({ allowed: true, reason: "ALLOWED" });
const deny = (reason: Exclude<AuthorizationDecision["reason"], "ALLOWED">): AuthorizationDecision => ({ allowed: false, reason });

export function createAuthorizationEvaluator(prisma: PrismaClient, organization: SubtreeReader) {
  async function scopeAllows(scope: DataScope, assignmentScopeOrgUnitId: string, input: EvaluateAuthorizationInput): Promise<"ALLOW" | "MISMATCH" | "MISSING"> {
    const actor = input.context.actor;
    if (actor.kind === "anonymous") return "MISMATCH";
    switch (scope) {
      case "ALL": return "ALLOW";
      case "NONE": return "MISMATCH";
      case "ASSIGNED": return input.target.assignedAccountIds === undefined ? "MISSING" : input.target.assignedAccountIds.includes(actor.userId) ? "ALLOW" : "MISMATCH";
      case "OWN_CREATED": return input.target.createdByAccountId === undefined ? "MISSING" : input.target.createdByAccountId === actor.userId ? "ALLOW" : "MISMATCH";
      case "ORG_UNIT": return input.target.orgUnitId === undefined ? "MISSING" : input.target.orgUnitId === assignmentScopeOrgUnitId ? "ALLOW" : "MISMATCH";
      case "ORG_SUBTREE":
        if (input.target.orgUnitId === undefined) return "MISSING";
        return await organization.isOrgUnitInSubtree({ organizationId: actor.organizationId, ancestorOrgUnitId: assignmentScopeOrgUnitId, candidateOrgUnitId: input.target.orgUnitId }) ? "ALLOW" : "MISMATCH";
    }
  }

  async function evaluateAuthorization(input: EvaluateAuthorizationInput): Promise<AuthorizationDecision> {
    const actor = input.context.actor;
    if (actor.kind === "anonymous") return deny("ANONYMOUS");
    if (actor.organizationId !== input.target.organizationId) return deny("CROSS_ORGANIZATION");
    if (input.permission.separation === "CREATOR_REVIEW") {
      if (input.target.createdByAccountId === undefined) return deny("MISSING_TARGET_FACT");
      if (input.target.createdByAccountId === actor.userId) return deny("CREATOR_REVIEW_FORBIDDEN");
    }

    const assignments = await prisma.accountRoleAssignment.findMany({
      where: { accountId: actor.userId, organizationId: actor.organizationId },
      select: { role: true, scopeOrgUnitId: true },
    });
    if (assignments.some((assignment) => assignment.role === "ADMIN")) return allow();

    let matchingGrant = false;
    let missingFact = false;
    for (const assignment of assignments) {
      for (const grant of input.permission.grants) {
        if (grant.role !== assignment.role) continue;
        matchingGrant = true;
        const result = await scopeAllows(grant.dataScope, assignment.scopeOrgUnitId, input);
        if (result === "ALLOW") return allow();
        if (result === "MISSING") missingFact = true;
      }
    }
    if (!matchingGrant) return deny("NO_PERMISSION_GRANT");
    return deny(missingFact ? "MISSING_TARGET_FACT" : "DATA_SCOPE_MISMATCH");
  }

  return {
    evaluateAuthorization,
    async requireAuthorization(input: EvaluateAuthorizationInput): Promise<void> {
      const decision = await evaluateAuthorization(input);
      if (decision.allowed) return;
      throw authorizationError(decision.reason === "ANONYMOUS" ? "AUTHENTICATION_REQUIRED" : "PERMISSION_DENIED");
    },
  };
}
