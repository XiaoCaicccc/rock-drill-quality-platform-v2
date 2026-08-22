import { AppNav } from "../../../_components/app-nav";
import { RevisionsList } from "../../../_components/revisions";
import { pageAuthorization } from "../../../_auth";
import { createAuthorizationService } from "@/platform/authorization";
import { partRevisionPermissions } from "@/modules/part-revision";
export default async function RevisionsPage({ params }: { readonly params: Promise<{ partId: string }> }) { const result = await pageAuthorization(partRevisionPermissions.view, "/parts"); const partId = (await params).partId; const canCreate = (await createAuthorizationService().evaluateAuthorization({ context: result.context, permission: partRevisionPermissions.create, target: { organizationId: result.authenticated.account.organizationId } })).allowed; return <><AppNav displayName={result.authenticated.account.displayName} /><main className="page"><RevisionsList partId={partId} canCreate={canCreate} /></main></>; }
