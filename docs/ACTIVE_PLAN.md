# ACTIVE PLAN

Status: ACTIVE — Slice 2C — Equipment / EquipmentPosition Foundation

Slice 2B — Part Revision Lifecycle 已由 PR #11 使用普通 merge commit `d9e9b33995803869cb1396a967d93d1814570307` 合并进入 `master`，状态为 `CLOSED / completed`。其 implementation、closure 与 post-merge master CI 均已通过；post-merge authoritative state commit 为 `9874c3bf4ce16d3b67dff6b7567233c14be8f974`。

Slice 2C 的 `HUMAN_GATE_START` 已获批准，正式 START preflight 已 PASS，现为 `ACTIVE`。本 Slice 仅实现同 Organization 的 Equipment 与 flat EquipmentPosition 主数据、`EQ-` organization-scoped 编号、ACTIVE/INACTIVE 生命周期、无硬删除、Audit 原子性、授权、API/UI 与真实 PostgreSQL 并发证据。不得实现 Installation、history、PartInstance、Batch、Revision、Position hierarchy、BOM、QR、ExternalIdentifier、Inspection 或任何 Slice 4B 工作；不得自动开始任何后续 Slice。
