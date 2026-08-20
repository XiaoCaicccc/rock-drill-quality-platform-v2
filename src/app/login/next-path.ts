const allowedNextPaths = new Set(["/", "/admin/users", "/account/security"]);

export function safeNextPath(value: string | null | undefined): string {
  if (!value || !allowedNextPaths.has(value) || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
