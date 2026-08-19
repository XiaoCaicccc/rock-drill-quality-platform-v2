import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";

import { isMainModule, runBootstrapAdmin } from "../../scripts/bootstrap-admin.mjs";

describe("bootstrap-admin executable wrapper", () => {
  it("compares the executable path through file URLs without platform-specific string construction", () => {
    const script = resolve("scripts", "bootstrap-admin.mjs");
    expect(isMainModule(pathToFileURL(script).href, script)).toBe(true);
    expect(isMainModule(pathToFileURL(script).href, resolve("scripts", "other.mjs"))).toBe(false);
  });

  it("compiles and launches the generated CommonJS entry through the Windows command path", () => {
    const spawn = vi.fn()
      .mockReturnValueOnce({ status: 0 })
      .mockReturnValueOnce({ status: 0 });
    const environment = { ComSpec: "C:\\Windows\\System32\\cmd.exe", NODE_ENV: "test" } as const;

    expect(runBootstrapAdmin(["--organization-id", "org-1"], {
      platform: "win32",
      environment,
      execPath: "C:\\Program Files\\nodejs\\node.exe",
      spawnSync: spawn,
    })).toBe(0);

    expect(spawn).toHaveBeenNthCalledWith(1, environment.ComSpec, [
      "/d", "/s", "/c", "npm.cmd", "exec", "--", "tsc", "--project", "scripts/tsconfig.bootstrap.json", "--pretty", "false",
    ], expect.objectContaining({ windowsHide: true }));
    expect(spawn).toHaveBeenNthCalledWith(2, "C:\\Program Files\\nodejs\\node.exe", [
      expect.stringMatching(/[\\/]\.codex-runtime[\\/]bootstrap-admin[\\/]cli[\\/]bootstrap-admin\.js$/),
      "--organization-id", "org-1",
    ], expect.objectContaining({ env: environment, windowsHide: true }));
  });

  it("executes the real wrapper and generated entry while keeping usage failures sanitized", () => {
    const result = spawnSync(process.execPath, [resolve("scripts", "bootstrap-admin.mjs")], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: "postgresql://must-not-appear.invalid/secret" },
      timeout: 30_000,
      windowsHide: true,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Usage requires");
    expect(`${result.stdout}${result.stderr}`).not.toContain("must-not-appear.invalid");
  }, 40_000);
});
