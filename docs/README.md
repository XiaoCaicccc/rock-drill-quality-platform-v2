# 文档治理

`CURRENT_STATE.md` 是唯一的当前状态来源，`ACTIVE_PLAN.md` 是唯一可执行计划，二者优先于其他叙述性文档。`DECISIONS.md` 是已确认架构和领域决策的权威日志；`PRODUCT_SCOPE.md` 定义产品边界；`DOMAIN_MODEL.md` 和 `ARCHITECTURE.md` 冻结当前模型与架构原则。

`BACKLOG.md` 仅收录范围外事项，不构成实施授权。`TESTING.md` 规定未来验证优先级，`DEVELOPMENT.md` 规定交付纪律。根目录 `README.md` 是简明入口，`AGENTS.md` 是执行约束。

更新必须保持文档之间一致：范围或计划变化先更新对应权威文档；领域模型或架构变化先新增或更新决策记录；随后同步受影响的说明。不得创建额外的 Phase、Review、Verification 或 Closure 文档替代本体系。
