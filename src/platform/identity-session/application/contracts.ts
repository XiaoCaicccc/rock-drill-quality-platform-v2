import type { Clock } from "../../time";
import type { AccountDto, AccountStatus, AuthenticatedSessionDto, OwnSessionDto } from "../domain/identity";

export interface CreateAccountInput { readonly organizationId: string; readonly primaryOrgUnitId: string; readonly username: string; readonly displayName: string; readonly password: string; }
export interface SetAccountStatusInput { readonly accountId: string; readonly status: AccountStatus; }
export interface AuthenticateInput { readonly username: string; readonly password: string; readonly userAgent?: string | null; }
export interface RevokeOwnSessionInput { readonly rawToken: string; readonly sessionId: string; }
export type BootstrapInitialAccountInput = CreateAccountInput;
export interface IdentitySessionDependencies { readonly clock?: Clock; readonly passwordHasher?: import("../infrastructure/password-hasher").PasswordHasher; }

export interface IdentitySessionService {
  createAccount(input: CreateAccountInput): Promise<AccountDto>;
  setAccountStatus(input: SetAccountStatusInput): Promise<AccountDto>;
  authenticate(input: AuthenticateInput): Promise<AuthenticatedSessionDto & { readonly rawToken: string }>;
  validateSession(rawToken: string): Promise<AuthenticatedSessionDto>;
  listOwnSessions(rawToken: string): Promise<readonly OwnSessionDto[]>;
  revokeOwnSession(input: RevokeOwnSessionInput): Promise<{ readonly current: boolean }>;
  logout(rawToken: string | null | undefined): Promise<void>;
  bootstrapInitialAccount(input: BootstrapInitialAccountInput): Promise<AccountDto>;
}
