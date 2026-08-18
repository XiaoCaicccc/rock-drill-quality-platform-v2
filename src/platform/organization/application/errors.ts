import { AppError } from "@/platform/errors";

export type OrganizationErrorKind =
  | "INVALID_ORGANIZATION_INPUT" | "INVALID_ORG_UNIT_INPUT" | "ORGANIZATION_NOT_FOUND"
  | "ORGANIZATION_INACTIVE" | "ORG_UNIT_NOT_FOUND" | "ORGANIZATION_CODE_CONFLICT"
  | "ORG_UNIT_CODE_CONFLICT" | "SECOND_ROOT_CONFLICT" | "CROSS_ORGANIZATION_PARENT"
  | "INACTIVE_PARENT" | "ROOT_MOVE_FORBIDDEN" | "SELF_PARENT_FORBIDDEN"
  | "HIERARCHY_CYCLE" | "ACTIVE_DESCENDANTS_PREVENT_DEACTIVATION";

const errorDefinition: Record<OrganizationErrorKind, { code: "PLATFORM.VALIDATION_FAILED" | "RESOURCE.NOT_FOUND" | "STATE.CONFLICT" | "BUSINESS_RULE.VIOLATION"; httpStatus: 400 | 404 | 409; message: string }> = {
  INVALID_ORGANIZATION_INPUT: { code: "PLATFORM.VALIDATION_FAILED", httpStatus: 400, message: "Organization input is invalid." },
  INVALID_ORG_UNIT_INPUT: { code: "PLATFORM.VALIDATION_FAILED", httpStatus: 400, message: "Organization unit input is invalid." },
  ORGANIZATION_NOT_FOUND: { code: "RESOURCE.NOT_FOUND", httpStatus: 404, message: "Organization was not found." },
  ORGANIZATION_INACTIVE: { code: "BUSINESS_RULE.VIOLATION", httpStatus: 409, message: "Organization is inactive." },
  ORG_UNIT_NOT_FOUND: { code: "RESOURCE.NOT_FOUND", httpStatus: 404, message: "Organization unit was not found." },
  ORGANIZATION_CODE_CONFLICT: { code: "STATE.CONFLICT", httpStatus: 409, message: "Organization code already exists." },
  ORG_UNIT_CODE_CONFLICT: { code: "STATE.CONFLICT", httpStatus: 409, message: "Organization unit code already exists." },
  SECOND_ROOT_CONFLICT: { code: "STATE.CONFLICT", httpStatus: 409, message: "An organization can have only one root unit." },
  CROSS_ORGANIZATION_PARENT: { code: "BUSINESS_RULE.VIOLATION", httpStatus: 409, message: "Parent belongs to another organization." },
  INACTIVE_PARENT: { code: "BUSINESS_RULE.VIOLATION", httpStatus: 409, message: "Parent organization unit is inactive." },
  ROOT_MOVE_FORBIDDEN: { code: "BUSINESS_RULE.VIOLATION", httpStatus: 409, message: "The root organization unit cannot be moved." },
  SELF_PARENT_FORBIDDEN: { code: "BUSINESS_RULE.VIOLATION", httpStatus: 409, message: "An organization unit cannot be its own parent." },
  HIERARCHY_CYCLE: { code: "BUSINESS_RULE.VIOLATION", httpStatus: 409, message: "The move would create a hierarchy cycle." },
  ACTIVE_DESCENDANTS_PREVENT_DEACTIVATION: { code: "BUSINESS_RULE.VIOLATION", httpStatus: 409, message: "Active descendants prevent deactivation." },
};

export function organizationError(kind: OrganizationErrorKind, cause?: unknown): AppError {
  const definition = errorDefinition[kind];
  return new AppError({ code: definition.code, httpStatus: definition.httpStatus, internalMessage: kind, publicMessage: definition.message, cause });
}
