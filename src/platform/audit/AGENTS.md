# Audit Module Rules

## Responsibility

Own Audit event validation, USER/SYSTEM actor invariants, transaction-bound recorder contract, safe DTOs, and same-Organization audit query.

## Always

- Reject secret-bearing details recursively instead of silently redacting.
- Keep action and target identifiers as stable machine codes.
- Record business mutation and AuditLog in the same owning transaction.
- Preserve session IDs as historical UUID snapshots without a Session FK.

## Never

- Expose Prisma Client, Prisma models, TransactionClient, SQL helpers, passwords, hashes, tokens, cookies, authorization headers, or connection data.
- Provide Audit update/delete product APIs or record failed business attempts as successful business audit facts.
- Depend on PLM or quality business modules.

## Validation Commands

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:db`
