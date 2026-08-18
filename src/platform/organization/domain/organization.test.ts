import { describe, expect, it } from "vitest";

import { normalizeCode, normalizeName, normalizeSortOrder } from "./organization";

describe("organization domain normalization", () => {
  it("ORG-01 normalizes business codes to trimmed uppercase", () => {
    expect(normalizeCode("  plant-01  ")).toBe("PLANT-01");
  });

  it("ORG-02 rejects blank business codes and names", () => {
    expect(() => normalizeCode("  ")).toThrow(TypeError);
    expect(() => normalizeName("\t")).toThrow(TypeError);
  });

  it("ORG-03 preserves name case while trimming", () => {
    expect(normalizeName("  Main Workshop  ")).toBe("Main Workshop");
  });

  it("ORG-04 accepts only non-negative integer sort orders", () => {
    expect(normalizeSortOrder(0)).toBe(0);
    expect(() => normalizeSortOrder(-1)).toThrow(TypeError);
    expect(() => normalizeSortOrder(1.5)).toThrow(TypeError);
  });
});
