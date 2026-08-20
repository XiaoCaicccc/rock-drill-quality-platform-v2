import { platformManagementPermissions } from "@/platform/access-permissions";
import { AppNav } from "../../../_components/app-nav";
import { UserDetail } from "../../../_components/admin-users";
import { pageAuthorization } from "../../../_auth";

export default async function UserPage({ params }: { params: Promise<{ accountId: string }> }) { const { authenticated } = await pageAuthorization(platformManagementPermissions.accountView, "/admin/users"); return <><AppNav displayName={authenticated.account.displayName} admin/><main className="page"><h1>用户详情</h1><UserDetail accountId={(await params).accountId}/></main></>; }
