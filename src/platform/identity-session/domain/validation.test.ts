import { describe, expect, it } from "vitest";

import { assertPasswordPolicy, normalizeUsername } from "./validation";

describe("identity validation", () => {
  it("normalizes usernames without allowing blank or unsupported input", () => {
    expect(normalizeUsername("  Alice.User  ")).toEqual({ username: "Alice.User", normalizedUsername: "alice.user" });
    expect(() => normalizeUsername(" ")).toThrow();
    expect(() => normalizeUsername("alice@example.com")).toThrow();
  });

  it("measures password length in Unicode code points", () => {
    expect(() => assertPasswordPolicy("a".repeat(14))).toThrow();
    expect(() => assertPasswordPolicy("😀".repeat(15))).not.toThrow();
    expect(() => assertPasswordPolicy("a".repeat(129))).toThrow();
  });
});
