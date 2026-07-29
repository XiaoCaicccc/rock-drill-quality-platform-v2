# 开发纪律

一个 Slice 同时只能有一个 `ACTIVE_PLAN`。具体工作使用 GitHub Issue；每项开发使用独立分支，PR 和 CI 保存实现证据。

Migration 只能前进，已应用 Migration 不得修改。正常业务操作不得依赖手工 SQL；Seed 仅用于开发和测试；禁止生产 Setup API。发现范围外问题记入 `BACKLOG.md`。

业务规则变化必须先更新相关文档和决策，再修改代码。所有变更仍受根 `AGENTS.md` 约束。
