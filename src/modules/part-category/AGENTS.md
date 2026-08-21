# Part Category Module Rules

## Responsibility

Own flat, organization-scoped PartCategory master data for Slice 2A.

## Always

- Normalize names as trim + lowercase for same-Organization uniqueness while preserving trimmed display case.
- Enforce the actor Organization boundary in every use case.
- Allow ACTIVE/INACTIVE transitions without cascading to PartMaster.
- Record every real mutation and AuditLog in one PostgreSQL transaction; no-op mutations create no AuditLog.

## Never

- Add parent/category-tree behavior, delete APIs, PartRevision behavior, or SupplierRelation behavior.
- Expose Prisma Client, Prisma models, TransactionClient, SQL helpers, or infrastructure internals from `index.ts`.
- Trust UI visibility as authorization.

## Validation Commands

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:db`
