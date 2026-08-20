import { describe, expect, it } from "vitest";
import { platformManagementPermissions } from "./access-permissions";

describe("Slice 1D platform management permissions", () => {
  it("declares the approved machine codes with no non-ADMIN grants", () => {
    expect(Object.values(platformManagementPermissions).map((permission) => permission.code)).toEqual(["account.view", "account.create", "account.update", "account.set_status", "account.reset_password", "role_assignment.view", "role_assignment.manage", "organization.view", "audit.view"]);
    expect(Object.values(platformManagementPermissions).every((permission) => permission.grants.length === 0)).toBe(true);
  });
});
