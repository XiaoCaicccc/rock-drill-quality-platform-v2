import { identityError } from "../application/errors";

const usernamePattern = /^[A-Za-z0-9._-]+$/;

export function normalizeUsername(value: string): { username: string; normalizedUsername: string } {
  if (typeof value !== "string") throw identityError("INVALID_ACCOUNT_INPUT");
  const username = value.trim();
  if (username.length === 0 || !usernamePattern.test(username)) throw identityError("INVALID_ACCOUNT_INPUT");
  return { username, normalizedUsername: username.toLowerCase() };
}

export function assertPasswordPolicy(password: string): void {
  if (typeof password !== "string") throw identityError("INVALID_CREDENTIAL_INPUT");
  const codePointLength = Array.from(password).length;
  if (codePointLength < 15 || codePointLength > 128) throw identityError("INVALID_CREDENTIAL_INPUT");
}

export function normalizeDisplayName(value: string): string {
  if (typeof value !== "string") throw identityError("INVALID_ACCOUNT_INPUT");
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 200) throw identityError("INVALID_ACCOUNT_INPUT");
  return normalized;
}

export function normalizeUserAgent(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized.slice(0, 512);
}
