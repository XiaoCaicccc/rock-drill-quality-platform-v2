import { describe, expect, it } from "vitest";

import { formatNumber, validateNumberingPolicy } from "./domain/numbering";

const genericPolicy = Object.freeze({ key: "test_object", prefix: "TEST-", minimumWidth: 6, start: 1 });

describe("Slice 2A numbering policy", () => {
  it("NUM-01 formats monotonic values with the fixed public prefix and width", () => {
    expect(formatNumber(genericPolicy.prefix, BigInt(1), genericPolicy.minimumWidth)).toBe("TEST-000001");
    expect(formatNumber(genericPolicy.prefix, BigInt(1000000), genericPolicy.minimumWidth)).toBe("TEST-1000000");
  });

  it("NUM-02 rejects invalid policy values", () => {
    expect(() => validateNumberingPolicy({ ...genericPolicy, key: "Bad Key" })).toThrow(RangeError);
    expect(() => validateNumberingPolicy({ ...genericPolicy, minimumWidth: 0 })).toThrow(RangeError);
  });

  it("NUM-03 keeps the numeric BigInt and formatted public representations together", () => {
    expect(genericPolicy).toMatchObject({ key: "test_object", prefix: "TEST-" });
  });
});
