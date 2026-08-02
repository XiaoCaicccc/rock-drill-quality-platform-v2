# 决策日志

所有记录日期：2026-07-29。

| ID | 状态 | 决策 | 原因 | 影响 | 被否决方案 | 日期 |
| --- | --- | --- | --- | --- | --- | --- |
| D-001 | 已确认 | 使用模块化单体 | 在保持边界的同时降低早期运维复杂度 | 模块须保持单向依赖 | 微服务 | 2026-07-29 |
| D-002 | 已确认 | 单企业、多组织单元 | 匹配当前客户边界 | 不建设多租户隔离 | 多租户 SaaS | 2026-07-29 |
| D-003 | 已确认 | 内部 ID 与业务编号分离 | 保障稳定引用与可变业务编号 | 关联只使用内部 ID | 用业务编号作为主关联 | 2026-07-29 |
| D-004 | 已确认 | 创建人与审核人隔离；管理员紧急越权须留痕 | 创建人原则上不能审核自己创建的零件版本、模板和报告；紧急情形仍须可审计 | 管理员仅可紧急越权，必须填写原因并与业务变更一起写入审计 | 创建人自审、无原因越权 | 2026-07-29 |
| D-005 | 已确认 | 审核与发布分开 | 区分质量确认与正式生效 | 生命周期有两个明确步骤 | 单一步骤发布 | 2026-07-29 |
| D-006 | 已确认 | 企业时区为 Asia/Shanghai | 统一业务日期边界 | 时间规则按该时区验证 | 使用服务器本地时区 | 2026-07-29 |
| D-007 | 已确认 | 第一阶段二维码必须登录 | 防止对象信息匿名暴露 | QR Access 接入身份与授权 | 匿名二维码访问 | 2026-07-29 |
| D-008 | 已确认 | V2 独立于 V1 建设 | 避免历史实现约束新模型 | V1 仅用于需求验证 | 复制或迁移 V1 代码 | 2026-07-29 |
| D-009 | 已确认 | 精简 docs + Git/PR/CI 保存过程证据 | 维持可追溯且低负担的治理 | 文档和交付纪律须同步 | 额外阶段性文档体系 | 2026-07-29 |
| D-010 | 已确认 | 正常使用开源依赖但不复制第三方业务系统实现 | 许可证允许时可使用开源框架、库和依赖，同时保持独立业务实现 | 仅可吸收设计思想；禁止复制 Carbon、InvenTree、Cascadia PLM、ERPNext、Part-DB 等第三方业务系统源码或受许可证约束实现 | 复制第三方业务系统代码 | 2026-07-29 |
| D-011 | 已确认 | 数据库可撤销 Session，每账号最多三台有效设备 | 使设备登录可管理且可强制撤销 | 上限须由后端事务保证 | 不可撤销 Session、仅前端计数 | 2026-07-29 |
| D-012 | 已确认 | 检测任务保存版本和判定规则快照 | 保证任务与历史判定可复现 | 后续版本变化不得改变已有任务 | 运行时读取最新模板或零件版本 | 2026-07-29 |
| D-013 | 已确认 | 服务端 Excel 解析结果为唯一权威结果 | 避免前后端解析产生不同业务结论 | 保存服务端逐行结果和导入记录 | 前后端双重业务解析 | 2026-07-29 |
| D-014 | 已确认 | 根 AGENTS.md 与未来模块级 AGENTS.md 构成 Codex 开发护栏 | 同时保持仓库规则统一和模块边界清晰 | 局部规则须服从根规则且保持简短 | 仅靠根规则、以开发历史填充 AGENTS.md | 2026-07-29 |
| D-015 | 已确认 | 使用 Node.js 24 LTS 与 npm | 使用受支持的 LTS 运行时和唯一包管理器 | 提交 `package-lock.json`，并在 `package.json` 固定 `engines` 与 `packageManager` | Current 或 EOL Node、pnpm、yarn、Bun | 2026-07-29 |
| D-016 | 已确认 | 使用当前稳定版 Next.js App Router 工程基线 | 提供统一的 V2 Web 工程入口 | 使用 TypeScript strict、`src/`、ESLint、Tailwind CSS、`@/*` 别名；暂不启用 React Compiler | Pages Router、Biome、React Compiler | 2026-07-29 |
| D-017 | 已确认 | 第一阶段使用单应用仓库 | 在早期保持实现和部署边界清晰 | 在单一应用中维持模块化单体边界，出现真实独立部署需求后再评估拆分 | Monorepo、拆分独立前后端仓库 | 2026-07-29 |
| D-018 | 已确认 | 业务服务使用 Node.js Runtime | 未来的事务、文件和集成能力不适合 Edge 限制 | Prisma、认证、Excel、文件和事务逻辑不得部署到 Edge；未来 Middleware/Proxy 仅可承担轻量跳转或无数据库判断，最终权限判断仍在服务端 Use Case 执行 | Edge Runtime 业务服务 | 2026-07-29 |
| D-019 | 已确认 | 使用稳定、机器可读的统一错误契约 | 使调用方可依赖错误代码而不暴露内部细节 | 公共响应包含 code、message、requestId 与可选 details；未知错误统一隐藏；框架 Adapter 负责实际 HTTP 转换，平台模块不依赖 NextResponse | 以 UI 文案作为错误代码、直接暴露原始异常 | 2026-07-30 |
| D-020 | 已确认 | 分离 BusinessDate、Instant 与 Clock | 避免日期、时间点和运行时当前时间混用 | 企业时区固定为 Asia/Shanghai；Instant 规范化为 UTC；有效区间保持 [from, to)；Use Case 通过 Clock 获取当前时间，不依赖运行环境本地时区 | 服务器本地时区、散落的 Date.now() | 2026-07-30 |
| D-021 | 已确认 | 显式传递 RequestContext | 保持请求元数据可追踪并避免全局可变状态 | Context 包含 requestId、receivedAt、businessTimeZone 与 actor；不保存密码、Token、Cookie、角色或权限快照；Transport Adapter、Use Case 与审计未来共享同一 Context | 全局请求上下文、权限快照 | 2026-07-30 |
| D-022 | 已确认 | 使用 Vitest 作为纯 TypeScript 单元测试基线 | 为领域规则和平台纯函数提供快速、确定性的 Node 测试 | 测试文件为 *.test.ts；固定 Clock 和 RequestId factory 用于确定性测试；不自动引入浏览器测试工具；Mock 不能替代真实 PostgreSQL 行为证明 | Jest、浏览器环境测试作为默认基线 | 2026-07-30 |
| D-023 | 已确认 | V2 数据库基线采用 PostgreSQL 17 与 Prisma 6.19.3 | 为正式运行和真实事务验证建立明确、受支持且隔离的数据库基础 | 正式 Prisma schema 与 `getPrismaClient()` 只使用 `DATABASE_URL`；集成测试的 `createTestPrismaClient()` 只使用 `TEST_DATABASE_URL` 并通过 Prisma datasource 覆盖连接；两者不得回退或互用。开发环境复用 globalThis 中的正式 Client，测试 Client 不进入该单例。Migration 只能向前，生产只运行 `prisma migrate deploy`；当前没有业务 Model 或 Migration。连接信息不得写入已跟踪文件、日志或提交 | PostgreSQL 16 基线、混用运行与测试连接、以 Mock 代替真实 PostgreSQL 事务验证、生产使用 db push | 2026-08-02 |
