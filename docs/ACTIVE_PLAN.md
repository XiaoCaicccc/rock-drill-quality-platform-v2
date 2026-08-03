# ACTIVE PLAN

## Slice 0B-4 — CI, health check, and deployment runtime baseline

## Status: ACTIVE

## Sole objective

Establish the CI, health check, and deployment runtime baseline.

## Scope

- Add GitHub Actions CI for pull requests to and pushes on `master`.
- Run the existing PostgreSQL 17 integration tests in CI using an isolated service container.
- Add the Node.js liveness endpoint at `GET /api/health` and its Vitest coverage.
- Update the existing authoritative documentation to reflect the implemented baseline.

## Non-goals

- No Slice 1 work or business modules.
- No organization, account, authorization, session, authentication, migration, or business model work.
- No readiness endpoint, database probe, monitoring SDK, Dockerfile, or Vercel configuration change.
- No PostgreSQL, Prisma, Node.js, npm, or dependency version changes.

## Acceptance commands

- `npm.cmd run db:validate`
- `npm.cmd run db:generate`
- `npm.cmd run check:full`
- `git diff --check`
- `git status --short`
- Production build, local production-server request to `GET /api/health`, then clean server shutdown.

## Boundary

This plan authorizes only Slice 0B-4. It does not enter Slice 1 or any business module.
