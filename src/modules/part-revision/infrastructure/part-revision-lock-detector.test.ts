import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { extractQueryText, isRowLockQuery } from "./part-revision-lock-detector";

describe("PartRevision test lock detector", () => {
  it("recognizes Prisma.sql PartMaster and PartRevision FOR UPDATE queries", () => {
    const partId = "11111111-1111-4111-8111-111111111111";
    const master = Prisma.sql`SELECT id FROM part_master WHERE id = ${partId}::uuid FOR UPDATE`;
    const revision = Prisma.sql`SELECT id FROM part_revision WHERE id = ${partId}::uuid FOR UPDATE`;
    expect(extractQueryText(master)).toContain("part_master");
    expect(isRowLockQuery(master, "part_master")).toBe(true);
    expect(isRowLockQuery(revision, "part_revision")).toBe(true);
  });

  it("recognizes tagged-template strings without relying on SqlObject stringification", () => {
    const strings = ["SELECT id FROM part_master WHERE id = ", "::uuid FOR UPDATE"] as unknown as TemplateStringsArray;
    expect(isRowLockQuery(strings, "part_master")).toBe(true);
  });
});
