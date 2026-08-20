"use client";

import { useState, type FormEvent } from "react";
import { safeNextPath } from "../login/next-path";

export function LoginForm({ next }: { readonly next: string }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: data.get("username"), password: data.get("password") }) });
    if (response.ok) window.location.assign(safeNextPath(next));
    else { const body = await response.json().catch(() => null) as { error?: { message?: string } } | null; setError(body?.error?.message ?? "登录失败。"); setLoading(false); }
  }
  return <form className="panel form-stack" onSubmit={submit}>
    <h1>登录</h1>
    <label>用户名<input name="username" autoComplete="username" required /></label>
    <label>密码<input name="password" type="password" autoComplete="current-password" required /></label>
    {error && <p className="error" role="alert">{error}</p>}
    <button disabled={loading}>{loading ? "登录中…" : "登录"}</button>
  </form>;
}
