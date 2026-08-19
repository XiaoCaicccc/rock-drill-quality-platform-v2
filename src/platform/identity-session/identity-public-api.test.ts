import * as identityPublicApi from "./index";
import { describe, expect, it } from "vitest";

describe("identity-session public API", () => {
  it("does not expose Prisma, raw-token helpers, or concrete infrastructure", () => {
    expect(identityPublicApi).not.toHaveProperty("getPrismaClient");
    expect(identityPublicApi).not.toHaveProperty("createTestPrismaClient");
    expect(identityPublicApi).not.toHaveProperty("hashSessionToken");
    expect(identityPublicApi).not.toHaveProperty("NodeCryptoArgon2PasswordHasher");
  });
});
