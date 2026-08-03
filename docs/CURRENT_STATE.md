# 当前状态

Slice 0A 项目控制基线已完成。

Slice 0B-1 已完成：Next.js 16.2.12 工程已初始化，使用 Node.js 24.18.0、npm 11.12.1、App Router、TypeScript strict、Tailwind CSS、ESLint 和 `@/*` 导入别名。

Slice 0B-2 及其审阅修正已完成：已建立 `errors`、`time` 和 `request-context` 三个纯 TypeScript 平台模块，并以 Vitest 作为 Node 环境单元测试工具。

Slice 0B-3 已完成：数据库基础采用 PostgreSQL 17.10 与 Prisma 6.19.3。正式 Prisma schema 与 `getPrismaClient()` 只使用 `DATABASE_URL`；真实集成测试的 `createTestPrismaClient()` 只使用 `TEST_DATABASE_URL` 并通过 datasource 覆盖连接，两个变量严格分离、不回退、不互用。正式 Client 在开发环境经由 `globalThis` 复用以避免热重载重复创建连接池；测试 Client 不进入正式运行单例。

最终验证已通过：`npm run db:validate`、`npm run db:generate`、`npm run check:full` 和 `npm run build`。普通测试为 4 个文件、17/17 tests passed；真实 PostgreSQL 数据库测试为 1 个文件、DB-01 至 DB-04 共 4/4 tests passed，覆盖 PostgreSQL 主版本 17、transaction commit、transaction rollback 和 cleanup。数据库测试使用固定专用 Schema、固定测试表和参数化测试行标识，已全部移除 Unsafe Raw SQL。

当前没有业务 Model、业务 Migration 或空 Migration，也没有认证、权限、Session、API Route、健康检查或 CI；`.env` 和连接信息未进入 Git，且未进入 Slice 0B-4。
