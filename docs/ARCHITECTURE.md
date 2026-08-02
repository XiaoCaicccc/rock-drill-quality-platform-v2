# 架构原则

采用模块化单体，不采用微服务。平台底座与业务模块分离：平台模块包括 Identity and Session、Organization、Authorization、Audit、Numbering、QR Access、File Metadata、Import Infrastructure、Error Handling、Observability、Time；PLM 模块包括 Part Category、Part Master、Part Revision、Supplier Relation、Batch、Part Instance、Equipment、Equipment Position、Installation；质量模块包括 Inspection Template、Inspection Template Version、Inspection Task、Inspection Record、Inspection Result、Inspection Correction、Basic Nonconformance、Inspection Ledger、Analysis Report、Report Review、Report Snapshot。

依赖方向为：质量模块可依赖 PLM 和平台模块；PLM 模块可依赖平台模块；平台模块不得依赖业务模块；同层模块仅通过明确的应用接口和内部 ID 协作。禁止万能 Service、万能 Entity 与万能工作流引擎。

## 权限

权限命名采用“模块.业务动作”，例如 `part_revision.submit_review`、`part_revision.approve`、`part_revision.release`、`inspection_task.execute`、`inspection_record.correct`、`report.publish`、`audit.view`。

最终权限由用户身份、功能权限、组织、Data Scope、对象归属、对象状态和创建人与审核人隔离共同决定。Data Scope 至少支持 `ALL`、`ORG_SUBTREE`、`ORG_UNIT`、`ASSIGNED`、`OWN_CREATED`、`NONE`。权限必须在服务端校验；前端隐藏按钮不能替代授权。审核与关键业务写入须与审计在同一事务提交。

## Session

使用数据库可撤销 Session。每个账号最多三条有效设备 Session；第四台设备登录时必须先撤销一台已有设备。后端必须通过事务保证设备上限，不能只依赖前端计数。

## 时间、编号与二维码

企业业务时区固定为 `Asia/Shanghai`，业务日期、精确时间和有效区间须分别表达。编号与内部 ID 分离。二维码仅是统一对象入口，不保存第二份业务数据；第一阶段二维码内容必须登录后才能访问。

## Excel 导入

Excel 导入必须经过上传、解析、映射、预览、校验、确认、事务写入和导入记录。服务端解析结果是唯一权威结果；前端只负责上传、映射、预览和确认，不允许前端与服务端使用两套可能产生不同结果的业务解析逻辑。导入必须保存原文件、字段映射、逐行结果和导入记录。

## AI 开发护栏

根 `AGENTS.md` 负责仓库级规则。将来创建核心业务模块时，每个模块应创建简短的局部 `AGENTS.md`，仅描述模块职责、Always、Ask First、Never、依赖边界和验证命令；不得把 `AGENTS.md` 变成开发历史文档。

已确认的工程技术基线为 Node.js 24 LTS、npm、当前稳定版 Next.js、App Router、TypeScript strict、`src/` 目录、ESLint、Tailwind CSS、`@/*` 导入别名、单应用仓库和模块化单体。业务服务默认使用 Node.js Runtime；第一阶段不建立 Monorepo，也不启用 React Compiler。

数据库可撤销 Session 的架构原则已由 D-011 确认，不是候选方案。Session 表结构、Token 生成与哈希方式、Cookie 配置、过期策略、设备识别和并发实现仍待后续任务设计。

V2 数据库基础使用 PostgreSQL 17 与 Prisma。数据库连接仅从运行时环境变量 `TEST_DATABASE_URL` 读取；连接串、用户名、密码、主机与端口不得写入已跟踪文件、日志或提交。当前 Slice 仅建立不含业务表和业务 Migration 的 Prisma 基础，以及真实 PostgreSQL 事务集成测试；业务 Schema、认证框架、S3 兼容对象存储、Excel 库、部署平台、UI 组件库和后台任务系统仍是候选或后续决策。

## 平台基础模块

`Error Handling` 提供稳定错误代码、`AppError` 和框架无关的安全公共错误响应。Transport Adapter 未来只负责将该响应转换为实际 HTTP Response；业务 Use Case 不依赖 Transport API，未知错误不得公开原始信息。

`Time` 明确区分业务日历日期（BusinessDate）、精确时间点（UTC Instant）和有效区间；有效区间遵循 `[from, to)`。企业业务时区固定为 `Asia/Shanghai`，Use Case 通过 `Clock` 获取当前时间，不能以运行环境本地时区为业务依据。

`RequestContext` 显式传递 `requestId`、`receivedAt`、`businessTimeZone` 和联合类型 `actor`。它不保存权限快照、密码、Token 或 Cookie；未来 Transport Adapter、Use Case 和审计可共享同一个 Context。errors、time 和 request-context 均不依赖 Next.js Transport API，且 request-context 仅通过 time 的公开入口依赖 time。
