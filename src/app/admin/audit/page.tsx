import { platformManagementPermissions } from "@/platform/access-permissions";
import { AppNav } from "../../_components/app-nav";
import { AuditLog } from "../../_components/audit-log";
import { pageAuthorization } from "../../_auth";

export default async function AuditPage() { const { authenticated } = await pageAuthorization(platformManagementPermissions.auditView, "/admin/audit"); return <><AppNav displayName={authenticated.account.displayName} admin/><main className="page"><h1>操作审计</h1><AuditLog/></main></>; }
