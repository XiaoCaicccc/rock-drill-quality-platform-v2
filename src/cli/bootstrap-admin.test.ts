import { describe, expect, it, vi } from "vitest";

import { bootstrapFromCli, parseBootstrapArgs, safeBootstrapError } from "./bootstrap-admin";

const options = { organizationId: "org-1", primaryOrgUnitId: "unit-1", username: "alice", displayName: "Alice" };
const account = { id: "account-1", organizationId: "org-1", primaryOrgUnitId: "unit-1", username: "alice", displayName: "Alice", status: "ACTIVE" as const, createdAt: new Date(), updatedAt: new Date() };

describe("bootstrap-admin CLI adapter", () => {
  it("accepts only identity locator/display arguments and never a password argument", () => {
    expect(parseBootstrapArgs(["--organization-id", "org-1", "--primary-org-unit-id", "unit-1", "--username", "alice", "--display-name", "Alice"])).toEqual(options);
    expect(() => parseBootstrapArgs([...Object.entries(options).flatMap(([key, value]) => [`--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, value]), "--password", "secret"])).toThrow("Unknown bootstrap option.");
  });

  it("passes masked stdin password to the one application bootstrap capability", async () => {
    const bootstrapInitialAccount = vi.fn().mockResolvedValue(account);
    await expect(bootstrapFromCli(options, { readPassword: async () => "a sufficiently long password", createService: () => ({ bootstrapInitialAccount } as never) })).resolves.toEqual(account);
    expect(bootstrapInitialAccount).toHaveBeenCalledWith({ ...options, password: "a sufficiently long password" });
  });

  it("sanitizes unknown and known application failures", () => {
    expect(safeBootstrapError(new Error("Prisma connection string leaked"))).toBe("Bootstrap failed.");
    expect(safeBootstrapError(new Error("Password must contain 15 to 128 Unicode code points."))).toBe("Bootstrap failed.");
  });
});
