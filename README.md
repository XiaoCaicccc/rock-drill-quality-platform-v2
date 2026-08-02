# Rock Drill Quality Platform V2

面向单一制造企业的模块化 PLM 与质量数据平台。第一阶段聚焦零件质量检测闭环，并为后续轻量级 PLM 能力预留演进空间。

## 当前状态

Slice 0B-2（错误、时间与请求上下文基础）已完成。V2 已具备可安装、可启动、可检查、可构建并可运行纯 TypeScript 单元测试的 Next.js 工程基础，同时建立了错误、时间和 RequestContext 平台模块。Vitest 4.1.10 当前包含 3 个测试文件、11 项通过测试；lint、typecheck、test、build 和 check 均已通过。尚未实现数据库、认证、权限、API Route 或业务模块。

## 权威入口

产品范围见 [docs/PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md)，当前事实状态见 [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md)，工作授权入口见 [docs/ACTIVE_PLAN.md](docs/ACTIVE_PLAN.md)，架构与领域原则分别见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 和 [docs/DOMAIN_MODEL.md](docs/DOMAIN_MODEL.md)。完整文档治理规则见 [docs/README.md](docs/README.md)。

只有存在获授权的 ACTIVE_PLAN 时才可直接开发业务代码。

数据库基础使用 PostgreSQL 17 与 Prisma 6.19.3：正式运行数据库变量为 `DATABASE_URL`，真实集成测试变量为 `TEST_DATABASE_URL`。二者严格分离，不得回退或互用；当前没有业务 Model、Migration、认证、权限、Session、API Route、健康检查或 CI。
