# Repository Execution Rules

本文件是本仓库 Codex 与自动化代理的最高执行约束。

## 工作前必读顺序

1. `README.md`
2. `docs/README.md`
3. `docs/CURRENT_STATE.md`
4. `docs/ACTIVE_PLAN.md`
5. 与任务相关的 `docs/PRODUCT_SCOPE.md`、`docs/DOMAIN_MODEL.md`、`docs/ARCHITECTURE.md`、`docs/DECISIONS.md`、`docs/TESTING.md`、`docs/DEVELOPMENT.md` 与 `docs/BACKLOG.md`

任务开始前必须检查 Git 分支和工作区状态。当前只允许执行 `docs/ACTIVE_PLAN.md` 所定义的工作；ACTIVE_PLAN 不得覆盖长期权威文档，不得自动扩大范围。范围内问题留在当前任务处理；范围外问题只能记录到 `docs/BACKLOG.md`，不得顺带实现。

不得绕过权限、状态机、事务或审计；不得直接修改已发布的历史数据；禁止直接编辑 `.git` 内部文件。当目录中存在更具体的 `AGENTS.md` 时，必须同时遵守其约束。

修改产品范围、领域模型、架构或长期决策前，必须停止实施并请求用户明确批准。获批后，先更新 `docs/DECISIONS.md` 及相应权威文档，再修改代码。不得直接复制任何开源项目代码，尤其不得复制受 AGPL 或其他许可证约束项目的代码。

每次任务结束必须报告：修改文件、运行命令、测试结果、未解决问题，以及是否修改了架构或领域模型。
