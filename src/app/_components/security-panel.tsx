"use client";

import { useEffect, useState, type FormEvent } from "react";

interface Session { sessionId: string; createdAt: string; expiresAt: string; userAgent: string | null; current: boolean; }

export function SecurityPanel() {
  const [sessions, setSessions] = useState<Session[]>([]); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); const response = await fetch("/api/auth/sessions"); const body = await response.json(); setSessions(response.ok ? body.sessions : []); setLoading(false); }
  useEffect(() => { const timeout = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timeout); }, []);
  async function revoke(session: Session) { const response = await fetch(`/api/auth/sessions/${session.sessionId}`, { method: "DELETE" }); if (response.ok && session.current) window.location.assign("/login"); else await load(); }
  async function changePassword(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setMessage(""); const data = new FormData(event.currentTarget); const response = await fetch("/api/account/change-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ currentPassword: data.get("currentPassword"), newPassword: data.get("newPassword") }) }); const body = await response.json().catch(() => null) as { error?: { message?: string } } | null; setMessage(response.ok ? "密码已修改，其他设备 Session 已撤销。" : body?.error?.message ?? "修改失败。"); if (response.ok) event.currentTarget.reset(); await load(); }
  return <div className="split"><section className="panel"><h2>修改密码</h2><form className="form-stack" onSubmit={changePassword}><label>当前密码<input name="currentPassword" type="password" required /></label><label>新密码（15–128 字符）<input name="newPassword" type="password" minLength={15} maxLength={128} required /></label><button>修改密码</button>{message && <p role="status">{message}</p>}</form></section><section className="panel"><h2>登录设备</h2>{loading ? <p>加载中…</p> : sessions.length === 0 ? <p>没有有效 Session。</p> : <ul className="list">{sessions.map((session) => <li key={session.sessionId}><div><strong>{session.current ? "当前设备" : "其他设备"}</strong><br/><small>{session.userAgent ?? "未知设备"}<br/>创建：{new Date(session.createdAt).toLocaleString()} · 到期：{new Date(session.expiresAt).toLocaleString()}</small></div><button onClick={() => revoke(session)}>撤销</button></li>)}</ul>}</section></div>;
}
