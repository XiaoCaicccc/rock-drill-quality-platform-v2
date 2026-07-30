# 测试策略

未来测试优先级依次为：领域规则测试、Use Case 集成测试、PostgreSQL 真实事务测试、API 契约测试、页面核心流程测试、少量端到端测试。

必须覆盖的关键不变量包括：五角色权限、Data Scope、停用用户立即失效、三设备 Session 上限、创建人与审核人隔离、非法状态转换、装配区间不得重叠、检测任务固定版本、AuditLog 原子提交、并发审核冲突、发布快照不可变、Asia/Shanghai 跨日规则、Excel 导入错误定位，以及二维码停用与权限检查。

禁止读取源码后通过字符串或正则匹配证明权限存在；禁止通过检查函数名称证明事务、锁或审计正确；禁止用 Mock 数据库代替所有 PostgreSQL 关键行为验证。关键规则必须通过真实业务行为、API 返回、PostgreSQL 事务结果、并发结果和持久化审计结果证明。

纯 TypeScript 平台模块使用 Vitest，默认运行于 Node 环境，测试文件使用 `*.test.ts`。固定 Clock 和固定 RequestId factory 是确定性测试手段。Mock 不能替代 PostgreSQL 事务、约束和并发的真实测试；后续关键数据库行为仍须按本策略验证。

`npm run check` 必须包含 lint、typecheck、test 和 build。
