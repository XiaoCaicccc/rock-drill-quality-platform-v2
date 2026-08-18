# Organization Module Rules

## Always

- Keep internal UUIDs separate from mutable business codes; codes are never cross-module foreign keys.
- Perform organization writes only through application use cases and return stable DTOs.
- Serialize hierarchy writes by organization within their transaction.
- Keep runtime and test Prisma Clients strictly separate.

## Never

- Hard-delete organizations or organization units.
- Bypass hierarchy constraints with direct Prisma writes.
- Expose Prisma types outside this module's public `index.ts` entry point.
- Implement accounts, permissions, authorization, or sessions here.

## Boundaries

- External consumers import only from `index.ts`.
- `domain` has no Prisma, Next.js, or React dependencies; `application` has no route or UI dependency.
