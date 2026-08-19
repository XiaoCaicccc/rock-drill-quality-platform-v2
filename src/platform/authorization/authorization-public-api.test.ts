import { describe, expect, it } from "vitest";

import * as authorizationPublicApi from "./index";

describe("authorization public API", () => {
  it("exports policy and service capabilities without infrastructure", () => {
    expect(authorizationPublicApi).toHaveProperty("createAuthorizationService");
    expect(authorizationPublicApi).toHaveProperty("definePermission");
    expect(authorizationPublicApi).toHaveProperty("roleCodes");
    expect(authorizationPublicApi).toHaveProperty("dataScopes");
    expect(authorizationPublicApi).not.toHaveProperty("getPrismaClient");
    expect(authorizationPublicApi).not.toHaveProperty("createAuthorizationServiceForPrisma");
    expect(authorizationPublicApi).not.toHaveProperty("isPrismaError");
  });
});
