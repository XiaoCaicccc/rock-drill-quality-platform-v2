# Part Master Module Rules

## Responsibility

Own organization-level PartMaster master data, generated part numbers, drawing-number normalization, category assignment, queries, and Slice 2A UI/API contracts.

## Always

- Keep immutable UUID identity separate from generated immutable `partNumber` and optional `drawingNumber`.
- Resolve categories through the PartCategory public API and require same-Organization ACTIVE targets for create/reassignment.
- Allocate numbers through the Numbering public API in an independent short transaction before the PartMaster/Audit transaction.
- Enforce actor Organization scope in every use case and record real mutations with AuditLog atomically.

## Never

- Add delete, PartRevision, Equipment, Batch, Inspection, SupplierRelation, owner OrgUnit, or category-tree behavior.
- Accept client-supplied `id`, `organizationId`, `partNumber`, `normalizedDrawingNumber`, or `status` on create.
- Expose Prisma Client, Prisma models, TransactionClient, SQL helpers, or persistence internals from `index.ts`.

## Validation Commands

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:db`
