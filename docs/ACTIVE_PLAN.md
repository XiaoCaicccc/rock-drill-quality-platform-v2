# ACTIVE PLAN

Status: CLOSURE — Slice 2B

## Slice 2B — Part Revision Lifecycle

Branch: `feat/slice-2b-part-revision-lifecycle`

HUMAN_GATE_START: `APPROVED`

Draft PR #11 的 implementation CI run `32575582886` 已绑定提交 `3d971a45f0a0c240786bbd30bc1ddddbf21767dc` 并 PASS；GitHub Actions isolated PostgreSQL 17 已完成 `db:migrate:test`、`check:full` 与完整 `test:db`（7 files / 101 tests，包含 REV-DB-01～REV-DB-20、附加 Slice 2B acceptance 及既有回归）。当前执行 closure docs/commit 与 final CI；不得自动 merge 或启动 Slice 2C。

Scope: establish the organization-scoped `PartRevision` and immutable `PartRevisionReview` lifecycle only: strict linear `DRAFT -> REVIEWING -> RETURNED|APPROVED -> RELEASED` transitions, one unreleased revision per PartMaster, PartMaster-scoped integer revision allocation under its row serialization boundary, release immutability, creator-review separation with explicit ADMIN override reason, atomic audit history, drawing-number freeze after the first Revision, public API/UI, and the required PostgreSQL/API/behavior evidence.

In scope: the `src/modules/part-revision/` module and its module rules; the narrow PartMaster application change required to share the PartMaster lock boundary and enforce drawing-number freeze; one forward-only Prisma migration; API routes; revisions UI; tests and the authoritative Slice 2B decision/model/architecture/testing records.

Out of scope: cancellation/deletion, CAD/BOM/material/routing blobs, generic workflow/approval engines, parallel/merged revisions, Equipment and all Slice 2C+ work, Supplier portal, Batch/PartInstance, Inspection, and any PRODUCT_SCOPE change.

Required acceptance: REV-DB-01 through REV-DB-20, retained PART-DB-01 through PART-DB-17 regression, full role/API security matrix, immutable review/audit evidence, deterministic real-PostgreSQL concurrency evidence, `db:validate`, `db:generate`, `check:full`, and `git diff --check`.

Independent review and Human implementation review are BLOCKER 0 / MAJOR 0. The implementation CI is PASS; the closure commit must pass final CI before the workflow may enter `READY_TO_MERGE`, then wait for `HUMAN_GATE_MERGE`.
