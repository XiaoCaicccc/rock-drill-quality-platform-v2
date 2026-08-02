import { PrismaClient } from "@prisma/client";

type PrismaGlobal = {
  prismaClient?: PrismaClient;
};

const prismaGlobal = globalThis as typeof globalThis & PrismaGlobal;
let runtimePrismaClient: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for runtime database access.");
  }

  runtimePrismaClient ??= process.env.NODE_ENV === "development"
    ? prismaGlobal.prismaClient ?? new PrismaClient()
    : new PrismaClient();

  if (process.env.NODE_ENV === "development") {
    prismaGlobal.prismaClient = runtimePrismaClient;
  }

  return runtimePrismaClient;
}

export function createTestPrismaClient(): PrismaClient {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL is required for database integration tests.");
  }

  return new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });
}
