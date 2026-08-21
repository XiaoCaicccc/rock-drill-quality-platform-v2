import { describe, expect, it } from "vitest";

import { normalizeCategoryDescription, normalizeCategoryName } from "./part-category";

describe("part category domain", () => {
  it("PART-CAT-01 trims display names and compares case-insensitively", () => {
    expect(normalizeCategoryName("  Rotary Head  ")).toEqual({ name: "Rotary Head", normalizedName: "rotary head" });
  });

  it("PART-CAT-02 treats blank descriptions as null and rejects blank names", () => {
    expect(normalizeCategoryDescription("  ")).toBeNull();
    expect(() => normalizeCategoryName(" ")).toThrow(TypeError);
  });

  it("PART-CAT-03 rejects Unicode-expanded normalized names beyond VARCHAR(200)", () => {
    const displayValue = "İ".repeat(101);
    expect(displayValue.length).toBeLessThanOrEqual(200);
    expect(() => normalizeCategoryName(displayValue)).toThrow(TypeError);
  });
});
