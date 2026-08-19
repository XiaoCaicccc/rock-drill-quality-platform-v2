# 开发纪律

一个 Slice 同时只能有一个 `ACTIVE_PLAN`。一个 Codex 项目长期对应一个 Git 仓库；一个明确、可验收的交付目标对应一个 Codex 任务；一个开发任务使用一个独立分支。任务完成、验收、提交并更新 `CURRENT_STATE.md` 后封存，不按消息数量决定是否换任务。地基阶段禁止并行开发。

Git worktree 只用于真正互不依赖、不会修改相同 Schema、公共接口或公共配置的任务。范围内缺陷在原任务修复；范围外事项进入 `BACKLOG.md`，不得顺带实现。具体工作使用 GitHub Issue；PR 和 CI 保存实现证据。

Migration 只能前进，已应用 Migration 不得修改。正常业务操作不得依赖手工 SQL；Seed 仅用于开发和测试；禁止生产 Setup API。

第一份及后续 Prisma Migration 应在开发阶段生成后审计 SQL；测试数据库只能从 `TEST_DATABASE_URL` 通过 `npm run db:migrate:test` 与 `migrate deploy` 部署。正式运行仅允许 `migrate deploy`；禁止对共享或正式数据库使用 `db push`、`migrate reset` 或 `migrate dev`。`DATABASE_URL` 与 `TEST_DATABASE_URL` 严格隔离，`.env` 与任何连接信息不得提交。

Prisma schema 的正式数据源仅使用 `DATABASE_URL`。`TEST_DATABASE_URL` 仅供真实集成测试 Client 使用，两个变量不得回退或互用。开发环境使用 `globalThis` 复用正式 Prisma Client；测试 Client 不进入正式运行单例。开发创建 Migration 使用 `npm run db:migrate:dev`，生产只运行 `npm run db:migrate:deploy`；不得将 `db push` 作为正式迁移路径。

业务规则变化必须先获得批准、更新相关文档和决策，再修改代码。所有变更仍受根 `AGENTS.md` 约束。

## Post-merge state reconciliation

- `READY_TO_MERGE` 不是 Slice `CLOSED`。HUMAN merge 完成后，post-merge cleanup 必须核对 `master` 的真实 merge 状态。
- 在 Slice 被宣布 `CLOSED` 前，`master` 上 tracked authoritative docs 必须与真实 merge 状态一致：至少 `CURRENT_STATE.md` 记录 completed / merged 状态；`ACTIVE_PLAN.md` 回到 `NO ACTIVE IMPLEMENTATION PLAN`，除非新的 Slice 已单独获得 `HUMAN_GATE_START`；根 `README.md` 的简要当前状态同步更新。
- Runtime checkpoint `CLOSED` 不能替代 tracked authoritative docs 的同步。若 tracked docs 仍停留在 `CLOSURE` / `READY_TO_MERGE`，不得宣告完整 closure。
- 下一 Slice 的 PREFLIGHT 必须把 post-merge state drift 作为 blocker / reconciliation item 处理，不得直接覆盖或据此激活下一 Slice。

## 工程基线

- 使用 Node.js 24 与 npm；CI 和干净安装必须使用 `npm ci`。
- `package-lock.json` 必须提交，且不得同时存在 yarn、pnpm 或 Bun 锁文件。
- Node 或 npm 版本变化必须先新增决策记录；依赖升级必须由独立任务实施。

## 测试与平台边界

- 使用 `npm run test` 执行单元测试，使用 `npm run test:watch` 进行本地观察测试；`npm run check` 必须包含测试。
- 业务代码不得直接读取系统本地时区；未来 Use Case 不得散落 `new Date()` 或 `Date.now()`，应依赖 Clock。
- Error code 的变更属于公共接口契约变更。
- 平台模块对外只能通过各自 `index.ts` 导出。

## 本地验证与部署边界

本地完整验证使用 `npm.cmd run db:validate`、`npm.cmd run db:generate` 和 `npm.cmd run check:full`；真实数据库测试仍只通过开发者本地 `.env` 中的 `TEST_DATABASE_URL` 连接。GitHub Actions 使用其隔离的 PostgreSQL 17 service container 运行同一验证链，Vercel 只负责当前 Next.js Preview 部署，两者职责分离。

`GET /api/health` 是 Node.js 进程存活检查，不访问数据库、不创建 Prisma Client，也不代表数据库或业务服务已就绪。不得提交 `.env` 或本地连接信息。
