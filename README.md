# Rock Drill Quality Platform V2

面向单一制造企业的模块化 PLM 与质量数据平台。第一阶段聚焦零件质量检测闭环，并为后续轻量级 PLM 能力预留演进空间。

## 当前状态

V2 实施路线已冻结；Slice 1A、Slice 1B、Slice 1C 与 Slice 1D 均已完成。Slice 1D — User Management / Audit Foundation 已通过 `HUMAN_GATE_START` 并由 PR #9 合并进入 `master`；当前状态为 `CLOSED / completed`。Slice 2A — Part Category / Part Master 已通过 `HUMAN_GATE_START` 并在 `feat/slice-2a-part-master-numbering` 上执行，当前处于 `VERIFY`；active implementation: `Slice 2A`。Slice 2B — Part Revision lifecycle：`NEXT PLANNED / NOT ACTIVE / NOT AUTHORIZED`。数据库基础继续采用 PostgreSQL 17 与 Prisma 6.19.3，`DATABASE_URL` 与 `TEST_DATABASE_URL` 严格分离。

## 权威入口

产品范围与第一阶段路线权威入口见 [docs/PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md)，当前事实状态见 [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md)，工作授权入口见 [docs/ACTIVE_PLAN.md](docs/ACTIVE_PLAN.md)。模块归属与开源参考映射入口见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)，领域原则见 [docs/DOMAIN_MODEL.md](docs/DOMAIN_MODEL.md)。完整文档治理规则见 [docs/README.md](docs/README.md)。

只有存在获授权的 ACTIVE_PLAN 时才可直接开发业务代码。
