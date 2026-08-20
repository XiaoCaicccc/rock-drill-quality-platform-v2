import { getPrismaClient } from "../database";
import { systemClock } from "../time";
import { createIdentitySessionServiceForPrisma } from "./application/identity-service";

export function createIdentitySessionService() {
  return createIdentitySessionServiceForPrisma(getPrismaClient(), { clock: systemClock });
}

export type { AccountDetailInput, AccountListInput, AuthenticateInput, BootstrapAdminInput, BootstrapInitialAccountInput, ChangeOwnPasswordInput, CreateAccountInput, IdentitySessionDependencies, IdentitySessionService, ManagedAccountInput, ResetManagedPasswordInput, RevokeOwnSessionInput, SetAccountStatusInput, SetManagedAccountStatusInput, UpdateManagedAccountInput } from "./application/contracts";
export type { AccountDetailDto, AccountDto, AccountPageDto, AccountStatus, AuthenticatedSessionDto, OwnSessionDto, SessionDto } from "./domain/identity";
