# 文档治理

各文档按职责分别权威：

- `PRODUCT_SCOPE.md`：产品范围、明确不做事项和第一阶段权威 Slice 路线的权威来源。
- `DECISIONS.md`：已确认长期决策及路线变更依据的权威来源。
- `DOMAIN_MODEL.md`：领域概念、关系和生命周期的权威来源。
- `ARCHITECTURE.md`：模块归属、依赖方向、技术边界和开源设计参考映射的权威来源。
- `CURRENT_STATE.md`：当前事实状态的唯一来源。
- `ACTIVE_PLAN.md`：当前工作授权的唯一来源。
- `BACKLOG.md`：未来工作记录，不构成当前实施路线或实施授权。

`TESTING.md` 规定未来验证优先级，`DEVELOPMENT.md` 规定交付纪律。根目录 `README.md` 是简明入口，`AGENTS.md` 是执行约束。

ACTIVE_PLAN 必须遵守 `PRODUCT_SCOPE.md`、`DECISIONS.md`、`DOMAIN_MODEL.md` 和 `ARCHITECTURE.md`；不得通过活动计划覆盖长期决策或扩大产品范围。更新必须保持文档之间一致：经批准的长期变化先更新决策及对应权威文档，再同步受影响说明。不得创建第二份路线文档，也不得创建额外的 Phase、Review、Verification 或 Closure 文档替代本体系。
