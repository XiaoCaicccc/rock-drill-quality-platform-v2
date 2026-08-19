# Rock Drill Quality Platform V2

面向单一制造企业的模块化 PLM 与质量数据平台。第一阶段聚焦零件质量检测闭环，并为后续轻量级 PLM 能力预留演进空间。

## 当前状态

V2 实施路线已冻结；Slice 1B（Account / Authentication / DB-backed Revocable Session foundation）已完成并通过本地、真实 PostgreSQL、独立审阅与 PR CI 验证。Slice 0 与 Slice 1A 也已完成；数据库基础采用 PostgreSQL 17 与 Prisma 6.19.3，`DATABASE_URL` 与 `TEST_DATABASE_URL` 严格分离。当前没有活动实施计划，Slice 1C / 1D 未激活。

## 权威入口

产品范围与第一阶段路线权威入口见 [docs/PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md)，当前事实状态见 [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md)，工作授权入口见 [docs/ACTIVE_PLAN.md](docs/ACTIVE_PLAN.md)。模块归属与开源参考映射入口见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)，领域原则见 [docs/DOMAIN_MODEL.md](docs/DOMAIN_MODEL.md)。完整文档治理规则见 [docs/README.md](docs/README.md)。

只有存在获授权的 ACTIVE_PLAN 时才可直接开发业务代码。
