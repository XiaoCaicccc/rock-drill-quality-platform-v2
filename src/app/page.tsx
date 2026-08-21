import Link from "next/link";

import { AppNav } from "./_components/app-nav";
import { pageAuthentication } from "./_auth";

export default async function Home() {
  const { authenticated } = await pageAuthentication("/");
  return (
    <><AppNav displayName={authenticated.account.displayName} admin /><main className="page"><section className="panel"><h1>访问闭环工作台</h1><p>欢迎，{authenticated.account.displayName}。</p><div className="card-grid"><Link className="card" href="/parts"><strong>零件主数据</strong><span>类别、零件编号与图号管理</span></Link><Link className="card" href="/admin/users"><strong>用户管理</strong><span>账户、角色与密码管理</span></Link><Link className="card" href="/admin/audit"><strong>审计</strong><span>查询成功提交的关键操作</span></Link><Link className="card" href="/account/security"><strong>账户安全</strong><span>密码与登录设备</span></Link></div></section></main></>
  );
}
