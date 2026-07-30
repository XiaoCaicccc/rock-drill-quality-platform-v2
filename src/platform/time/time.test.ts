import { describe, expect, it } from "vitest";
import { BUSINESS_TIME_ZONE, businessDateFromInstant, formatInstant, isBusinessDate, nowInstant, parseBusinessDate, parseInstant } from "./index";

describe("platform time", () => {
  it("validates real business calendar dates", () => {
    expect(parseBusinessDate("2024-02-29")).toBe("2024-02-29");
    expect(isBusinessDate("2023-02-29")).toBe(false);
    expect(isBusinessDate("2026-04-31")).toBe(false);
    expect(() => parseBusinessDate("2026/07/30")).toThrow(RangeError);
  });

  it("normalizes valid instants to UTC Z and rejects invalid values", () => {
    expect(parseInstant("2026-07-30T09:23:45.678+08:00")).toBe("2026-07-30T01:23:45.678Z");
    expect(formatInstant(new Date("2026-07-30T01:23:45.678Z"))).toBe("2026-07-30T01:23:45.678Z");
    expect(() => parseInstant("not-a-date")).toThrow(RangeError);
    expect(() => formatInstant(new Date("invalid"))).toThrow(RangeError);
  });

  it("uses Asia/Shanghai independently of the runtime local time zone", () => {
    expect(BUSINESS_TIME_ZONE).toBe("Asia/Shanghai");
    expect(businessDateFromInstant("2026-07-29T16:30:00.000Z")).toBe("2026-07-30");
  });

  it("uses an injected clock for deterministic nowInstant", () => {
    expect(nowInstant({ now: (): Date => new Date("2026-07-30T01:23:45.678Z") })).toBe("2026-07-30T01:23:45.678Z");
  });
});
