"use client";

import Link from "next/link";

export function AppNav({ displayName, admin = false }: { readonly displayName: string; readonly admin?: boolean }) {
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); window.location.assign("/login"); }
  return <header className="app-nav"><Link href="/" className="brand">Rock Drill Quality Platform</Link><nav>{admin && <><Link href="/admin/users">用户</Link><Link href="/admin/audit">审计</Link></>}<Link href="/account/security">账户安全</Link><span>{displayName}</span><button className="button-link" onClick={logout}>退出</button></nav></header>;
}
