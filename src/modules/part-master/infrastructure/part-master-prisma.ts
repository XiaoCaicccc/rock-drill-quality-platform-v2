export function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === code;
}

export function prismaConflictTarget(error: unknown): string[] {
  if (typeof error !== "object" || error === null || !("meta" in error)) return [];
  const meta = (error as { meta?: { target?: unknown } }).meta;
  return Array.isArray(meta?.target) ? meta.target.map(String) : [];
}

export function prismaConflictConstraint(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("meta" in error)) return null;
  const meta = (error as { meta?: { constraint?: unknown } }).meta;
  return typeof meta?.constraint === "string" ? meta.constraint : null;
}
