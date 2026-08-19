# ACTIVE PLAN

## Status: NO ACTIVE IMPLEMENTATION PLAN

Slice 1B — Account / Authentication / DB-backed Revocable Session foundation — is the previous completed plan. Slice 1C / 1D are not active and require a new, explicit authorization before any implementation starts.

## Slice 1B final evidence

- Account, Argon2id password credential, opaque DB-backed Session, seven-day absolute expiry, revocation, three-session limit, authentication routes, own-session operations, and one-time bootstrap were implemented within the approved Slice 1B boundary.
- `bootstrap-admin` delegates to the single identity application capability; its Windows wrapper, main-module detection, generated entry, safe failure output, and real database adapter behavior are covered.
- A validated Session now establishes `AuthenticatedActor` on the same logical `RequestContext`, preserving `requestId` and `receivedAt`.
- PostgreSQL acceptance covers normalized username uniqueness, same-Organization composite FK, inactive Organization / primary OrgUnit rejection, dynamic scope invalidation, unified public authentication failures, logout persistence, exact expiry, own-session protection, and bootstrap behavior.
- Deterministic concurrency evidence uses formal PostgreSQL lock boundaries and `pg_blocking_pids` chains for two concurrent logins, login versus `LOCKED` / `INACTIVE`, and concurrent initial bootstrap; no sleep or Promise settlement order is used as Slice 1B concurrency proof.
- FINAL_VERIFY passed: lint, typecheck, production build, 14 ordinary test files / 48 tests, migration deployment, 3 PostgreSQL test files / 26 tests, `db:validate`, `db:generate`, and `git diff --check`.
- Independent review passed with 0 BLOCKER and 0 MAJOR findings. PR #6 initial GitHub Actions `verify` and Vercel checks passed on implementation commit `c4960b2`.
- One existing Slice 1A `ORG-DB-13` transaction disappeared during an earlier FINAL_VERIFY attempt; its targeted infrastructure retry and the subsequent complete `check:full` rerun passed without production-code changes.
- Known non-blocking finding: masked CLI input handles DEL as backspace; Windows `\u0008` and supplementary Unicode correction remain a minor usability edge case.
