import { describe, expect, it } from "vitest";

import { partCategoryPermissions } from "@/modules/part-category";
import { partMasterPermissions } from "@/modules/part-master";

function grants(permission: { grants: readonly { role: string; dataScope: string }[] }) {
  return new Map(permission.grants.map((grant) => [grant.role, grant.dataScope]));
}

describe("Slice 2A permission declarations", () => {
  it("declare the exact same-Organization ALL read/mutation matrix", () => {
    const category = {
      view: grants(partCategoryPermissions.view), create: grants(partCategoryPermissions.create), update: grants(partCategoryPermissions.update), setStatus: grants(partCategoryPermissions.setStatus),
    };
    const part = {
      view: grants(partMasterPermissions.view), create: grants(partMasterPermissions.create), update: grants(partMasterPermissions.update), setStatus: grants(partMasterPermissions.setStatus),
    };
    for (const permissions of [category, part]) {
      expect(permissions.view).toEqual(new Map([["ENGINEER", "ALL"], ["QUALITY_MANAGER", "ALL"], ["INSPECTOR", "ALL"], ["VIEWER", "ALL"]]));
      expect(permissions.create).toEqual(new Map([["ENGINEER", "ALL"]]));
      expect(permissions.update).toEqual(new Map([["ENGINEER", "ALL"]]));
      expect(permissions.setStatus).toEqual(new Map([["ENGINEER", "ALL"]]));
    }
  });
});
