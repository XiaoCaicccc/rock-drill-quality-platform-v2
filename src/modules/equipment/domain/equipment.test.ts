import { describe, expect, it } from "vitest";
import { positionCode } from "./equipment";

describe("EquipmentPosition code validation", () => {
  it("uses deterministic ASCII-only uppercase normalization while preserving non-ASCII code points", () => {
    expect(positionCode("gear-01")).toEqual({ positionCode: "gear-01", normalizedPositionCode: "GEAR-01" });
    expect(positionCode("Gear-a")).toEqual({ positionCode: "Gear-a", normalizedPositionCode: "GEAR-A" });
    expect(positionCode("ß-slot")).toEqual({ positionCode: "ß-slot", normalizedPositionCode: "ß-SLOT" });
    expect(positionCode("中文-a")).toEqual({ positionCode: "中文-a", normalizedPositionCode: "中文-A" });
  });
});
