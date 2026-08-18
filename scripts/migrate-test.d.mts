export type Environment = Record<string, string | undefined>;
export type SpawnResult = { status: number | null; error?: Error };

export function createMigrationChildEnvironment(environment: Environment): Environment;
export function createMigrationCommand(platform: string, environment: Environment, schemaPath: string): { command: string; arguments: string[] };
export function runMigrationCommand(options: {
  platform: string;
  environment: Environment;
  schemaPath: string;
  cwd: string;
  spawn?: (command: string, arguments: readonly string[], options: { cwd: string; env: Environment; stdio: "inherit" }) => SpawnResult;
  writeError?: (error: Error) => void;
}): number;
export function main(options?: { environment?: Environment; platform?: string; cwd?: string }): number;
