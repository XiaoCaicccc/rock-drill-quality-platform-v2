import { AppNav } from "../../_components/app-nav";
import { NewPart } from "../../_components/parts";
import { pageAuthorization } from "../../_auth";
import { partMasterPermissions } from "@/modules/part-master";

export default async function NewPartPage() {
  const { authenticated } = await pageAuthorization(partMasterPermissions.create, "/parts/new");
  return <><AppNav displayName={authenticated.account.displayName} /><main className="page"><NewPart /></main></>;
}
