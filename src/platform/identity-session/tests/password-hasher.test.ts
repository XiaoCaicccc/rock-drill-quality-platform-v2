import { describe, expect, it } from "vitest";

import { NodeCryptoArgon2PasswordHasher } from "../infrastructure/password-hasher";

describe("NodeCryptoArgon2PasswordHasher", () => {
  it("uses the frozen project Argon2id parameters and verifies in constant-time shape", async () => {
    const hasher = new NodeCryptoArgon2PasswordHasher();
    const encoded = await hasher.hash("correct horse battery staple");
    expect(encoded).toMatch(/^v1\$argon2id\$m=19456,t=2,p=1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{43}$/);
    await expect(hasher.verify("correct horse battery staple", encoded)).resolves.toBe(true);
    await expect(hasher.verify("wrong horse battery staple", encoded)).resolves.toBe(false);
  });
});
