import { AppError } from "../platform/errors";
import { createIdentitySessionService } from "../platform/identity-session";
import type { AccountDto, IdentitySessionService } from "../platform/identity-session";

export interface BootstrapCliOptions {
  readonly organizationId: string;
  readonly primaryOrgUnitId: string;
  readonly username: string;
  readonly displayName: string;
}

export interface BootstrapCliDependencies {
  readonly readPassword?: () => Promise<string>;
  readonly createService?: () => IdentitySessionService;
}

function usageError(): Error { return new Error("Usage requires --organization-id, --primary-org-unit-id, --username, and --display-name."); }

export function parseBootstrapArgs(argv: readonly string[]): BootstrapCliOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === undefined || value === undefined || !key.startsWith("--") || value.startsWith("--")) throw usageError();
    if (!["--organization-id", "--primary-org-unit-id", "--username", "--display-name"].includes(key)) throw new Error("Unknown bootstrap option.");
    values.set(key.slice(2), value);
  }
  const organizationId = values.get("organization-id");
  const primaryOrgUnitId = values.get("primary-org-unit-id");
  const username = values.get("username");
  const displayName = values.get("display-name");
  if (!organizationId || !primaryOrgUnitId || !username || !displayName) throw usageError();
  return { organizationId, primaryOrgUnitId, username, displayName };
}

export function readMaskedPassword(): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("bootstrap-admin requires an interactive terminal for masked password input.");
  return new Promise((resolve, reject) => {
    let password = "";
    const onData = (chunk: Buffer | string) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") { cleanup(); reject(new Error("Bootstrap cancelled.")); return; }
        if (character === "\r" || character === "\n") { cleanup(); process.stdout.write("\n"); resolve(password); return; }
        if (character === "\u007f") { if (password.length > 0) { password = password.slice(0, -1); process.stdout.write("\b \b"); } continue; }
        password += character;
        process.stdout.write("*");
      }
    };
    const cleanup = () => { process.stdin.setRawMode?.(false); process.stdin.pause(); process.stdin.off("data", onData); };
    process.stdout.write("Password: ");
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.on("data", onData);
  });
}

export async function bootstrapFromCli(options: BootstrapCliOptions, dependencies: BootstrapCliDependencies = {}): Promise<AccountDto> {
  const password = await (dependencies.readPassword ?? readMaskedPassword)();
  return (dependencies.createService ?? createIdentitySessionService)().bootstrapInitialAccount({ ...options, password });
}

export function safeBootstrapError(error: unknown): string {
  if (error instanceof AppError && error.internalMessage === "BOOTSTRAP_ALREADY_COMPLETED") return "Bootstrap has already been completed.";
  if (error instanceof AppError) return error.publicMessage;
  if (error instanceof Error && (error.message === "Unknown bootstrap option." || error.message.startsWith("Usage ") || error.message.includes("interactive terminal") || error.message === "Bootstrap cancelled.")) return error.message;
  return "Bootstrap failed.";
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const account = await bootstrapFromCli(parseBootstrapArgs(argv));
  console.log(`Initial Account created: ${account.id}`);
}

if (require.main === module) {
  main().catch((error: unknown) => { console.error(safeBootstrapError(error)); process.exitCode = 1; });
}
