# 架构原则

采用模块化单体，不采用微服务。平台底座与业务模块分离：平台模块包括 Identity and Session、Organization、Authorization、Audit、Numbering、QR Access、File Metadata、Import Infrastructure、Error Handling、Observability、Time；PLM 模块包括 Part Category、Part Master、Part Revision、Supplier Relation、Batch、Part Instance、Equipment、Equipment Position、Installation；质量模块包括 Inspection Template、Inspection Template Version、Inspection Task、Inspection Record、Inspection Result、Inspection Correction、Basic Nonconformance、Inspection Ledger、Analysis Report、Report Review、Report Snapshot。

依赖方向为：质量模块可依赖 PLM 和平台模块；PLM 模块可依赖平台模块；平台模块不得依赖业务模块；同层模块仅通过明确的应用接口和内部 ID 协作。禁止万能 Service、万能 Entity 与万能工作流引擎。

## 权限

权限命名采用“模块.业务动作”，例如 `part_revision.submit_review`、`part_revision.approve`、`part_revision.release`、`inspection_task.execute`、`inspection_record.correct`、`report.publish`、`audit.view`。

最终权限由用户身份、功能权限、组织、Data Scope、对象归属、对象状态和创建人与审核人隔离共同决定。Data Scope 至少支持 `ALL`、`ORG_SUBTREE`、`ORG_UNIT`、`ASSIGNED`、`OWN_CREATED`、`NONE`。权限必须在服务端校验；前端隐藏按钮不能替代授权。审核与关键业务写入须与审计在同一事务提交。

Slice 1C 的 Authorization 位于 `src/platform/authorization`，只通过模块 `index.ts` 对外提供结构化 evaluate/require 能力和底层 Role Assignment application capabilities。业务模块传入最小 `AuthorizationTarget` facts，不得把 Prisma Model、业务 Entity 或业务状态机传入 Authorization。Permission Policy 留在未来各业务模块的代码中；Authorization 不拥有全业务权限矩阵。

Authorization 以 `RequestContext.actor.userId` 实时读取已提交 Role Assignment，不向 RequestContext、Session 或 JWT 写入授权快照。`ORG_SUBTREE` 只经 `src/platform/organization/index.ts` 暴露的只读 subtree capability 判断，不导入 Organization infrastructure，也不改变 D-026。数据库唯一约束裁决 concurrent exact assignment；不增加全局 authorization lock。

Slice 1D 的 Audit 位于 `src/platform/audit`，模块外只通过 `index.ts` 使用 event validation、transaction-bound recorder contract 与 query capability。Audit 公共契约不暴露 Prisma Client、Prisma Model、TransactionClient 或 raw SQL helper；拥有业务事务的 Identity / Session 与 Authorization adapter 以窄 recorder callback 在同一 transaction 中写入 Audit。

Account 状态与 ADMIN revoke 共享 Organization row `FOR UPDATE` access-liveness boundary；它独立于且不替换 D-026 的 Organization hierarchy advisory lock。Transport 层负责 authentication、RequestContext、permission 与 same-Organization target 组合，mutation invariant 与 Audit atomicity仍由服务端 application transaction 最终保证。

## Session

使用数据库可撤销 Session。每个账号最多三条有效设备 Session；第四台设备登录时必须先撤销一台已有设备。后端必须通过事务保证设备上限，不能只依赖前端计数。

## 时间、编号与二维码

企业业务时区固定为 `Asia/Shanghai`，业务日期、精确时间和有效区间须分别表达。编号与内部 ID 分离。二维码仅是统一对象入口，不保存第二份业务数据；第一阶段二维码内容必须登录后才能访问。

## Excel 导入

Excel 导入必须经过上传、解析、映射、预览、校验、确认、事务写入和导入记录。服务端解析结果是唯一权威结果；前端只负责上传、映射、预览和确认，不允许前端与服务端使用两套可能产生不同结果的业务解析逻辑。导入必须保存原文件、字段映射、逐行结果和导入记录。

## AI 开发护栏

根 `AGENTS.md` 负责仓库级规则。将来创建核心业务模块时，每个模块应创建简短的局部 `AGENTS.md`，仅描述模块职责、Always、Ask First、Never、依赖边界和验证命令；不得把 `AGENTS.md` 变成开发历史文档。

已确认的工程技术基线为 Node.js 24 LTS、npm、当前稳定版 Next.js、App Router、TypeScript strict、`src/` 目录、ESLint、Tailwind CSS、`@/*` 导入别名、单应用仓库和模块化单体。业务服务默认使用 Node.js Runtime；第一阶段不建立 Monorepo，也不启用 React Compiler。

数据库可撤销 Session 的架构原则已由 D-011 与 D-027 确认，不是候选方案。Slice 1B 的 Session 只保存 opaque token 的 SHA-256 hash、七天 absolute expiration、可撤销时间和有界 user-agent；raw token 只在登录响应 Cookie 中短暂存在。每个 Account 的三条 active Session 上限、登录创建和 Account 停用/锁定均由同一 Account row serialization boundary 及数据库事务保证。Organization / OrgUnit 状态在每次 Session validation 时动态检查，Identity / Session 不反向依赖 Organization 内部实现，也不改变 D-026 锁语义。

V2 数据库基础使用 PostgreSQL 17 与 Prisma 6.19.3。正式 Prisma schema 和 `getPrismaClient()` 仅读取 `DATABASE_URL`，用于未来开发和应用运行；`createTestPrismaClient()` 仅读取 `TEST_DATABASE_URL`，并通过 Prisma datasource 覆盖仅供真实集成测试使用。两个变量不得回退或互用，连接串、用户名、密码、主机与端口不得写入已跟踪文件、日志或提交。正式 Client 在开发环境缓存于 `globalThis` 以避免 Next.js 热重载重复创建连接池，生产环境维持正常生命周期；模块导入不主动连接，且不建立全局隐式事务。Organization 是第一份业务 Schema、Model 和 Migration；其他业务 Schema、认证框架、S3 兼容对象存储、Excel 库、部署平台、UI 组件库和后台任务系统仍是候选或后续决策。组织层级写入在同一 PostgreSQL 事务中按 `organizationId` 获取参数化 transaction-scoped advisory lock，以串行化同一组织内的创建、移动和状态变更；该锁不属于模块公共接口。

## 平台基础模块

`Error Handling` 提供稳定错误代码、`AppError` 和框架无关的安全公共错误响应。Transport Adapter 未来只负责将该响应转换为实际 HTTP Response；业务 Use Case 不依赖 Transport API，未知错误不得公开原始信息。

`Time` 明确区分业务日历日期（BusinessDate）、精确时间点（UTC Instant）和有效区间；有效区间遵循 `[from, to)`。企业业务时区固定为 `Asia/Shanghai`，Use Case 通过 `Clock` 获取当前时间，不能以运行环境本地时区为业务依据。

`RequestContext` 显式传递 `requestId`、`receivedAt`、`businessTimeZone` 和联合类型 `actor`。它不保存权限快照、密码、Token 或 Cookie；未来 Transport Adapter、Use Case 和审计可共享同一个 Context。errors、time 和 request-context 均不依赖 Next.js Transport API，且 request-context 仅通过 time 的公开入口依赖 time。

## CI 与部署运行边界

GitHub Actions 是当前仓库的 CI 基线，负责代码质量和真实 PostgreSQL 测试；Vercel 是当前 Next.js Preview 部署平台。部署平台不是业务架构的一部分，后续可以替换。`GET /api/health` 使用 Node.js runtime，仅提供无数据库依赖的 liveness 信号，不是 readiness 或业务状态检查。

## 模块归属与目标路径

平台模块的长期目标路径为 `src/platform/`：`errors`、`time`、`request-context`、`database`、`organization`、`identity-session`、`authorization`、`audit`、`numbering`、`qr-access`、`file-metadata`、`import` 和 `observability`。Organization 属于平台模块；Slice 1A 的正确目标路径是 `src/platform/organization`，不属于 `src/modules` 下的普通业务模块。Identity、Session、Authorization 和 Audit 也属于平台模块。

业务模块的长期目标路径为 `src/modules/`：`part-category`、`part-master`、`part-revision`、`supplier-relation`、`equipment`、`batch`、`part-instance`、`installation`、`inspection-template`、`inspection-task`、`inspection`、`quality-ledger`、`correction`、`nonconformance` 和 `report`。具体目录只在对应 Slice 开始时创建，不提前建立大量空目录。模块外只能通过正式公共入口使用能力；API 和 UI 不得直接操作 Prisma Model，Prisma 类型不得扩散为跨模块公共契约。

领域层不得依赖 Prisma、Next.js 或 React；应用层不得依赖 Next.js 页面和路由；基础设施层可以依赖 Prisma；`app` 层组合应用能力；平台模块不得反向依赖具体 PLM 或质量业务模块。

## Repository 规则

不强制所有模块创建通用 Repository，也不创建仅转发 Prisma CRUD 的万能 Repository。只有持久化语义、测试替换、复杂查询或模块边界确实需要时，才建立模块内部端口。应用用例可通过受控的 Prisma Transaction Client 或窄接口完成事务；具体选择由对应 Slice 的设计和测试证明。

## 平台能力主要实施位置

该映射表示各平台能力首次建立的主要位置；后续 Slice 可以复用和扩展。不得因为某项未在路线中单独命名，就静默丢失平台模块。

| 平台能力 | 首次主要实施 Slice |
| --- | --- |
| errors | Slice 0B-2 |
| time | Slice 0B-2 |
| request-context | Slice 0B-2 |
| database | Slice 0B-3 |
| organization | Slice 1A |
| identity-session | Slice 1B |
| authorization | Slice 1C |
| audit | Slice 1D |
| numbering | Slice 2A |
| file-metadata | Slice 3B |
| import | Slice 3B |
| qr-access | Slice 7C |
| observability | Slice 8C |

## 开源设计参考与 Slice 映射

此处是开源设计参考映射的唯一权威定义。

| 参考项目 | 借鉴范围 | 主要 Slice 映射 |
| --- | --- | --- |
| Carbon | 权限上下文、RBAC / ABAC、查询契约、审计、API 边界、检测任务快照、导入流程、AGENTS 护栏 | 0A、1C、3B、5A、6A |
| InvenTree | Part / Revision、分类、批次、序列号、实物、安装关系、条码与追溯 | 2A、2B、4A、4B、4C、7C |
| Cascadia PLM | Master / Revision 身份分离、状态转换、审批记录、发布前置条件、审计轨迹 | 2B、3A、7B |
| ERPNext | Quality Inspection 概念、编号与来源、审批思路、不合格与 CAPA 术语 | 2A、3A、5、6C |
| Part-DB | 分类、参数组织、附件、标签、QR、搜索、移动访问 | 2A、3A、3B、7C、8B |
| Cal.com / Cal.diy | TypeScript 项目组织、应用与基础设施边界、CI、模块工程规范 | 0A、0B 及后续所有 Slice 的工程组织 |

Cal.com / Cal.diy 仅是工程组织参考，不是 PLM 或质量业务模型来源；不得从其推导零件、检测、质量或审批业务规则。BOM、ECN、ECO 和完整 CAPA 仍只进入未来 Backlog，不进入第一阶段。

### 开源使用边界

只借鉴设计思想、信息架构和工程模式，不复制第三方业务源码或无法确认许可证兼容性的实现。正常开源依赖按其许可证使用；本项目业务规则必须由本项目文档、真实业务材料和验收测试定义。
