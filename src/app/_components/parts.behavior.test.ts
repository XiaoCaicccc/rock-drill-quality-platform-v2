import { describe, expect, it } from "vitest";

import { appendCategories, canLoadMoreCategories, ensureCurrentCategory, preserveCategoryId, type Category } from "./parts";

const current: Category = { id: "category-120", name: "Current", status: "ACTIVE" };

describe("part category selector behavior", () => {
  it("retains a current category that is beyond the first loaded page", () => {
    const loaded = Array.from({ length: 100 }, (_, index) => ({ id: `category-${index + 1}`, name: `Category ${index + 1}`, status: "ACTIVE" as const }));
    const result = ensureCurrentCategory(loaded, current);
    expect(result[0]).toEqual(current);
    expect(result).toHaveLength(101);
    expect(result.filter((category) => category.id === current.id)).toHaveLength(1);
  });

  it("makes category 130 an ACTIVE reassignment target after loading the next page", () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({ id: `category-${index + 1}`, name: `Category ${index + 1}`, status: "ACTIVE" as const }));
    const secondPage = Array.from({ length: 30 }, (_, index) => ({ id: `category-${index + 101}`, name: `Category ${index + 101}`, status: "ACTIVE" as const }));
    const targets = appendCategories(firstPage, secondPage);
    expect(targets.find((category) => category.id === "category-130")).toMatchObject({ status: "ACTIVE" });
  });

  it("retains an inactive current category so a name-only edit preserves its id", () => {
    const inactive = { ...current, status: "INACTIVE" as const };
    const result = ensureCurrentCategory([], inactive);
    expect(result).toEqual([inactive]);
    expect(result[0]?.id).toBe(inactive.id);
    expect(result[0]?.status).toBe("INACTIVE");
    expect(preserveCategoryId(inactive.id, null)).toBe(inactive.id);
  });

  it("exposes another category page when more than the first page exists", () => {
    expect(canLoadMoreCategories(101, 100)).toBe(true);
    expect(canLoadMoreCategories(100, 100)).toBe(false);
  });
});
