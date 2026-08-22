import { describe, expect, it } from "vitest";
import { positionCode } from "./equipment";

describe("EquipmentPosition code validation", () => {
  it("rejects an expanding Unicode normalization that would overflow normalizedPositionCode", () => {
    expect(() => positionCode("ß".repeat(100))).toThrow("POSITION_CODE_INVALID");
  });

  it("keeps a non-ASCII normalized value inside the frozen database limit", () => {
    expect(positionCode("ß-slot")).toEqual({ positionCode: "ß-slot", normalizedPositionCode: "SS-SLOT" });
  });
});
