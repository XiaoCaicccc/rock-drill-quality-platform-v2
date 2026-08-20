import type { Clock } from "../../time";
import type { RequestContext } from "../../request-context";
import type { AccountDetailDto, AccountDto, AccountPageDto, AccountStatus, AuthenticatedSessionDto, OwnSessionDto } from "../domain/identity";

export interface CreateAccountInput { readonly organizationId: string; readonly primaryOrgUnitId: string; readonly username: string; readonly displayName: string; readonly password: string; }
export interface SetAccountStatusInput { readonly accountId: string; readonly status: AccountStatus; }
export interface AuthenticateInput { readonly username: string; readonly password: string; readonly userAgent?: string | null; }
export interface RevokeOwnSessionInput { readonly rawToken: string; readonly sessionId: string; }
export type BootstrapInitialAccountInput = CreateAccountInput;
export interface ManagedAccountInput { readonly context: RequestContext; readonly username: string; readonly displayName: string; readonly primaryOrgUnitId: string; readonly password: string; }
export interface AccountListInput { readonly context: RequestContext; readonly search?: string; readonly status?: AccountStatus; readonly orgUnitId?: string; readonly page?: number; readonly pageSize?: number; }
export interface AccountDetailInput { readonly context: RequestContext; readonly accountId: string; }
export interface UpdateManagedAccountInput { readonly context: RequestContext; readonly accountId: string; readonly displayName?: string; readonly primaryOrgUnitId?: string; }
export interface SetManagedAccountStatusInput { readonly context: RequestContext; readonly accountId: string; readonly status: AccountStatus; }
export interface ChangeOwnPasswordInput { readonly context: RequestContext; readonly currentPassword: string; readonly newPassword: string; }
export interface ResetManagedPasswordInput { readonly context: RequestContext; readonly accountId: string; readonly newPassword: string; }
export type BootstrapAdminInput =
  | ({ readonly requestId: string; readonly existingAccountId: string } & { readonly organizationId?: never; readonly primaryOrgUnitId?: never; readonly username?: never; readonly displayName?: never; readonly password?: never })
  | (CreateAccountInput & { readonly requestId: string; readonly existingAccountId?: never });
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
  createManagedAccount(input: ManagedAccountInput): Promise<AccountDto>;
  listManagedAccounts(input: AccountListInput): Promise<AccountPageDto>;
  getManagedAccount(input: AccountDetailInput): Promise<AccountDetailDto>;
  updateManagedAccount(input: UpdateManagedAccountInput): Promise<AccountDto>;
  setManagedAccountStatus(input: SetManagedAccountStatusInput): Promise<AccountDto>;
  changeOwnPassword(input: ChangeOwnPasswordInput): Promise<void>;
  resetManagedPassword(input: ResetManagedPasswordInput): Promise<void>;
  bootstrapAdmin(input: BootstrapAdminInput): Promise<AccountDto>;
}
