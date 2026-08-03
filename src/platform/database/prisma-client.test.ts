import { afterEach, expect, it } from "vitest";

import { createTestPrismaClient, getPrismaClient } from "./prisma-client";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalTestDatabaseUrl = process.env.TEST_DATABASE_URL;

afterEach(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }

  if (originalTestDatabaseUrl === undefined) {
    delete process.env.TEST_DATABASE_URL;
  } else {
    process.env.TEST_DATABASE_URL = originalTestDatabaseUrl;
  }
});

it("does not use TEST_DATABASE_URL as a runtime database fallback", () => {
  delete process.env.DATABASE_URL;
  process.env.TEST_DATABASE_URL = "test-only";

  expect(getPrismaClient).toThrow("DATABASE_URL is required for runtime database access.");
});

it("does not use DATABASE_URL as a test database fallback", () => {
  process.env.DATABASE_URL = "runtime-only";
  delete process.env.TEST_DATABASE_URL;

  expect(createTestPrismaClient).toThrow("TEST_DATABASE_URL is required for database integration tests.");
});

it("returns the same runtime client instance without connecting", async () => {
  process.env.DATABASE_URL = "postgresql://user:password@localhost:5432/runtime_database";

  const firstClient = getPrismaClient();
  const secondClient = getPrismaClient();

  expect(secondClient).toBe(firstClient);

  await firstClient.$disconnect();
});
