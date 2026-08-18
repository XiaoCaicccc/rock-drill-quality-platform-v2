import { describe, expect, it, vi } from "vitest";

import { createMigrationChildEnvironment, createMigrationCommand, runMigrationCommand } from "../../../scripts/migrate-test.mjs";

describe("test migration process launcher", () => {
  it("uses ComSpec to launch npm.cmd on Windows and maps only the test database URL", () => {
    const spawn = vi.fn(() => ({ status: 0 }));
    const environment = { ComSpec: "C:\\Windows\\System32\\cmd.exe", TEST_DATABASE_URL: "test-url", DATABASE_URL: "runtime-url", PATH: "path" };
    const status = runMigrationCommand({ platform: "win32", environment, schemaPath: "C:\\temp\\schema.prisma", cwd: "C:\\repo", spawn });
    expect(status).toBe(0);
    expect(spawn).toHaveBeenCalledWith("C:\\Windows\\System32\\cmd.exe", ["/d", "/s", "/c", "npm.cmd", "exec", "--", "prisma", "migrate", "deploy", "--schema", "C:\\temp\\schema.prisma"], {
      cwd: "C:\\repo", env: { ComSpec: "C:\\Windows\\System32\\cmd.exe", PATH: "path", DATABASE_URL: "test-url" }, stdio: "inherit",
    });
  });

  it("uses npm directly outside Windows", () => {
    expect(createMigrationCommand("linux", {}, "/tmp/schema.prisma")).toEqual({ command: "npm", arguments: ["exec", "--", "prisma", "migrate", "deploy", "--schema", "/tmp/schema.prisma"] });
  });

  it("reports a spawn error and returns non-zero", () => {
    const error = new Error("spawn failed");
    const writeError = vi.fn();
    const status = runMigrationCommand({ platform: "win32", environment: { TEST_DATABASE_URL: "test-url" }, schemaPath: "schema.prisma", cwd: ".", spawn: () => ({ status: null, error }), writeError });
    expect(status).toBe(1);
    expect(writeError).toHaveBeenCalledWith(error);
  });

  it("preserves Prisma's non-zero exit status", () => {
    const status = runMigrationCommand({ platform: "linux", environment: { TEST_DATABASE_URL: "test-url" }, schemaPath: "schema.prisma", cwd: ".", spawn: () => ({ status: 7 }) });
    expect(status).toBe(7);
  });

  it("rejects a missing test database URL before starting a child process", () => {
    expect(() => createMigrationChildEnvironment({ DATABASE_URL: "runtime-url" })).toThrow("TEST_DATABASE_URL is required");
  });
});
