import { afterAll, describe, expect, it } from "vitest";

import { createTestPrismaClient } from "./prisma-client";

const prisma = createTestPrismaClient();
const testRowIds = {
  db02: "db02-transaction-commit",
  db03: "db03-transaction-rollback",
  db04: "db04-cleanup",
} as const;

async function removeTestObjects(): Promise<void> {
  await prisma.$executeRaw`DROP SCHEMA IF EXISTS "codex_slice_0b_3_test" CASCADE`;
}

async function createTestObjects(): Promise<void> {
  await removeTestObjects();
  await prisma.$executeRaw`CREATE SCHEMA "codex_slice_0b_3_test"`;
  await prisma.$executeRaw`
    CREATE TABLE "codex_slice_0b_3_test"."transaction_proof" (
      test_id text PRIMARY KEY,
      value integer NOT NULL
    )
  `;
}

async function withTestObjects(
  action: () => Promise<void>,
): Promise<void> {
  try {
    await createTestObjects();
    await action();
  } finally {
    await removeTestObjects();
  }
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("PostgreSQL Prisma database foundation", () => {
  it("DB-01 connects and confirms PostgreSQL major version 17", async () => {
    const versionRows = await prisma.$queryRaw<Array<{ server_version_num: number }>>`
      SELECT current_setting('server_version_num')::integer AS server_version_num
    `;

    expect(versionRows[0]?.server_version_num).toBeGreaterThanOrEqual(170000);
    expect(versionRows[0]?.server_version_num).toBeLessThan(180000);
  });

  it("DB-02 persists data after a committed transaction", async () => {
    await withTestObjects(async () => {
      await prisma.$transaction(async (transaction) => {
        await transaction.$executeRaw`
          INSERT INTO "codex_slice_0b_3_test"."transaction_proof" (test_id, value)
          VALUES (${testRowIds.db02}, 1)
        `;
      });

      const committedRows = await prisma.$queryRaw<Array<{ count: number }>>`
        SELECT count(*)::integer AS count
        FROM "codex_slice_0b_3_test"."transaction_proof"
        WHERE test_id = ${testRowIds.db02}
      `;
      expect(committedRows[0]?.count).toBe(1);
    });
  });

  it("DB-03 rolls back data when a transaction throws", async () => {
    await withTestObjects(async () => {
      await expect(
        prisma.$transaction(async (transaction) => {
          await transaction.$executeRaw`
            INSERT INTO "codex_slice_0b_3_test"."transaction_proof" (test_id, value)
            VALUES (${testRowIds.db03}, 2)
          `;
          throw new Error("rollback proof");
        }),
      ).rejects.toThrow("rollback proof");

      const rolledBackRows = await prisma.$queryRaw<Array<{ count: number }>>`
        SELECT count(*)::integer AS count
        FROM "codex_slice_0b_3_test"."transaction_proof"
        WHERE test_id = ${testRowIds.db03}
      `;
      expect(rolledBackRows[0]?.count).toBe(0);
    });
  });

  it("DB-04 leaves no tables, schemas, or test data behind", async () => {
    await withTestObjects(async () => {
      await prisma.$executeRaw`
        INSERT INTO "codex_slice_0b_3_test"."transaction_proof" (test_id, value)
        VALUES (${testRowIds.db04}, 4)
      `;
    });

    const objectRows = await prisma.$queryRaw<Array<{ schema_exists: boolean; table_exists: boolean }>>`
      SELECT
        to_regnamespace('codex_slice_0b_3_test') IS NOT NULL AS schema_exists,
        to_regclass('codex_slice_0b_3_test.transaction_proof') IS NOT NULL AS table_exists
    `;

    expect(objectRows[0]?.schema_exists).toBe(false);
    expect(objectRows[0]?.table_exists).toBe(false);
  });
});
