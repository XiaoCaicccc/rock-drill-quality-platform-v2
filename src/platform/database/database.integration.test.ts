import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";

import { createPrismaClient } from "./prisma-client";

const prisma = createPrismaClient();
const testRunPrefix = `slice_0b_3_${randomUUID().replaceAll("-", "")}`;

function createTableName(testId: string): string {
  return `${testRunPrefix}_${testId}_${randomUUID().replaceAll("-", "")}`;
}

function createTestId(name: string): string {
  return `${name}_${randomUUID().replaceAll("-", "")}`;
}

async function withTestTable(
  testId: string,
  action: (tableName: string) => Promise<void>,
): Promise<void> {
  const tableName = createTableName(testId);

  await prisma.$executeRawUnsafe(`CREATE TABLE "${tableName}" (value integer NOT NULL)`);

  try {
    await action(tableName);
  } finally {
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${tableName}"`);
  }
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("PostgreSQL Prisma database foundation", () => {
  it("DB-01 connects and confirms PostgreSQL major version 17", async () => {
    const testId = createTestId("db01");
    const versionRows = await prisma.$queryRawUnsafe<Array<{ server_version_num: string }>>(
      `/* ${testId} */ SHOW server_version_num`,
    );

    expect(Number.parseInt(versionRows[0]?.server_version_num ?? "", 10)).toBeGreaterThanOrEqual(170000);
    expect(Number.parseInt(versionRows[0]?.server_version_num ?? "", 10)).toBeLessThan(180000);
  });

  it("DB-02 persists data after a committed transaction", async () => {
    await withTestTable(createTestId("db02"), async (tableName) => {
      await prisma.$transaction(async (transaction) => {
        await transaction.$executeRawUnsafe(`INSERT INTO "${tableName}" (value) VALUES (1)`);
      });

      const committedRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT count(*) AS count FROM "${tableName}"`,
      );
      expect(Number(committedRows[0]?.count)).toBe(1);
    });
  });

  it("DB-03 rolls back data when a transaction throws", async () => {
    await withTestTable(createTestId("db03"), async (tableName) => {
      await expect(
        prisma.$transaction(async (transaction) => {
          await transaction.$executeRawUnsafe(`INSERT INTO "${tableName}" (value) VALUES (2)`);
          throw new Error("rollback proof");
        }),
      ).rejects.toThrow("rollback proof");

      const rolledBackRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT count(*) AS count FROM "${tableName}"`,
      );
      expect(Number(rolledBackRows[0]?.count)).toBe(0);
    });
  });

  it("DB-04 leaves no tables, schemas, or test data behind", async () => {
    const testId = createTestId("db04");
    const testObjectPattern = `${testRunPrefix}_${testId}%`;

    const [tableRows, schemaRows] = await Promise.all([
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) AS count
        FROM pg_catalog.pg_class AS relation
        INNER JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
        WHERE namespace.nspname = 'public'
          AND relation.relkind IN ('r', 'p')
          AND relation.relname LIKE ${testRunPrefix + "%"}
      `,
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) AS count
        FROM pg_catalog.pg_namespace
        WHERE nspname LIKE ${testObjectPattern}
      `,
    ]);

    expect(Number(tableRows[0]?.count)).toBe(0);
    expect(Number(schemaRows[0]?.count)).toBe(0);
  });
});
