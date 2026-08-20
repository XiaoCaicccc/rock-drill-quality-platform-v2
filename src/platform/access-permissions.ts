import { definePermission } from "./authorization";

export const platformManagementPermissions = Object.freeze({
  accountView: definePermission({ code: "account.view", grants: [] }),
  accountCreate: definePermission({ code: "account.create", grants: [] }),
  accountUpdate: definePermission({ code: "account.update", grants: [] }),
  accountSetStatus: definePermission({ code: "account.set_status", grants: [] }),
  accountResetPassword: definePermission({ code: "account.reset_password", grants: [] }),
  roleAssignmentView: definePermission({ code: "role_assignment.view", grants: [] }),
  roleAssignmentManage: definePermission({ code: "role_assignment.manage", grants: [] }),
  organizationView: definePermission({ code: "organization.view", grants: [] }),
  auditView: definePermission({ code: "audit.view", grants: [] }),
});
