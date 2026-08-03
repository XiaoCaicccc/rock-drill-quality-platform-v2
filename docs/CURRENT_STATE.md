# 当前状态

Slice 0A 项目控制基线已完成；Slice 0B-1 至 Slice 0B-4 也已完成。

Slice 0B-1 已完成：Next.js 16.2.12 工程已初始化，使用 Node.js 24.18.0、npm 11.12.1、App Router、TypeScript strict、Tailwind CSS、ESLint 和 `@/*` 导入别名。

Slice 0B-2 及其审阅修正已完成：已建立 `errors`、`time` 和 `request-context` 三个纯 TypeScript 平台模块，并以 Vitest 作为 Node 环境单元测试工具。

Slice 0B-3 已完成：数据库基础采用 PostgreSQL 17.10 与 Prisma 6.19.3。正式 Prisma schema 与 `getPrismaClient()` 只使用 `DATABASE_URL`；真实集成测试的 `createTestPrismaClient()` 只使用 `TEST_DATABASE_URL` 并通过 datasource 覆盖连接，两个变量严格分离、不回退、不互用。正式 Client 在开发环境经由 `globalThis` 复用以避免热重载重复创建连接池；测试 Client 不进入正式运行单例。

最终验证已通过：`npm run db:validate`、`npm run db:generate`、`npm run check:full` 和 `npm run build`。普通测试为 4 个文件、17/17 tests passed；真实 PostgreSQL 数据库测试为 1 个文件、DB-01 至 DB-04 共 4/4 tests passed，覆盖 PostgreSQL 主版本 17、transaction commit、transaction rollback 和 cleanup。数据库测试使用固定专用 Schema、固定测试表和参数化测试行标识，已全部移除 Unsafe Raw SQL。

Slice 0B-4 已完成：GitHub Actions CI 位于 `.github/workflows/ci.yml`，在针对 `master` 的 pull request、推送到 `master` 及手动触发时运行。CI 使用 Node.js 24.18.0、npm 和隔离的 PostgreSQL 17 service container，已成功执行 `db:validate`、`db:generate` 与 `check:full`。`GET /api/health` 是无数据库依赖、无 Prisma Client 的 Node.js liveness endpoint；GitHub Actions verify 已通过，Vercel Preview 为 Ready。

普通测试为 5 个文件、18/18 tests passed；真实 PostgreSQL 数据库测试为 1 个文件、DB-01 至 DB-04 共 4/4 tests passed。当前正在进行纯文档路线冻结，Slice 1A 尚未开始。当前仍没有 Organization、Account、Session、Authorization 或业务 Model，也没有业务 Migration 或空 Migration；`.env` 和本地连接信息未进入 Git。之前生成的旧 Slice 1A 提示词未实施，且不作为权威输入；路线冻结合并后，下一项才是修正版 Slice 1A。
