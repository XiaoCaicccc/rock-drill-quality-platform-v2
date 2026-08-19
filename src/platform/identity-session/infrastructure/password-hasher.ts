import { argon2, createHash, randomBytes, timingSafeEqual } from "node:crypto";

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, encodedHash: string): Promise<boolean>;
}

const algorithm = "argon2id" as const;
const memory = 19_456;
const passes = 2;
const parallelism = 1;
const saltBytes = 16;
const tagBytes = 32;
const encodedPattern = /^v1\$argon2id\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9_-]{22})\$([A-Za-z0-9_-]{43})$/;

function encode(salt: Buffer, digest: Buffer): string {
  return `v1$argon2id$m=${memory},t=${passes},p=${parallelism}$${salt.toString("base64url")}$${digest.toString("base64url")}`;
}

function derive(password: string, salt: Buffer, options: { memory: number; passes: number; parallelism: number; tagLength: number }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      argon2(algorithm, { message: Buffer.from(password, "utf8"), nonce: salt, memory: options.memory, passes: options.passes, parallelism: options.parallelism, tagLength: options.tagLength }, (error, digest) => {
        if (error) reject(error);
        else resolve(Buffer.from(digest));
      });
    } catch (error) {
      reject(error);
    }
  });
}

export class NodeCryptoArgon2PasswordHasher implements PasswordHasher {
  public async hash(password: string): Promise<string> {
    const salt = randomBytes(saltBytes);
    const digest = await derive(password, salt, { memory, passes, parallelism, tagLength: tagBytes });
    return encode(salt, digest);
  }

  public async verify(password: string, encodedHash: string): Promise<boolean> {
    const match = encodedPattern.exec(encodedHash);
    if (match === null) return false;
    const [, memoryText, passesText, parallelismText, saltText, digestText] = match;
    const expected = Buffer.from(digestText!, "base64url");
    const actual = await derive(password, Buffer.from(saltText!, "base64url"), { memory: Number(memoryText), passes: Number(passesText), parallelism: Number(parallelismText), tagLength: expected.length });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}

export const dummyPasswordHash = "v1$argon2id$m=19456,t=2,p=1$AQEBAQEBAQEBAQEBAQEBAQ$6T_SekP6cfNbRDXn95r9baHAqOcf0TPX-Z8AdsaStFU";

export function hashSessionToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function createRawSessionToken(): string {
  return randomBytes(32).toString("base64url");
}
