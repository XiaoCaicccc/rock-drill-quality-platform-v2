# Authorization Module Rules

## Responsibility

Own fixed roles, current Role Assignments, code-declared Permission policies, Data Scope evaluation, and creator/reviewer separation.

## Always

- Enforce the Organization boundary before evaluating any grant.
- Read current committed Role Assignments for every authorization evaluation.
- Fail closed when a required AuthorizationTarget fact is absent.
- Use Organization hierarchy only through `@/platform/organization`.
- Keep Permission policies in the owning business module's code.

## Never

- Expose Prisma Client, Prisma models/types, repositories, SQL helpers, or infrastructure contracts from `index.ts`.
- Import `src/modules/**` or a concrete business entity/state machine.
- Store roles, permissions, or Data Scope snapshots in RequestContext, Session, JWT, or a cache.
- Add custom roles, role hierarchy/priority, explicit DENY, Audit, emergency override, HTTP role management, or UI in Slice 1C.
- Treat `Account.primaryOrgUnitId` or `actor.organizationUnitId` as an implicit Role Assignment scope.

## Validation Commands

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:db`
