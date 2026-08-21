"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

interface Category { id: string; name: string; description: string | null; status: "ACTIVE" | "INACTIVE"; }
const CATEGORY_PAGE_SIZE = 25;

export function categoryPageQuery(page: number, filters: { readonly search?: string; readonly status?: string }): string {
  const params = new URLSearchParams({ page: String(page), pageSize: String(CATEGORY_PAGE_SIZE) });
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  return params.toString();
}
async function json(response: Response) { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(typeof body?.error?.message === "string" ? body.error.message : "请求失败。"); return body; }

export function PartCategoryManager({ canCreate, canUpdate, canSetStatus }: { readonly canCreate: boolean; readonly canUpdate: boolean; readonly canSetStatus: boolean }) {
  const [items, setItems] = useState<Category[]>([]); const [filters, setFilters] = useState({ search: "", status: "" }); const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const load = useCallback(async () => { try { const body = await json(await fetch(`/api/part-categories?${categoryPageQuery(page, filters)}`)); setItems(body.items); setTotal(body.total); } catch (cause) { setError(cause instanceof Error ? cause.message : "加载失败。"); } }, [filters, page]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);
  async function act(id: string, method: string, body?: unknown) { setError(""); setMessage(""); try { const path = id === "new" ? "/api/part-categories" : `/api/part-categories/${id}${body && Object.prototype.hasOwnProperty.call(body, "status") ? "/status" : ""}`; await json(await fetch(path, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined })); setMessage("已保存。"); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "操作失败。"); } }
  async function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); await act("new", "POST", { name: data.get("name"), description: data.get("description") }); event.currentTarget.reset(); setPage(1); }
  const canAct = canUpdate || canSetStatus;
  return <section className="panel"><div className="toolbar"><h1>零件类别</h1><Link className="button" href="/parts">返回零件</Link></div><form className="filters" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); setPage(1); setFilters({ search: String(data.get("search") ?? ""), status: String(data.get("status") ?? "") }); }}><input name="search" placeholder="搜索类别"/><select name="status"><option value="">全部状态</option><option>ACTIVE</option><option>INACTIVE</option></select><button>筛选</button></form>{canCreate && <form className="inline-form" onSubmit={create}><input name="name" placeholder="新类别名称" required/><input name="description" placeholder="描述（可选）"/><button>创建类别</button></form>}{items.length === 0 ? <p>没有类别。</p> : <div className="table-wrap"><table><thead><tr><th>名称</th><th>描述</th><th>状态</th>{canAct && <th>操作</th>}</tr></thead><tbody>{items.map((item) => <CategoryRow key={item.id} item={item} canUpdate={canUpdate} canSetStatus={canSetStatus} onSave={act}/>)}</tbody></table></div>}<div className="pager"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>上一页</button><span>第 {page} 页 · {total} 条</span><button type="button" disabled={page * CATEGORY_PAGE_SIZE >= total} onClick={() => setPage((value) => value + 1)}>下一页</button></div>{message && <p role="status">{message}</p>}{error && <p className="error">{error}</p>}</section>;
}

function CategoryRow({ item, canUpdate, canSetStatus, onSave }: { readonly item: Category; readonly canUpdate: boolean; readonly canSetStatus: boolean; readonly onSave: (id: string, method: string, body?: unknown) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const canAct = canUpdate || canSetStatus;
  return <tr>
    <td>{editing ? <input defaultValue={item.name} id={`category-name-${item.id}`} /> : item.name}</td>
    <td>{editing ? <input defaultValue={item.description ?? ""} id={`category-description-${item.id}`} /> : item.description ?? "—"}</td>
    <td><span className={`badge ${item.status.toLowerCase()}`}>{item.status}</span></td>
    {canAct && <td>{editing ? <>
      {canUpdate && <button onClick={() => { const name = (document.getElementById(`category-name-${item.id}`) as HTMLInputElement).value; const description = (document.getElementById(`category-description-${item.id}`) as HTMLInputElement).value; void onSave(item.id, "PATCH", { name, description }).then(() => setEditing(false)); }}>保存</button>}
      {" "}<button onClick={() => setEditing(false)}>取消</button>
    </> : <>
      {canUpdate && <button onClick={() => setEditing(true)}>编辑</button>}
      {canSetStatus && <>{canUpdate && " "}<button onClick={() => void onSave(item.id, "PATCH", { status: item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })}>{item.status === "ACTIVE" ? "停用" : "启用"}</button></>}
    </>}</td>}
  </tr>;
}
