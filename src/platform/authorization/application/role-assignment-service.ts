import type { Prisma, PrismaClient } from "@prisma/client";

import { createTransactionBoundAuditRecorder, type AuditEvent } from "@/platform/audit";
import { randomRequestId } from "@/platform/request-context";
import type { RequestContext } from "@/platform/request-context";
import { systemClock } from "@/platform/time";

import type { AssignManagedRoleInput, AssignRoleToAccountInput, ListAccountRoleAssignmentsInput, ListManagedRoleAssignmentsInput, RevokeManagedRoleInput, RevokeRoleAssignmentInput } from "./contracts";
import { authorizationError } from "./errors";
import { isRoleCode } from "../domain/permission";
import { countEffectiveAdminAccounts, isCriticalEffectiveAdminAssignment, isPrismaError, lockOrganizationAccess, toAccountRoleAssignmentDto, type AuthorizationTransaction } from "../infrastructure/authorization-prisma";

const accessMutationTransactionOptions = { maxWait: 10_000, timeout: 60_000 } as const;

function requireIdentifier(value: string): void {
  if (typeof value !== "string" || value.trim().length === 0) throw authorizationError("INVALID_ROLE_ASSIGNMENT_INPUT");
}

function requireActor(context: RequestContext) {
  if (context.actor.kind !== "user") throw authorizationError("AUTHENTICATION_REQUIRED");
  return context.actor;
}

function mapDatabaseError(error: unknown): never {
  if (isPrismaError(error, "P2002")) throw authorizationError("ROLE_ASSIGNMENT_CONFLICT", error);
  if (isPrismaError(error, "P2003")) throw authorizationError("CROSS_ORGANIZATION_ASSIGNMENT", error);
  throw error;
}

function auditData(event: AuditEvent): Prisma.AuditLogUncheckedCreateInput {
  return { organizationId: event.organizationId, actorKind: event.actorKind, actorAccountId: event.actorKind === "USER" ? event.actorAccountId : null, actorSessionId: event.actorKind === "USER" ? event.actorSessionId : null, requestId: event.requestId, action: event.action, targetType: event.targetType, targetId: event.targetId, reason: event.reason ?? null, details: event.details === null || event.details === undefined ? undefined : event.details as Prisma.InputJsonValue, occurredAt: event.occurredAt };
}

async function record(transaction: AuthorizationTransaction, context: RequestContext, action: string, assignment: { id: string; role: string; scopeOrgUnitId: string }): Promise<void> {
  const actor = requireActor(context);
  await createTransactionBoundAuditRecorder(async (event) => { await transaction.auditLog.create({ data: auditData(event) }); }).record({ actorKind: "USER", organizationId: actor.organizationId, actorAccountId: actor.userId, actorSessionId: actor.sessionId, requestId: context.requestId, action, targetType: "account_role_assignment", targetId: assignment.id, details: { role: assignment.role, scopeOrgUnitId: assignment.scopeOrgUnitId }, occurredAt: new Date(context.receivedAt) });
}

async function recordSystem(transaction: AuthorizationTransaction, organizationId: string, action: string, assignment: { id: string; role: string; scopeOrgUnitId: string }): Promise<void> {
  await createTransactionBoundAuditRecorder(async (event) => { await transaction.auditLog.create({ data: auditData(event) }); }).record({ actorKind: "SYSTEM", organizationId, requestId: randomRequestId(), action, targetType: "account_role_assignment", targetId: assignment.id, details: { role: assignment.role, scopeOrgUnitId: assignment.scopeOrgUnitId }, occurredAt: systemClock.now() });
}

export function createRoleAssignmentService(prisma: PrismaClient) {
  async function assign(input: AssignRoleToAccountInput, context?: RequestContext) {
    requireIdentifier(input.accountId);
    requireIdentifier(input.organizationId);
    requireIdentifier(input.scopeOrgUnitId);
    if (!isRoleCode(input.role)) throw authorizationError("INVALID_ROLE_ASSIGNMENT_INPUT");
    try {
      return await prisma.$transaction(async (transaction) => {
        const [account, scopeOrgUnit] = await Promise.all([
          transaction.account.findUnique({ where: { id: input.accountId }, select: { organizationId: true } }),
          transaction.orgUnit.findUnique({ where: { id: input.scopeOrgUnitId }, select: { organizationId: true, status: true } }),
        ]);
        if (!account) throw authorizationError("ACCOUNT_NOT_FOUND");
        if (!scopeOrgUnit) throw authorizationError("SCOPE_ORG_UNIT_NOT_FOUND");
        if (account.organizationId !== input.organizationId || scopeOrgUnit.organizationId !== input.organizationId) throw authorizationError("CROSS_ORGANIZATION_ASSIGNMENT");
        if (context && scopeOrgUnit.status !== "ACTIVE") throw authorizationError("SCOPE_ORG_UNIT_NOT_FOUND");
        const assignment = await transaction.accountRoleAssignment.create({ data: input });
        if (context) await record(transaction, context, "role_assignment.assign", assignment);
        else await recordSystem(transaction, input.organizationId, "role_assignment.assign", assignment);
        return toAccountRoleAssignmentDto(assignment);
      });
    } catch (error) { mapDatabaseError(error); }
  }

  return {
    async assignRoleToAccount(input: AssignRoleToAccountInput) { return assign(input); },

    async revokeRoleAssignment(input: RevokeRoleAssignmentInput): Promise<void> {
      requireIdentifier(input.assignmentId);
      await prisma.$transaction(async (transaction) => {
        const initial = await transaction.accountRoleAssignment.findUnique({ where: { id: input.assignmentId } });
        if (!initial) throw authorizationError("ROLE_ASSIGNMENT_NOT_FOUND");
        await lockOrganizationAccess(transaction, initial.organizationId);
        const assignment = await transaction.accountRoleAssignment.findUnique({ where: { id: input.assignmentId } });
        if (!assignment || assignment.organizationId !== initial.organizationId) throw authorizationError("ROLE_ASSIGNMENT_NOT_FOUND");
        const reducesEffectiveAdmin = assignment.role === "ADMIN" && await isCriticalEffectiveAdminAssignment(transaction, assignment.organizationId, assignment.id);
        await transaction.accountRoleAssignment.delete({ where: { id: assignment.id } });
        if (reducesEffectiveAdmin && await countEffectiveAdminAccounts(transaction, assignment.organizationId) === 0) throw authorizationError("LAST_EFFECTIVE_ADMIN");
        await recordSystem(transaction, assignment.organizationId, "role_assignment.revoke", assignment);
      }, accessMutationTransactionOptions);
    },

    async listAccountRoleAssignments(input: ListAccountRoleAssignmentsInput) {
      requireIdentifier(input.accountId);
      if (!await prisma.account.findUnique({ where: { id: input.accountId }, select: { id: true } })) throw authorizationError("ACCOUNT_NOT_FOUND");
      const assignments = await prisma.accountRoleAssignment.findMany({ where: { accountId: input.accountId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      return assignments.map(toAccountRoleAssignmentDto);
    },

    async assignManagedRole(input: AssignManagedRoleInput) {
      const actor = requireActor(input.context);
      return assign({ accountId: input.accountId, organizationId: actor.organizationId, role: input.role, scopeOrgUnitId: input.scopeOrgUnitId }, input.context);
    },

    async revokeManagedRole(input: RevokeManagedRoleInput): Promise<void> {
      const actor = requireActor(input.context);
      requireIdentifier(input.assignmentId);
      await prisma.$transaction(async (transaction) => {
        const initial = await transaction.accountRoleAssignment.findUnique({ where: { id: input.assignmentId } });
        if (!initial || initial.organizationId !== actor.organizationId) throw authorizationError("ROLE_ASSIGNMENT_NOT_FOUND");
        await lockOrganizationAccess(transaction, actor.organizationId);
        const assignment = await transaction.accountRoleAssignment.findUnique({ where: { id: input.assignmentId } });
        if (!assignment || assignment.organizationId !== actor.organizationId) throw authorizationError("ROLE_ASSIGNMENT_NOT_FOUND");
        const reducesEffectiveAdmin = assignment.role === "ADMIN" && await isCriticalEffectiveAdminAssignment(transaction, actor.organizationId, assignment.id);
        await transaction.accountRoleAssignment.delete({ where: { id: assignment.id } });
        if (reducesEffectiveAdmin && await countEffectiveAdminAccounts(transaction, actor.organizationId) === 0) throw authorizationError("LAST_EFFECTIVE_ADMIN");
        await record(transaction, input.context, "role_assignment.revoke", assignment);
      }, accessMutationTransactionOptions);
    },

    async listManagedRoleAssignments(input: ListManagedRoleAssignmentsInput) {
      const actor = requireActor(input.context);
      requireIdentifier(input.accountId);
      if (!await prisma.account.findFirst({ where: { id: input.accountId, organizationId: actor.organizationId }, select: { id: true } })) throw authorizationError("ACCOUNT_NOT_FOUND");
      const assignments = await prisma.accountRoleAssignment.findMany({ where: { accountId: input.accountId, organizationId: actor.organizationId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
      return assignments.map(toAccountRoleAssignmentDto);
    },
  };
}
