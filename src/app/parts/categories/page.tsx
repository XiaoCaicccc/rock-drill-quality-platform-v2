import { AppNav } from "../../_components/app-nav";
import { PartCategoryManager } from "../../_components/part-categories";
import { pageAuthorization } from "../../_auth";
import { partCategoryPermissions } from "@/modules/part-category";
import { createAuthorizationService } from "@/platform/authorization";

export default async function PartCategoriesPage() {
  const result = await pageAuthorization(partCategoryPermissions.view, "/parts/categories");
  const authorization = createAuthorizationService();
  const target = { organizationId: result.context.actor.kind === "user" ? result.context.actor.organizationId : "" };
  const decisions = await Promise.all([partCategoryPermissions.create, partCategoryPermissions.update, partCategoryPermissions.setStatus].map((permission) => authorization.evaluateAuthorization({ context: result.context, permission, target })));
  return <><AppNav displayName={result.authenticated.account.displayName} /><main className="page"><PartCategoryManager canCreate={decisions[0].allowed} canUpdate={decisions[1].allowed} canSetStatus={decisions[2].allowed} /></main></>;
}
