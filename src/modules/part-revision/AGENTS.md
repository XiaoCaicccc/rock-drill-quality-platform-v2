# Part Revision Module Rules

## Responsibility

Own PartRevision lifecycle, immutable PartRevisionReview history, revision permissions, DTOs, and Slice 2B API contracts.

## Always

- Use the Slice-local PartRevision transaction composition adapter for every lifecycle persistence operation. It owns the shared PartMaster serialization boundary, Revision row locks, Review persistence and transaction-bound Audit recorder without exposing Prisma contracts to application/domain.
- Keep Revision/Review, required Audit event, and status or release metadata in one PostgreSQL transaction.
- Use Clock-provided instants and enforce the Organization boundary in every use case.
- Keep Review history append-only and enforce creator-review separation, including explicit ADMIN override reasons.

## Never

- Add delete/cancel states, parallel branches, generic workflow/approval engines, CAD/BOM/ECN/ECO, or future Slice behavior.
- Import PartMaster infrastructure or create a PartMaster-to-PartRevision dependency.
- Turn the composition adapter into a global UnitOfWork, generic transaction callback, arbitrary model executor or raw-SQL facade.
- Expose Prisma Client, Prisma models, TransactionClient, SQL helpers, or persistence internals from `index.ts`.

## Validation Commands

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:db`
