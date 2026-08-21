/** Test-only support for recognizing Prisma raw-query lock calls. */
export function extractQueryText(argument: unknown): string {
  if (typeof argument === "string") return argument;
  if (Array.isArray(argument)) return argument.join("");
  if (typeof argument === "object" && argument !== null) {
    const candidate = argument as { sql?: unknown; text?: unknown; strings?: unknown };
    for (const value of [candidate.sql, candidate.text, candidate.strings]) {
      if (typeof value === "string") return value;
      if (Array.isArray(value)) return value.join("");
    }
  }
  return "";
}

export function isRowLockQuery(argument: unknown, table: "part_master" | "part_revision"): boolean {
  const query = extractQueryText(argument).toLowerCase();
  return query.includes(table) && query.includes("for update");
}
