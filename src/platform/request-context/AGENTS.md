# Request-context module

## Responsibility
Create and explicitly pass request-scoped platform metadata.

## Always
- Create and pass context explicitly.
- Represent Actor with a discriminated union.
- Exclude passwords, tokens, and cookies.

## Ask First
- Adding context fields or accepting external request identifiers.

## Never
- Make Context a mutable global singleton.
- Store complete user entities.
- Store long-lived roles or authorization snapshots.
- Depend on databases, authentication frameworks, or Next.js transport APIs.

## Allowed Dependencies
- The public API of `@/platform/time` and files within this module.

## Forbidden Dependencies
- Databases, authentication, authorization, Next.js, React, headers, cookies, sessions, and environment variables.

## Validation Commands
- `npm run lint`
- `npm run typecheck`
- `npm run test`
