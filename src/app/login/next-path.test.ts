import { describe, expect, it } from "vitest";
import { safeNextPath } from "./next-path";

describe("safe login next path", () => {
  it.each(["/", "/admin/users", "/account/security"])("allows %s", (path) => expect(safeNextPath(path)).toBe(path));
  it.each(["https://evil.com", "//evil.com", "javascript:alert(1)", "/admin/audit", "", undefined])("falls back for %s", (path) => expect(safeNextPath(path)).toBe("/"));
});
