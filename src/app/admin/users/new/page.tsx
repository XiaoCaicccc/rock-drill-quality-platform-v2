import { platformManagementPermissions } from "@/platform/access-permissions";
import { AppNav } from "../../../_components/app-nav";
import { NewUser } from "../../../_components/admin-users";
import { pageAuthorization } from "../../../_auth";

export default async function NewUserPage() { const { authenticated } = await pageAuthorization(platformManagementPermissions.accountCreate, "/admin/users"); return <><AppNav displayName={authenticated.account.displayName} admin/><main className="page"><h1>创建用户</h1><NewUser/></main></>; }
