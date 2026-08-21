export interface NumberingPolicy {
  readonly key: string;
  readonly prefix: string;
  readonly minimumWidth: number;
  readonly start: number;
}

export interface NumberingService {
  allocate(organizationId: string, policy: NumberingPolicy): Promise<NumberAllocation>;
}

export interface NumberAllocation { readonly value: bigint; readonly formatted: string; }

export function formatNumber(prefix: string, value: bigint, minimumWidth: number): string {
  return `${prefix}${value.toString().padStart(minimumWidth, "0")}`;
}

export function validateNumberingPolicy(policy: NumberingPolicy): void {
  if (!/^[a-z][a-z0-9_]*$/.test(policy.key)) throw new RangeError("Numbering key is invalid.");
  if (policy.prefix.length === 0 || policy.prefix.length > 32) throw new RangeError("Numbering prefix is invalid.");
  if (!Number.isInteger(policy.minimumWidth) || policy.minimumWidth < 1 || policy.minimumWidth > 64) throw new RangeError("Numbering minimum width is invalid.");
  if (!Number.isSafeInteger(policy.start) || policy.start < 1) throw new RangeError("Numbering start is invalid.");
}
