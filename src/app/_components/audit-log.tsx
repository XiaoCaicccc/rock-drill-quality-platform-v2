"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { businessDateTimeInputToInstant, formatInstantForBusinessDisplay } from "@/platform/time";

interface Audit { id: string; occurredAt: string; actorKind: string; actorDisplayName: string | null; actorAccountId: string | null; action: string; targetType: string; targetId: string; reason: string | null; details: unknown; }
type AuditFilters = Readonly<Record<string, string>>;

export function AuditLog() {
  const [items, setItems] = useState<Audit[]>([]); const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [filters, setFilters] = useState<AuditFilters>({});
  const load = useCallback(async () => { setLoading(true); setError(""); const params = new URLSearchParams({ page: String(page), pageSize: "25", ...filters }); try { const response = await fetch(`/api/admin/audit?${params}`); const body = await response.json(); if (!response.ok) throw new Error(typeof body?.error?.message === "string" ? body.error.message : "查询失败。"); setItems(body.items); setTotal(body.total); } catch (cause) { setError(cause instanceof Error ? cause.message : "查询失败。"); } finally { setLoading(false); } }, [filters, page]);
  useEffect(() => { const timeout = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timeout); }, [load]);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const nextFilters: Record<string, string> = {}; for (const [key, value] of new FormData(event.currentTarget)) if (typeof value === "string" && value) nextFilters[key] = key === "from" || key === "to" ? businessDateTimeInputToInstant(value) : value; setPage(1); setFilters(nextFilters); }
  return <section className="panel"><form className="filters" onSubmit={submit}><input name="action" placeholder="action"/><input name="actorAccountId" placeholder="actor Account UUID"/><input name="targetType" placeholder="target type"/><input name="targetId" placeholder="target ID"/><input name="from" type="datetime-local"/><input name="to" type="datetime-local"/><button>筛选</button></form>{error && <p className="error">{error}</p>}{loading ? <p>加载中…</p> : items.length === 0 ? <p>没有审计记录。</p> : <div className="table-wrap"><table><thead><tr><th>时间（Asia/Shanghai）</th><th>Actor</th><th>Action</th><th>Target</th><th>Reason / Details</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{formatInstantForBusinessDisplay(item.occurredAt)}</td><td>{item.actorKind === "SYSTEM" ? "SYSTEM" : item.actorDisplayName ?? item.actorAccountId}</td><td><code>{item.action}</code></td><td>{item.targetType}<br/><small>{item.targetId}</small></td><td>{item.reason ?? "—"}<pre>{item.details ? JSON.stringify(item.details, null, 2) : ""}</pre></td></tr>)}</tbody></table></div>}<div className="pager"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>上一页</button><span>第 {page} 页 · {total} 条</span><button disabled={page * 25 >= total} onClick={() => setPage((value) => value + 1)}>下一页</button></div></section>;
}
