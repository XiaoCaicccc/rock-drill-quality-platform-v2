# ACTIVE PLAN

## Status: ACTIVE — Slice 1B

### Objective

Deliver the Account / Authentication / DB-backed Revocable Session foundation for the approved Slice 1B task on branch `feat/slice-1b-identity-session-foundation`.

The slice answers **who are you**:

`Account → Password Credential → Login → DB-backed Session → Cookie → Session Validation → AuthenticatedActor → RequestContext`.

### In scope

- `Account` with one Organization and one same-Organization primary OrgUnit, globally unique normalized username, and `ACTIVE` / `INACTIVE` / `LOCKED` status.
- Argon2id password hashing behind an infrastructure `PasswordHasher` abstraction, the 15–128 Unicode code-point policy, and safe public Account DTOs.
- DB-backed opaque sessions with SHA-256 token hashes only, seven-day absolute expiry, revocation, dynamic Organization / OrgUnit validity, and a maximum of three active sessions per Account.
- Transaction-serialized login and Account status changes, including permanent session revocation for Account deactivation/locking.
- Application capabilities for account creation, status changes, authentication, session validation/listing/revocation/logout, and one-time initial bootstrap.
- Node.js runtime transport routes for login, logout, current session, own active sessions, and own-session revocation.
- Mapping a validated session into the existing `AuthenticatedActor` / `RequestContext` contract.
- `bootstrap-admin` as a first-login-identity CLI; Organization and OrgUnit must already exist and password input must be masked stdin.
- Forward-only Prisma migration, real PostgreSQL 17 invariant tests, API contract tests, regression verification, and closure updates to the existing authoritative documents.

### Explicitly out of scope

Roles, permissions, Data Scope, RBAC / ABAC, admin authorization, Audit, login or user-management UI, MFA, OAuth, SSO, signup/invitations, password reset/change, automatic lockout, full rate limiting, JWT / refresh tokens / sliding expiry, QR auth, API keys, device/IP/geo binding, background cleanup, and Slice 1C / 1D work.

### Implementation boundaries

- Identity / Session ownership is `src/platform/identity-session/`; consumers use only its `index.ts`.
- Identity / Session must not import Organization internals or change Slice 1A hierarchy and D-026 locking semantics.
- Existing migrations remain untouched; the new migration is forward-only.
- Runtime uses `DATABASE_URL`; real integration tests use only `TEST_DATABASE_URL`.
- No raw password, raw session token, token hash, or password hash may appear in public DTOs, errors, logs, tests, evidence, or tracked files.

### Verification target

`npm run db:validate`, `npm run db:generate`, `npm run check:full`, migration deployment, account/session/API tests, and deterministic real PostgreSQL evidence for three-session concurrency, login-disable races, status revocation, and bootstrap races.

## Previous completed plan

Slice 1A — organization hierarchy and first business migration — is complete. Its final evidence remains recorded below.

## Slice 1A final evidence

- Organization / OrgUnit foundation and the first business Prisma Migration were implemented.
- PostgreSQL constraints and the transaction-scoped organization advisory lock were verified.
- Local verification passed: lint, typecheck, 8 unit-test files / 31 tests, production build, and `db:migrate:test`.
- Real PostgreSQL verification passed: DB-01～DB-04 (4/4) and ORG-DB-01～ORG-DB-13 (13/13), for 2 database test files / 17 tests.
- PR #5 passed all GitHub Actions checks and its Vercel Preview is Ready.
