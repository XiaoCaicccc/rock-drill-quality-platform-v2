import { platformManagementPermissions } from "@/platform/access-permissions";
import { AppNav } from "../../_components/app-nav";
import { UserList } from "../../_components/admin-users";
import { pageAuthorization } from "../../_auth";

export default async function UsersPage() { const { authenticated } = await pageAuthorization(platformManagementPermissions.accountView, "/admin/users"); return <><AppNav displayName={authenticated.account.displayName} admin/><main className="page"><h1>用户管理</h1><UserList/></main></>; }
