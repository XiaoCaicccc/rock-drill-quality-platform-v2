# Identity / Session Module Rules

## Responsibility

Own Account credentials, authentication, DB-backed revocable Sessions, and the identity-to-RequestContext mapping for Slice 1B.

## Always

- Use the public `index.ts` entry point for consumers.
- Keep raw passwords, raw session tokens, token hashes, password hashes, and connection data out of DTOs, errors, logs, tests, and evidence.
- Use the existing `Clock` abstraction and a real PostgreSQL transaction for Account row serialization, session limits, status revocation, and bootstrap.
- Re-read Account, Organization, and primary OrgUnit state at the transaction boundary before creating a Session.

## Never

- Add roles, permissions, Data Scope, RBAC / ABAC, Audit, UI, MFA, OAuth / SSO, JWT, refresh tokens, sliding expiry, automatic lockout, or device/IP/geo binding.
- Import Organization internal implementation files or alter its hierarchy and advisory-lock semantics.
- Expose Prisma Client, Prisma models/types, SQL lock helpers, raw token helpers, or concrete password hashing implementations from the public entry point.

## Validation Commands

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:db`
