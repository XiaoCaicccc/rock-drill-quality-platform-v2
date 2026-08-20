import Link from "next/link";

export default function ForbiddenPage() { return <main className="centered"><section className="panel"><h1>无权访问</h1><p>当前账户没有执行此操作的权限。</p><Link href="/">返回首页</Link></section></main>; }
