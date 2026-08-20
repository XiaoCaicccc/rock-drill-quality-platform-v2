# ACTIVE PLAN

## Status: ACTIVE — Slice 1D

Slice 1D — User Management / Access Closure / Audit Foundation 已通过 `HUMAN_GATE_START`，在 `feat/slice-1d-access-closure` 上执行。

当前从 `BLOCKED` checkpoint 执行一次人工批准的 exceptional repair extension：normal repair rounds `5/5` 保持不变，exceptional human-approved repair extension `1/1`。本次 repair 仅处理独立审阅已报告的 mutation capability invariant、OrgUnit 错误契约、login redirect、Audit 时间契约、security/API negative matrix 与状态文档一致性；在完整独立审阅达到 `BLOCKER 0 / MAJOR 0` 前不得 commit、push 或创建 PR。

## Objective

完成 Organization → Account → Authentication / Session → Authorization → User Management → Role Assignment → Password / Device Security → Audit 的第一版访问闭环。

## In scope

- `/login`、authenticated home、`/forbidden`、最小用户管理、角色分配、审计查询与账户安全页面。
- Admin-only 平台管理 permissions、same-Organization 边界、安全 DTO 与服务端最终授权。
- Account 创建、查询、displayName/primary OrgUnit 更新、ACTIVE/INACTIVE/LOCKED 状态与 Session 原子撤销。
- Role Assignment 查询、分配与撤销；primary OrgUnit 与 Role scope 保持独立。
- Last Effective Admin 保护及 Organization row `FOR UPDATE` 串行化，不改变 D-026。
- 自助修改密码、管理员重置他人密码、旧密码并发登录竞态关闭、Session/device 管理。
- USER/SYSTEM Audit actor、secret-safe details、业务 mutation 与 Audit 同事务、查询 API/UI。
- `bootstrap-admin` fresh install、existing Account promotion、already-completed conflict 与并发收口。
- forward-only Audit Migration、行为/API/页面测试与真实 PostgreSQL `ACCESS-DB-01`～`ACCESS-DB-12` 证据。

## Out of scope

- Part、PartRevision、Equipment、Inspection、Report、QR 或任何 Slice 2A+ 工作。
- Organization/OrgUnit 管理 UI、custom Role/Permission、role hierarchy、explicit DENY。
- MFA、OAuth、SSO、邀请、邮件找回、mustChangePassword、密码过期或强制轮换。
- login/logout security event ledger、emergency approval override、Dashboard 或重型设计系统。
- 修改 D-026、Slice 1B Session architecture、Slice 1C Authorization architecture 或已冻结产品范围。

## Acceptance and delivery

- 用户管理、权限闭环、密码/Session 安全、Audit 与 bootstrap 行为满足批准文本。
- PostgreSQL `ACCESS-DB-01`～`ACCESS-DB-12` 通过确定性真实数据库测试；Slice 0、1A、1B、1C 全部不回归。
- `npm run db:validate`、`npm run db:generate`、`npm run check:full` 与 `git diff --check` PASS。
- 独立审查为 BLOCKER 0 / MAJOR 0；implementation CI 与 closure CI 均绑定精确 SHA 并 PASS。
- 流程只到 `READY_TO_MERGE`，等待 `HUMAN_GATE_MERGE`；不得自动合并或开始 Slice 2A。
