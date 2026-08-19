# 当前状态

Slice 1C — Role / Permission / Data Scope Authorization Foundation：`CLOSED / completed`。PR #7 已人工合并进入 `master`，merge commit 为 `25413578eec88d8a4d7c06febe997b49358b9cec`。

已完成并验证的核心能力包括：five fixed Roles、persistent `AccountRoleAssignment`、code-declared Permission Policy、six Data Scopes、Organization boundary、creator/reviewer separation、live authorization lookup、Organization subtree public capability，以及 PostgreSQL authorization acceptance/concurrency。

最终已验证基线：16 个 ordinary test files、79/79 ordinary tests PASS；4 个 PostgreSQL test files、36/36 PostgreSQL tests PASS；`db:validate` PASS、`db:generate` PASS、`check:full` PASS；implementation CI PASS、closure CI PASS；independent review 为 BLOCKER 0 / MAJOR 0，human architecture/security review 为 BLOCKER 0 / MAJOR 0。

当前 active implementation：`NONE`。Slice 1D 是 `NEXT PLANNED`，但 `NOT ACTIVE / NOT AUTHORIZED`；必须另行获得新的 `HUMAN_GATE_START` 才可激活。

Slice 1B：Account / Authentication / DB-backed Revocable Session foundation 已完成。已建立 Account、Argon2id password credential、opaque DB-backed Session、七天绝对有效期、撤销与三 Session 上限、认证 API、own-session 操作、单一 identity application bootstrap、可复用 authenticated RequestContext，以及正式 PostgreSQL 锁边界并发证据。FINAL_VERIFY 通过：lint、typecheck、14 个普通测试文件 / 48 tests、production build、`db:migrate:test`、DB-01～DB-04、ORG-DB-01～ORG-DB-13 与 Slice 1B acceptance/concurrency tests；数据库测试共 3 个文件 / 26 tests。独立审阅为 0 BLOCKER / 0 MAJOR；PR #6 的实现提交 GitHub Actions `verify` 与 Vercel 检查已通过。Slice 1D 未激活，不得在没有新授权时实施。

Slice 0A 项目控制基线已完成；Slice 0B-1 至 Slice 0B-4 也已完成。

Slice 0B-1 已完成：Next.js 16.2.12 工程已初始化，使用 Node.js 24.18.0、npm 11.12.1、App Router、TypeScript strict、Tailwind CSS、ESLint 和 `@/*` 导入别名。

Slice 0B-2 及其审阅修正已完成：已建立 `errors`、`time` 和 `request-context` 三个纯 TypeScript 平台模块，并以 Vitest 作为 Node 环境单元测试工具。

Slice 0B-3 已完成：数据库基础采用 PostgreSQL 17.10 与 Prisma 6.19.3。正式 Prisma schema 与 `getPrismaClient()` 只使用 `DATABASE_URL`；真实集成测试的 `createTestPrismaClient()` 只使用 `TEST_DATABASE_URL` 并通过 datasource 覆盖连接，两个变量严格分离、不回退、不互用。正式 Client 在开发环境经由 `globalThis` 复用以避免热重载重复创建连接池；测试 Client 不进入正式运行单例。

最终验证已通过：`npm run db:validate`、`npm run db:generate`、`npm run check:full` 和 `npm run build`。普通测试为 4 个文件、17/17 tests passed；真实 PostgreSQL 数据库测试为 1 个文件、DB-01 至 DB-04 共 4/4 tests passed，覆盖 PostgreSQL 主版本 17、transaction commit、transaction rollback 和 cleanup。数据库测试使用固定专用 Schema、固定测试表和参数化测试行标识，已全部移除 Unsafe Raw SQL。

Slice 0B-4 已完成：GitHub Actions CI 位于 `.github/workflows/ci.yml`，在针对 `master` 的 pull request、推送到 `master` 及手动触发时运行。CI 使用 Node.js 24.18.0、npm 和隔离的 PostgreSQL 17 service container，已成功执行 `db:validate`、`db:generate` 与 `check:full`。`GET /api/health` 是无数据库依赖、无 Prisma Client 的 Node.js liveness endpoint；GitHub Actions verify 已通过，Vercel Preview 为 Ready。

普通测试基线为 16 个文件、79/79 tests passed；真实 PostgreSQL 数据库测试基线为 4 个文件、36/36 tests passed。V2 第一阶段 Slice 0～8 路线已冻结，Slice 0A、0B-1、0B-2、0B-3、0B-4、Slice 1A、Slice 1B 与 Slice 1C 已完成；当前没有 active implementation，Slice 1D 仅为 next planned 且未激活。Organization 位于 `src/platform/organization`，Identity / Session 位于 `src/platform/identity-session`，Authorization 位于 `src/platform/authorization`；`.env` 和本地连接信息未进入 Git。
