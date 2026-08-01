# Time module

## Responsibility
Represent business dates and UTC instants, and provide the clock abstraction.

## Always
- Use `Asia/Shanghai` for business time.
- Keep BusinessDate separate from Instant.
- Obtain current time through `Clock`.

## Ask First
- Changing the enterprise business time zone or interval semantics.

## Never
- Use the system local time zone for business decisions.
- Use `new Date("YYYY-MM-DD")` for BusinessDate handling.
- Scatter `Date.now()` or `new Date()` through business code.

## Allowed Dependencies
- TypeScript and ECMAScript internationalization APIs.

## Forbidden Dependencies
- Project modules outside this directory, Next.js, React, databases, and environment variables.

## Validation Commands
- `npm run lint`
- `npm run typecheck`
- `npm run test`
