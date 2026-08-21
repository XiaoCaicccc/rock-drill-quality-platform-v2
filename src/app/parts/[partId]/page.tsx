import { AppNav } from "../../_components/app-nav";
import { PartDetail } from "../../_components/parts";
import { pageAuthorization } from "../../_auth";
import { createAuthorizationService } from "@/platform/authorization";
import { partMasterPermissions } from "@/modules/part-master";

export default async function PartDetailPage({ params }: { readonly params: Promise<{ partId: string }> }) {
  const result = await pageAuthorization(partMasterPermissions.view, "/parts");
  const partId = (await params).partId;
  const authorization = createAuthorizationService();
  const target = { organizationId: result.context.actor.kind === "user" ? result.context.actor.organizationId : "" };
  const [update, setStatus] = await Promise.all([partMasterPermissions.update, partMasterPermissions.setStatus].map((permission) => authorization.evaluateAuthorization({ context: result.context, permission, target })));
  return <><AppNav displayName={result.authenticated.account.displayName} /><main className="page"><PartDetail partId={partId} canUpdate={update.allowed} canSetStatus={setStatus.allowed} /></main></>;
}
