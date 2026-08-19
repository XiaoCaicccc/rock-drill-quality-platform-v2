export interface BootstrapAdminProcessResult {
  readonly error?: Error;
  readonly status: number | null;
}

export interface BootstrapAdminDependencies {
  readonly platform?: NodeJS.Platform;
  readonly environment?: NodeJS.ProcessEnv;
  readonly execPath?: string;
  readonly spawnSync?: (
    command: string,
    args: readonly string[],
    options: Record<string, unknown>,
  ) => BootstrapAdminProcessResult;
}

export function isMainModule(metaUrl?: string, argv1?: string): boolean;
export function runBootstrapAdmin(argv?: readonly string[], dependencies?: BootstrapAdminDependencies): number;
