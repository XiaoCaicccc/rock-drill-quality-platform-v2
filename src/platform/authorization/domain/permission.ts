import { dataScopes, roleCodes, type DataScope, type PermissionCode, type PermissionDefinition, type PermissionDefinitionInput, type PermissionSeparation, type RoleCode } from "./authorization";

const permissionCodePattern = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;

export function isRoleCode(value: string): value is RoleCode { return roleCodes.some((role) => role === value); }
export function isDataScope(value: string): value is DataScope { return dataScopes.some((scope) => scope === value); }

function isSeparation(value: string): value is PermissionSeparation { return value === "NONE" || value === "CREATOR_REVIEW"; }

export function definePermission(input: PermissionDefinitionInput): PermissionDefinition {
  if (typeof input.code !== "string" || !permissionCodePattern.test(input.code)) throw new RangeError("Permission code must use module.business_action format.");
  const separation = input.separation ?? "NONE";
  if (!isSeparation(separation)) throw new RangeError("Permission separation is invalid.");
  if (!Array.isArray(input.grants)) throw new TypeError("Permission grants must be an array.");

  const seen = new Set<string>();
  const grants = input.grants.map((grant) => {
    if (!grant || !isRoleCode(grant.role) || !isDataScope(grant.dataScope)) throw new RangeError("Permission grant is invalid.");
    const key = `${grant.role}:${grant.dataScope}`;
    if (seen.has(key)) throw new RangeError("Permission grant role and Data Scope must be unique.");
    seen.add(key);
    return Object.freeze({ role: grant.role, dataScope: grant.dataScope });
  });

  return Object.freeze({ code: input.code as PermissionCode, grants: Object.freeze(grants), separation });
}
