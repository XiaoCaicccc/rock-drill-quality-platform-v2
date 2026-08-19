# ACTIVE PLAN

## Status: ACTIVE — Slice 1C

Slice 1C — Role / Permission / Data Scope Authorization Foundation is approved for implementation on `feat/slice-1c-authorization-foundation`.

## Objective

Establish the server-side Authorization platform that answers what an authenticated Account may do and which data inside its own Organization it may touch. Authorization evaluates the current committed role assignments, code-declared permission policy, Data Scope, target facts, and creator/reviewer separation.

## In scope

- Five fixed roles: `ADMIN`, `QUALITY_MANAGER`, `INSPECTOR`, `ENGINEER`, `VIEWER`.
- Persistent `AccountRoleAssignment` with a required OrgUnit scope anchor, same-Organization composite foreign keys, exact-assignment uniqueness, and a forward-only Migration.
- Permission codes using `module.business_action`; validated code-declared `PermissionDefinition` values with additive role grants.
- Six Data Scopes: `ALL`, `ORG_SUBTREE`, `ORG_UNIT`, `ASSIGNED`, `OWN_CREATED`, `NONE`.
- Same-Organization boundary, fail-closed target facts, special same-Organization `ADMIN` grant, and `CREATOR_REVIEW` separation.
- Live role-assignment lookup without Session, RequestContext, JWT, or cache snapshots.
- Public `evaluateAuthorization()` and `requireAuthorization()` capabilities, plus internal application capabilities to assign, revoke, and list role assignments.
- A minimal read-only Organization subtree capability exposed only through the Organization public entry point, without changing D-026 locking.
- Real PostgreSQL acceptance for schema, composite FKs, uniqueness, allowed multiplicity, and concurrent exact assignment.
- Unit/integration behavior coverage and complete regression verification.

## Out of scope

- Custom roles or permissions, role hierarchy or priority, explicit deny policy, permission editor, or a complete business permission matrix.
- Role-management HTTP APIs or UI, user-management UI, or login UI.
- Audit, emergency admin override, assignment history, or Slice 1D bootstrap/management closure.
- Part, Revision, Inspection, Report, business workflow/state-machine implementation, or other future Slice work.
- Authorization cache, JWT permission claims, multi-tenant authorization, API keys, or external identity providers.

## Acceptance and delivery

- All five roles, all six Data Scopes, multi-role and multi-assignment union, Organization boundary, Admin constraints, creator/reviewer separation, missing-fact fail-closed behavior, and live add/revoke behavior are proven by behavior tests.
- `AUTHZ-DB-01` through `AUTHZ-DB-07` pass against real PostgreSQL; Slice 0, 1A, and 1B regressions remain green.
- `npm run db:validate`, `npm run db:generate`, `npm run check:full`, and `git diff --check` pass.
- Independent review reports zero unresolved BLOCKER and zero unresolved MAJOR findings.
- The implementation and closure commits pass GitHub Actions. The loop stops at `READY_TO_MERGE`; merge and Slice 1D require separate human action.
