import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPrismaClient: vi.fn(() => {
    throw new Error("health route must not request Prisma Client");
  }),
}));

vi.mock("@/platform/database", () => ({
  getPrismaClient: mocks.getPrismaClient,
}));

import { GET } from "./route";

it("returns the fixed JSON liveness response without requesting a Prisma client", async () => {
  const response = GET();
  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("application/json");
  expect(payload).toEqual({
    status: "ok",
    service: "rock-drill-quality-platform-v2",
  });
  expect(payload).not.toHaveProperty("DATABASE_URL");
  expect(payload).not.toHaveProperty("TEST_DATABASE_URL");
  expect(mocks.getPrismaClient).not.toHaveBeenCalled();
});
