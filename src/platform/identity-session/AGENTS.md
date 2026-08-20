# Identity / Session Module Rules

## Responsibility

Own Account credentials, authentication, DB-backed revocable Sessions, Account management, password security, bootstrap-admin closure, and the identity-to-RequestContext mapping.

## Always

- Use the public `index.ts` entry point for consumers.
- Keep raw passwords, raw session tokens, token hashes, password hashes, and connection data out of DTOs, errors, logs, tests, and evidence.
- Use the existing `Clock` abstraction and a real PostgreSQL transaction for Account row serialization, session limits, status revocation, and bootstrap.
- Re-read Account, Organization, and primary OrgUnit state at the transaction boundary before creating a Session.
- Keep Account/password/Session mutation Audit in the same PostgreSQL transaction through the Audit public contract.
- Serialize last-effective-admin reductions on the Organization row without changing D-026.

## Never

- Add custom roles, custom permissions, Data Scope policy, UI, MFA, OAuth / SSO, JWT, refresh tokens, sliding expiry, automatic lockout, or device/IP/geo binding.
- Import Organization internal implementation files or alter its hierarchy and advisory-lock semantics.
- Expose Prisma Client, Prisma models/types, SQL lock helpers, raw token helpers, or concrete password hashing implementations from the public entry point.

## Validation Commands

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:db`
