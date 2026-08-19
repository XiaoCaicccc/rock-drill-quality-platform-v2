import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputRoot = resolve(repositoryRoot, ".codex-runtime", "bootstrap-admin");
const compiledEntry = resolve(outputRoot, "cli", "bootstrap-admin.js");

export function isMainModule(metaUrl = import.meta.url, argv1 = process.argv[1]) {
  return argv1 !== undefined && resolve(fileURLToPath(metaUrl)) === resolve(argv1);
}

export function runBootstrapAdmin(argv = process.argv.slice(2), dependencies = {}) {
  const platform = dependencies.platform ?? process.platform;
  const environment = dependencies.environment ?? process.env;
  const spawn = dependencies.spawnSync ?? spawnSync;
  const executable = dependencies.execPath ?? process.execPath;
  const npmCommand = platform === "win32" ? (environment.ComSpec || "cmd.exe") : "npm";
  const npmArguments = ["exec", "--", "tsc", "--project", "scripts/tsconfig.bootstrap.json", "--pretty", "false"];
  const compileArguments = platform === "win32" ? ["/d", "/s", "/c", "npm.cmd", ...npmArguments] : npmArguments;
  const compile = spawn(npmCommand, compileArguments, { cwd: repositoryRoot, stdio: "inherit", windowsHide: true });
  if (compile.error || compile.status !== 0) return compile.status ?? 1;
  const execution = spawn(executable, [compiledEntry, ...argv], { cwd: repositoryRoot, stdio: "inherit", env: environment, windowsHide: true });
  if (execution.error) return 1;
  return execution.status ?? 1;
}

if (isMainModule()) process.exitCode = runBootstrapAdmin();
