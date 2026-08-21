import { describe, expect, it } from "vitest";

import { normalizeDrawingNumber, normalizePartDescription, normalizePartName } from "./part-master";

describe("part master domain", () => {
  it("PART-DOMAIN-01 keeps Part Number system-owned and normalizes drawing numbers", () => {
    expect(normalizeDrawingNumber("  dr-001/a  ")).toEqual({ drawingNumber: "dr-001/a", normalizedDrawingNumber: "DR-001/A" });
    expect(normalizePartName("  Rotation head  ")).toBe("Rotation head");
  });

  it("PART-DOMAIN-02 normalizes optional descriptions and rejects blank names", () => {
    expect(normalizePartDescription("  ")).toBeNull();
    expect(() => normalizePartName("\t")).toThrow(TypeError);
  });

  it("PART-DOMAIN-03 rejects Unicode-expanded normalized drawing values beyond VARCHAR(200)", () => {
    const displayValue = "ß".repeat(101);
    expect(displayValue.length).toBeLessThanOrEqual(200);
    expect(() => normalizeDrawingNumber(displayValue)).toThrow(TypeError);
  });
});
