import { describe, expect, it } from "vitest";

import { categoryPageQuery } from "./part-categories";

describe("part category management pagination", () => {
  it("requests deterministic pages instead of a permanent first-100 window", () => {
    expect(categoryPageQuery(2, { search: "bearing", status: "ACTIVE" })).toBe("page=2&pageSize=25&search=bearing&status=ACTIVE");
  });
});
