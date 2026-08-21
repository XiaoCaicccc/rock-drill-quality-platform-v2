# 测试策略

未来测试优先级依次为：领域规则测试、Use Case 集成测试、PostgreSQL 真实事务测试、API 契约测试、页面核心流程测试、少量端到端测试。

必须覆盖的关键不变量包括：五角色权限、Data Scope、停用用户立即失效、三设备 Session 上限、创建人与审核人隔离、非法状态转换、装配区间不得重叠、检测任务固定版本、AuditLog 原子提交、并发审核冲突、发布快照不可变、Asia/Shanghai 跨日规则、Excel 导入错误定位，以及二维码停用与权限检查。

禁止读取源码后通过字符串或正则匹配证明权限存在；禁止通过检查函数名称证明事务、锁或审计正确；禁止用 Mock 数据库代替所有 PostgreSQL 关键行为验证。关键规则必须通过真实业务行为、API 返回、PostgreSQL 事务结果、并发结果和持久化审计结果证明。

纯 TypeScript 平台模块使用 Vitest，默认运行于 Node 环境，测试文件使用 `*.test.ts`。固定 Clock 和固定 RequestId factory 是确定性测试手段。Mock 不能替代 PostgreSQL 事务、约束和并发的真实测试；后续关键数据库行为仍须按本策略验证。

`npm run check` 必须包含 lint、typecheck、test 和 build。

GitHub Actions 是针对 `master` 的 pull request 和推送到 `master` 的自动质量门，也可手动触发。CI 使用隔离的 PostgreSQL 17 service container，依次执行 `db:validate`、`db:generate` 和 `check:full`；CI 测试数据库与正式运行数据库完全隔离。当前普通测试为 16 个文件、79 项测试，真实数据库测试为 4 个文件、36 项测试。Slice 1C 的 implementation CI 与 closure CI 均已通过，PR #7 已合并进入 `master`。

`GET /api/health` 的 Vitest 测试验证 200 JSON 响应、固定的服务标识、连接串字段不出现在响应中，并验证处理请求时不会请求 Prisma Client。

Slice 1A 的 ORG-DB-01～13 依次验证：Migration 对象；原子创建；原子回滚；Organization code 冲突；OrgUnit code 范围；单根；跨组织 parent；cycle；inactive parent 创建和激活；active descendant 停用保护；Organization inactive 与层级写入竞态；测试清理；两个独立 Client 的 advisory lock 串行化。

Slice 1B 的 PostgreSQL acceptance / concurrency tests 验证：normalizedUsername 全局唯一；same-Organization composite FK；inactive Organization / primary OrgUnit 拒绝；Organization / primary OrgUnit 动态使既有 Session 失效；unknown username、错误密码、`INACTIVE`、`LOCKED` 统一返回公开 401；七天绝对有效期；logout 持久化撤销；own-session DELETE、current-session cookie clearing、跨 Account 撤销保护；实际 bootstrap adapter。并发证据通过 gate backend PID、`pg_stat_activity` 与 `pg_blocking_pids` 明确证明 writer 到达正式 PostgreSQL serialization boundary 后再释放 gate，覆盖两个既有 Session 加两个并发 login、login 对 `LOCKED` / `INACTIVE`、并发 initial bootstrap；不得以 sleep、Promise settle 顺序或仅同时调用作为 Slice 1B 数据库并发证明。

Slice 1C 的行为验收必须覆盖五个固定 Role、六种 Data Scope、multi-role / multi-assignment additive union、anonymous 401、authenticated denial 403、Organization boundary、same-Organization Admin、Admin cross-Organization denial、Admin creator-review denial、所有 scope 的正反例、missing target facts fail closed，以及已提交 Role add/revoke 对下一次 evaluation 立即生效。Organization subtree 公共能力覆盖 self、direct child、deep descendant、sibling、unrelated branch、cross Organization 与 not-found。

Slice 1C 的 `AUTHZ-DB-01`～`AUTHZ-DB-07` 必须在真实 PostgreSQL 上证明 Migration objects、exact duplicate uniqueness、Account/Assignment 与 scope OrgUnit/Assignment 的 same-Organization composite FK、同 Account 多 Role、同 Role 多 OrgUnit scope，以及 concurrent exact assignment 最终恰有一行。不得以 Prisma schema 文本或函数名匹配替代数据库行为证据。

数据库基础集成测试通过 `npm run test:db` 在真实 PostgreSQL 17 上运行，并仅从 `TEST_DATABASE_URL` 读取连接信息；测试代码不得回退读取 `DATABASE_URL`。`npm run db:migrate:test` 使用临时 Prisma schema 仅引用 `TEST_DATABASE_URL`，并以 `migrate deploy` 部署正式 Migration；不得运行 `migrate dev`、`migrate reset` 或 `db push`。测试 Client 必须独立于正式 Client，并通过 Prisma datasource 覆盖连接。DB-01 至 DB-04 使用固定专用 Schema 和测试表，以参数绑定验证 PostgreSQL 基础；Organization 的 ORG-DB 测试在同一隔离测试库中验证 Migration 约束、原子用例、层级不变式和 advisory lock 并发行为。所有异常路径均在 `finally` 清理，且不得使用 Unsafe Raw SQL。连接信息不得写入日志或已跟踪文件。

## Slice 2A Part master / Numbering acceptance

Slice 2A 的真实 PostgreSQL 验收必须覆盖 PART-DB-01～PART-DB-17：PartCategory Organization persistence、同组织 normalizedName 唯一与跨组织同名、PartMaster 与 Category composite FK 的跨组织拒绝、同组织 partNumber 与 normalizedDrawingNumber 唯一、多个 NULL 图号、跨组织同图号、同组织并发编号唯一且高水位严格增加、组织序列隔离、并发 PartMaster 创建 distinct partNumber、PartMaster/Category mutation 与 Audit 原子提交和失败回滚、Category INACTIVE 不级联既有 PartMaster，以及失败创建消耗号码且永不重发。

编号并发证据必须证明真实 overlapping PostgreSQL requests 到达数据库 atomic allocation 边界，不能只使用 `Promise.all()`、sleep、settle 顺序、源码 grep 或 Prisma schema 文本匹配。行为/API/UI 验收还必须覆盖五角色权限矩阵、cross-Organization direct UUID 的 404、client-supplied protected fields、Category/PartMaster 状态语义、no-op mutation 无 Audit、drawingNumber NULL/value/change/clear、inactive Category 拒绝新建或重新指派、partNumber immutable、no delete，以及 PartMaster detail DTO 不泄露 organizationId、normalizedDrawingNumber 或 NumberingSequence。普通测试和真实 PostgreSQL 测试均必须保持 Slice 0～1D 基线不回归。

## Slice 2B Part revision acceptance

Slice 2B 必须以真实 PostgreSQL 证明 REV-DB-01～REV-DB-20：Revision/Review 的 Organization composite FK、PartMaster 内 revisionNo 唯一、不同 PartMaster 的独立编号、partial unique 单一未发布版本、首版及下一版并发创建、drawingNumber 与首版创建竞争、drawingNumber freeze 的应用与数据库守卫、INACTIVE PartMaster 前置条件、状态与更新/审核竞争、RETURN/APPROVE 单胜、Review/Audit/状态或 release metadata 的原子提交与强制 Audit failure 回滚、RELEASED 不可变、多次退回/重提保留历史，以及 creator-review 分离和带 reason 的 ADMIN override。并发验收必须以独立 PostgreSQL connections、目标 row-lock 到达和数据库锁/等待事实证明，而不是 Promise settle 顺序。

行为、API 与 UI 测试还必须覆盖全部合法/非法 transition、状态化 editability、权限矩阵和 IDOR、protected fields、no-op 无 Audit、Review DTO 无持久化泄露、return comment、approve optional comment、release prerequisite，以及 `npm run db:validate`、`npm run db:generate`、`npm run check:full` 和 PART-DB-01～PART-DB-17 回归。
