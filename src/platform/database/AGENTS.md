# Database Module Rules

- Runtime code uses only `DATABASE_URL`; integration tests use only `TEST_DATABASE_URL`.
- The two variables must never fall back to or be used in place of one another.
- Never output, log, or commit connection information.
- Do not use `$queryRawUnsafe` or `$executeRawUnsafe`; raw SQL must be static or parameterized.
- Migrations move forward only. Production uses `migrate deploy`; do not use `db push` as a migration path.
- Keep the test Client out of the runtime public entry point.
- Prove database behavior with real PostgreSQL integration tests.
