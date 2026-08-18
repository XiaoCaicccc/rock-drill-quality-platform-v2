import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export function createMigrationChildEnvironment(environment) {
  const { TEST_DATABASE_URL, ...otherEnvironment } = environment;
  if (!TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required to deploy migrations for integration tests.");
  return { ...otherEnvironment, DATABASE_URL: TEST_DATABASE_URL };
}

export function createMigrationCommand(platform, environment, schemaPath) {
  const npmArguments = ["exec", "--", "prisma", "migrate", "deploy", "--schema", schemaPath];
  if (platform === "win32") {
    return { command: environment.ComSpec || "cmd.exe", arguments: ["/d", "/s", "/c", "npm.cmd", ...npmArguments] };
  }
  return { command: "npm", arguments: npmArguments };
}

export function runMigrationCommand({ platform, environment, schemaPath, cwd, spawn = spawnSync, writeError = console.error }) {
  const childEnvironment = createMigrationChildEnvironment(environment);
  const { command, arguments: commandArguments } = createMigrationCommand(platform, environment, schemaPath);
  const result = spawn(command, commandArguments, { cwd, env: childEnvironment, stdio: "inherit" });
  if (result.error) {
    writeError(result.error);
    return 1;
  }
  return typeof result.status === "number" ? result.status : 1;
}

export function main({ environment = process.env, platform = process.platform, cwd = process.cwd() } = {}) {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "rock-drill-prisma-test-"));
  const testSchemaPath = join(temporaryDirectory, "schema.prisma");
  try {
    cpSync("prisma/migrations", join(temporaryDirectory, "migrations"), { recursive: true });
    writeFileSync(testSchemaPath, readFileSync("prisma/schema.prisma", "utf8"), "utf8");
    return runMigrationCommand({ platform, environment, schemaPath: testSchemaPath, cwd });
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main();
