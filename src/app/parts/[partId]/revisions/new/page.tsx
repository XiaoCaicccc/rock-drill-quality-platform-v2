import { AppNav } from "../../../../_components/app-nav";
import { NewRevision } from "../../../../_components/revisions";
import { pageAuthorization } from "../../../../_auth";
import { partRevisionPermissions } from "@/modules/part-revision";
export default async function NewRevisionPage({ params }: { readonly params: Promise<{ partId: string }> }) { const result = await pageAuthorization(partRevisionPermissions.create, "/parts"); return <><AppNav displayName={result.authenticated.account.displayName} /><main className="page"><NewRevision partId={(await params).partId} /></main></>; }
