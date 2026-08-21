# Numbering Module Rules

## Responsibility

Own organization-scoped business-number allocation as a platform capability.

## Always

- Allocate atomically in a short independent PostgreSQL transaction.
- Scope every sequence by `organizationId` and stable `key`.
- Treat a returned number as permanently consumed; never roll back, decrement, release, or reuse it.
- Keep internal UUIDs separate from formatted business numbers.

## Never

- Import `src/modules/**`, PartMaster, PartCategory, or any business Entity.
- Expose Prisma Client, Prisma models, TransactionClient, raw SQL helpers, or infrastructure internals.
- Write AuditLog entries, provide Numbering HTTP/UI APIs, or create allocation-ledger/history tables in Slice 2A.

## Validation Commands

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:db`
