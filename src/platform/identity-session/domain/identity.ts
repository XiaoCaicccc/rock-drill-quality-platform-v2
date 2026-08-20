export type AccountStatus = "ACTIVE" | "INACTIVE" | "LOCKED";

export interface AccountDto {
  readonly id: string;
  readonly organizationId: string;
  readonly primaryOrgUnitId: string;
  readonly username: string;
  readonly displayName: string;
  readonly status: AccountStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SessionDto {
  readonly id: string;
  readonly accountId: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly userAgent: string | null;
}

export interface OwnSessionDto {
  readonly sessionId: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly current: boolean;
  readonly userAgent: string | null;
}

export interface AuthenticatedSessionDto {
  readonly account: AccountDto;
  readonly session: SessionDto;
}

export interface AccountDetailDto extends AccountDto {
  readonly primaryOrgUnit: { readonly id: string; readonly code: string; readonly name: string; readonly status: "ACTIVE" | "INACTIVE" };
}

export interface AccountPageDto {
  readonly items: readonly AccountDetailDto[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}
