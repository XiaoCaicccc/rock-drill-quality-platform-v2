import { describe, expect, it } from "vitest";
import { BUSINESS_TIME_ZONE, businessDateFromInstant, businessDateTimeInputToInstant, formatInstant, formatInstantForBusinessDisplay, isBusinessDate, nowInstant, parseBusinessDate, parseInstant } from "./index";

describe("platform time", () => {
  it("validates real business calendar dates", () => {
    expect(parseBusinessDate("2024-02-29")).toBe("2024-02-29");
    expect(isBusinessDate("2023-02-29")).toBe(false);
    expect(isBusinessDate("2026-04-31")).toBe(false);
    expect(isBusinessDate("0000-01-01")).toBe(false);
    expect(parseBusinessDate("0001-01-01")).toBe("0001-01-01");
    expect(isBusinessDate("1900-02-29")).toBe(false);
    expect(parseBusinessDate("2000-02-29")).toBe("2000-02-29");
    expect(() => parseBusinessDate("2026/07/30")).toThrow(RangeError);
  });

  it("normalizes valid instants to UTC Z and rejects invalid values", () => {
    expect(parseInstant("2026-07-30T01:23:45.678Z")).toBe("2026-07-30T01:23:45.678Z");
    expect(parseInstant("2026-07-30T09:23:45.678+08:00")).toBe("2026-07-30T01:23:45.678Z");
    expect(formatInstant(new Date("2026-07-30T01:23:45.678Z"))).toBe("2026-07-30T01:23:45.678Z");
    expect(() => parseInstant("not-a-date")).toThrow(RangeError);
    expect(() => parseInstant("2026-02-30T00:00:00Z")).toThrow(RangeError);
    expect(() => parseInstant("2026-07-30")).toThrow(RangeError);
    expect(() => parseInstant("07/30/2026")).toThrow(RangeError);
    expect(() => parseInstant("2026-07-30T09:23:45")).toThrow(RangeError);
    expect(() => formatInstant(new Date("invalid"))).toThrow(RangeError);
  });

  it("uses Asia/Shanghai independently of the runtime local time zone", () => {
    expect(BUSINESS_TIME_ZONE).toBe("Asia/Shanghai");
    expect(businessDateFromInstant(parseInstant("2026-07-29T16:30:00.000Z"))).toBe("2026-07-30");
  });

  it("converts Asia/Shanghai filter inputs to UTC instants at day boundaries", () => {
    expect(businessDateTimeInputToInstant("2026-08-20T00:00")).toBe("2026-08-19T16:00:00.000Z");
    expect(businessDateTimeInputToInstant("2026-08-20T23:59:59")).toBe("2026-08-20T15:59:59.000Z");
    expect(() => businessDateTimeInputToInstant("2026-08-20T00:00Z")).toThrow(RangeError);
  });

  it("formats UTC instants using the explicit Asia/Shanghai user convention", () => {
    expect(formatInstantForBusinessDisplay("2026-08-19T16:00:00.000Z")).toBe("2026-08-20 00:00:00");
    expect(formatInstantForBusinessDisplay("2026-08-20T15:59:59.000Z")).toBe("2026-08-20 23:59:59");
  });

  it("uses an injected clock for deterministic nowInstant", () => {
    expect(nowInstant({ now: (): Date => new Date("2026-07-30T01:23:45.678Z") })).toBe("2026-07-30T01:23:45.678Z");
  });
});
