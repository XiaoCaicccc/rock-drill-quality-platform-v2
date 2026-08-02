import { PrismaClient } from "@prisma/client";

type PrismaGlobal = {
  prismaClient?: PrismaClient;
};

const prismaGlobal = globalThis as typeof globalThis & PrismaGlobal;

export function getPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for runtime database access.");
  }

  if (process.env.NODE_ENV === "production") {
    return new PrismaClient();
  }

  prismaGlobal.prismaClient ??= new PrismaClient();
  return prismaGlobal.prismaClient;
}

export function createTestPrismaClient(): PrismaClient {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL is required for database integration tests.");
  }

  return new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });
}
