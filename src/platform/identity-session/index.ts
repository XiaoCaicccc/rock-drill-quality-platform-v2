import { getPrismaClient } from "../database";
import { systemClock } from "../time";
import { createIdentitySessionServiceForPrisma } from "./application/identity-service";

export function createIdentitySessionService() {
  return createIdentitySessionServiceForPrisma(getPrismaClient(), { clock: systemClock });
}

export type { AuthenticateInput, BootstrapInitialAccountInput, CreateAccountInput, IdentitySessionDependencies, IdentitySessionService, RevokeOwnSessionInput, SetAccountStatusInput } from "./application/contracts";
export type { AccountDto, AccountStatus, AuthenticatedSessionDto, OwnSessionDto, SessionDto } from "./domain/identity";
