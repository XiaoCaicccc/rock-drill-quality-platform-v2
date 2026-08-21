# ACTIVE PLAN

Status: ACTIVE IMPLEMENTATION PLAN

## Slice 2B — Part Revision Lifecycle

Branch: `feat/slice-2b-part-revision-lifecycle`

HUMAN_GATE_START: `APPROVED`

Scope: establish the organization-scoped `PartRevision` and immutable `PartRevisionReview` lifecycle only: strict linear `DRAFT -> REVIEWING -> RETURNED|APPROVED -> RELEASED` transitions, one unreleased revision per PartMaster, PartMaster-scoped integer revision allocation under its row serialization boundary, release immutability, creator-review separation with explicit ADMIN override reason, atomic audit history, drawing-number freeze after the first Revision, public API/UI, and the required PostgreSQL/API/behavior evidence.

In scope: the `src/modules/part-revision/` module and its module rules; the narrow PartMaster application change required to share the PartMaster lock boundary and enforce drawing-number freeze; one forward-only Prisma migration; API routes; revisions UI; tests and the authoritative Slice 2B decision/model/architecture/testing records.

Out of scope: cancellation/deletion, CAD/BOM/material/routing blobs, generic workflow/approval engines, parallel/merged revisions, Equipment and all Slice 2C+ work, Supplier portal, Batch/PartInstance, Inspection, and any PRODUCT_SCOPE change.

Required acceptance: REV-DB-01 through REV-DB-20, retained PART-DB-01 through PART-DB-17 regression, full role/API security matrix, immutable review/audit evidence, deterministic real-PostgreSQL concurrency evidence, `db:validate`, `db:generate`, `check:full`, and `git diff --check`.
