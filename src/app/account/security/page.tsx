import { AppNav } from "../../_components/app-nav";
import { SecurityPanel } from "../../_components/security-panel";
import { pageAuthentication } from "../../_auth";

export default async function SecurityPage() { const { authenticated } = await pageAuthentication("/account/security"); return <><AppNav displayName={authenticated.account.displayName}/><main className="page"><h1>账户安全</h1><SecurityPanel /></main></>; }
