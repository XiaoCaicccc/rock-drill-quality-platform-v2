import { LoginForm } from "../_components/login-form";
import { redirectAuthenticatedFromLogin } from "../_auth";
import { safeNextPath } from "./next-path";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await redirectAuthenticatedFromLogin();
  return <main className="centered"><LoginForm next={safeNextPath((await searchParams).next)} /></main>;
}
