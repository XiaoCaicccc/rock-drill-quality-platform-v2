# ACTIVE PLAN

Status: CLOSURE — Slice 2A

Slice 2A — Part Category / Part Master / Numbering Foundation 已通过 `HUMAN_GATE_START`，目标分支为 `feat/slice-2a-part-master-numbering`；真实 `START` preflight 与 PLAN 已完成，Draft PR #10 的 implementation CI run `32493511645` 已绑定提交 `7fee4a1f82656d7c627731b02faccb4edcc6f99b` 并 PASS，当前执行 closure docs/commit 与 final CI，active implementation: `Slice 2A`。

## Objective

交付 flat PartCategory、PartMaster 与 organization-scoped Numbering foundation，严格分离不可变内部 UUID、生成且不可变的 Part Number，以及可选 normalized Drawing Number；提供基础查询、权限、Audit、HTTP API 与业务工作区 UI。

## In scope

- `src/platform/numbering/`、`src/modules/part-category/`、`src/modules/part-master/`，各模块通过 `index.ts` 暴露正式能力并维护局部 `AGENTS.md`。
- forward-only Prisma migration、Organization composite FK/unique constraints、atomic monotonic non-gapless numbering、number never reissued。
- Category/PartMaster ACTIVE/INACTIVE 状态、no delete、no-op mutation 无 Audit、same-Organization boundary、ENGINEER mutation 与其他业务角色 read-only matrix。
- `/api/part-categories`、`/api/parts` 全部批准 HTTP surface，以及 `/parts`、`/parts/new`、`/parts/[partId]`、`/parts/categories` UI。
- 真实 PostgreSQL PART-DB-01～PART-DB-17、并发编号证据与 Slice 0～1D regression。

## Out of scope

- PartRevision/lifecycle、Equipment、Batch、Inspection、SupplierRelation/portal、BOM、ECN/ECO、category tree、Numbering HTTP API/UI、ledger/history、full-text search infrastructure，以及 Slice 2B+。
- 不修改 `docs/PRODUCT_SCOPE.md`、既有 migration、Slice 1 冻结的平台架构或 D-026。

## Acceptance and delivery

- `npm run db:validate`、`npm run db:generate`、`npm run check:full` 与 `git diff --check` PASS。
- Independent review 与 Human implementation review 均为 BLOCKER 0 / MAJOR 0；implementation CI 已绑定精确 SHA 并 PASS，closure CI 待执行。
- 当前 closure commit 通过 final CI 后流程才可进入 `READY_TO_MERGE`，等待 `HUMAN_GATE_MERGE`；不得自动 merge 或开始 Slice 2B。

Slice 1D — User Management / Access Closure / Audit Foundation 已完成并由 PR #9 合并进入 `master`；post-merge authoritative state 已同步，保持 `CLOSED / completed`。

Slice 2B — Part Revision lifecycle：`NEXT PLANNED / NOT ACTIVE / NOT AUTHORIZED`。
