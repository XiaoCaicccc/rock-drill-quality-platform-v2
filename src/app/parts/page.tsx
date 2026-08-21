import { AppNav } from "../_components/app-nav";
import { PartsList } from "../_components/parts";
import { pageAuthorization } from "../_auth";
import { partMasterPermissions } from "@/modules/part-master";
import { createAuthorizationService } from "@/platform/authorization";

export default async function PartsPage() {
  const result = await pageAuthorization(partMasterPermissions.view, "/parts");
  const { authenticated } = result;
  const canCreate = (await createAuthorizationService().evaluateAuthorization({ context: result.context, permission: partMasterPermissions.create, target: { organizationId: authenticated.account.organizationId } })).allowed;
  return <><AppNav displayName={authenticated.account.displayName} /><main className="page"><PartsList canCreate={canCreate} /></main></>;
}
