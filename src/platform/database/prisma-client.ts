import { PrismaClient } from "@prisma/client";

export function createPrismaClient(): PrismaClient {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL is required for database access.");
  }

  return new PrismaClient();
}
