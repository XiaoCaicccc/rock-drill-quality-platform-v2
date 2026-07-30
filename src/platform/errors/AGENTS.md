# Error module

## Responsibility
Define stable platform error contracts and framework-independent safe public error responses.

## Always
- Return only safe fields in public responses.
- Normalize unknown errors to a safe response.
- Keep error codes machine-stable.

## Ask First
- Changing a public error code or response contract.

## Never
- Return stacks, causes, database information, or token values.
- Depend on React, NextResponse, or business modules.

## Allowed Dependencies
- TypeScript standard library and files within this module.

## Forbidden Dependencies
- Next.js transport APIs, React, databases, authentication, and business modules.

## Validation Commands
- `npm run lint`
- `npm run typecheck`
- `npm run test`
