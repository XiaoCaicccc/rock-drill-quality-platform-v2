# 决策日志

所有记录日期：2026-07-29。

| ID | 状态 | 决策 | 原因 | 影响 | 被否决方案 | 日期 |
| --- | --- | --- | --- | --- | --- | --- |
| D-001 | 已确认 | 使用模块化单体 | 在保持边界的同时降低早期运维复杂度 | 模块须保持单向依赖 | 微服务 | 2026-07-29 |
| D-002 | 已确认 | 单企业、多组织单元 | 匹配当前客户边界 | 不建设多租户隔离 | 多租户 SaaS | 2026-07-29 |
| D-003 | 已确认 | 内部 ID 与业务编号分离 | 保障稳定引用与可变业务编号 | 关联只使用内部 ID | 用业务编号作为主关联 | 2026-07-29 |
| D-004 | 已确认 | 创建人与审核人隔离；管理员紧急越权须留痕 | 创建人原则上不能审核自己创建的零件版本、模板和报告；紧急情形仍须可审计 | 管理员仅可紧急越权，必须填写原因并与业务变更一起写入审计 | 创建人自审、无原因越权 | 2026-07-29 |
| D-005 | 已确认 | 审核与发布分开 | 区分质量确认与正式生效 | 生命周期有两个明确步骤 | 单一步骤发布 | 2026-07-29 |
| D-006 | 已确认 | 企业时区为 Asia/Shanghai | 统一业务日期边界 | 时间规则按该时区验证 | 使用服务器本地时区 | 2026-07-29 |
| D-007 | 已确认 | 第一阶段二维码必须登录 | 防止对象信息匿名暴露 | QR Access 接入身份与授权 | 匿名二维码访问 | 2026-07-29 |
| D-008 | 已确认 | V2 独立于 V1 建设 | 避免历史实现约束新模型 | V1 仅用于需求验证 | 复制或迁移 V1 代码 | 2026-07-29 |
| D-009 | 已确认 | 精简 docs + Git/PR/CI 保存过程证据 | 维持可追溯且低负担的治理 | 文档和交付纪律须同步 | 额外阶段性文档体系 | 2026-07-29 |
| D-010 | 已确认 | 正常使用开源依赖但不复制第三方业务系统实现 | 许可证允许时可使用开源框架、库和依赖，同时保持独立业务实现 | 仅可吸收设计思想；禁止复制 Carbon、InvenTree、Cascadia PLM、ERPNext、Part-DB 等第三方业务系统源码或受许可证约束实现 | 复制第三方业务系统代码 | 2026-07-29 |
| D-011 | 已确认 | 数据库可撤销 Session，每账号最多三台有效设备 | 使设备登录可管理且可强制撤销 | 上限须由后端事务保证 | 不可撤销 Session、仅前端计数 | 2026-07-29 |
| D-012 | 已确认 | 检测任务保存版本和判定规则快照 | 保证任务与历史判定可复现 | 后续版本变化不得改变已有任务 | 运行时读取最新模板或零件版本 | 2026-07-29 |
| D-013 | 已确认 | 服务端 Excel 解析结果为唯一权威结果 | 避免前后端解析产生不同业务结论 | 保存服务端逐行结果和导入记录 | 前后端双重业务解析 | 2026-07-29 |
| D-014 | 已确认 | 根 AGENTS.md 与未来模块级 AGENTS.md 构成 Codex 开发护栏 | 同时保持仓库规则统一和模块边界清晰 | 局部规则须服从根规则且保持简短 | 仅靠根规则、以开发历史填充 AGENTS.md | 2026-07-29 |
| D-015 | 已确认 | 使用 Node.js 24 LTS 与 npm | 使用受支持的 LTS 运行时和唯一包管理器 | 提交 `package-lock.json`，并在 `package.json` 固定 `engines` 与 `packageManager` | Current 或 EOL Node、pnpm、yarn、Bun | 2026-07-29 |
| D-016 | 已确认 | 使用当前稳定版 Next.js App Router 工程基线 | 提供统一的 V2 Web 工程入口 | 使用 TypeScript strict、`src/`、ESLint、Tailwind CSS、`@/*` 别名；暂不启用 React Compiler | Pages Router、Biome、React Compiler | 2026-07-29 |
| D-017 | 已确认 | 第一阶段使用单应用仓库 | 在早期保持实现和部署边界清晰 | 在单一应用中维持模块化单体边界，出现真实独立部署需求后再评估拆分 | Monorepo、拆分独立前后端仓库 | 2026-07-29 |
| D-018 | 已确认 | 业务服务使用 Node.js Runtime | 未来的事务、文件和集成能力不适合 Edge 限制 | Prisma、认证、Excel、文件和事务逻辑不得部署到 Edge；未来 Middleware/Proxy 仅可承担轻量跳转或无数据库判断，最终权限判断仍在服务端 Use Case 执行 | Edge Runtime 业务服务 | 2026-07-29 |
| D-019 | 已确认 | 使用稳定、机器可读的统一错误契约 | 使调用方可依赖错误代码而不暴露内部细节 | 公共响应包含 code、message、requestId 与可选 details；未知错误统一隐藏；框架 Adapter 负责实际 HTTP 转换，平台模块不依赖 NextResponse | 以 UI 文案作为错误代码、直接暴露原始异常 | 2026-07-30 |
| D-020 | 已确认 | 分离 BusinessDate、Instant 与 Clock | 避免日期、时间点和运行时当前时间混用 | 企业时区固定为 Asia/Shanghai；Instant 规范化为 UTC；有效区间保持 [from, to)；Use Case 通过 Clock 获取当前时间，不依赖运行环境本地时区 | 服务器本地时区、散落的 Date.now() | 2026-07-30 |
| D-021 | 已确认 | 显式传递 RequestContext | 保持请求元数据可追踪并避免全局可变状态 | Context 包含 requestId、receivedAt、businessTimeZone 与 actor；不保存密码、Token、Cookie、角色或权限快照；Transport Adapter、Use Case 与审计未来共享同一 Context | 全局请求上下文、权限快照 | 2026-07-30 |
| D-022 | 已确认 | 使用 Vitest 作为纯 TypeScript 单元测试基线 | 为领域规则和平台纯函数提供快速、确定性的 Node 测试 | 测试文件为 *.test.ts；固定 Clock 和 RequestId factory 用于确定性测试；不自动引入浏览器测试工具；Mock 不能替代真实 PostgreSQL 行为证明 | Jest、浏览器环境测试作为默认基线 | 2026-07-30 |
| D-023 | 已确认 | V2 数据库基线采用 PostgreSQL 17 与 Prisma 6.19.3 | 为正式运行和真实事务验证建立明确、受支持且隔离的数据库基础 | 正式 Prisma schema 与 `getPrismaClient()` 只使用 `DATABASE_URL`；集成测试的 `createTestPrismaClient()` 只使用 `TEST_DATABASE_URL` 并通过 Prisma datasource 覆盖连接；两者不得回退或互用。开发环境复用 globalThis 中的正式 Client，测试 Client 不进入该单例。Migration 只能向前，生产只运行 `prisma migrate deploy`；当前没有业务 Model 或 Migration。连接信息不得写入已跟踪文件、日志或提交 | PostgreSQL 16 基线、混用运行与测试连接、以 Mock 代替真实 PostgreSQL 事务验证、生产使用 db push | 2026-08-02 |
| D-024 | 已确认 | 使用 GitHub Actions 作为当前 CI 基线，Vercel 仅作 Preview 平台 | 让代码质量和真实数据库测试与 Preview 部署职责分离 | GitHub Actions 使用 PostgreSQL 17 service container 运行真实数据库测试；`GET /api/health` 是不依赖数据库的 liveness endpoint；部署平台不属于业务架构且可替换 | 以 Preview 部署替代 CI、将健康检查与数据库就绪检查耦合 | 2026-08-03 |

## D-025 — V2 first-stage implementation roadmap and module ownership

状态：已确认（Accepted）
日期：2026-08-03

### Context

- 原有 Slice 0～5 是立项前的粗粒度草案；产品范围、组织、数据库 Session、权限、模板版本、Excel 导入、批次实物、任务快照、纠正、QR 和移动端要求已经细化。本决策发生在 Slice 0 工程底座完成之后。
- 继续依赖聊天记忆会造成模块归属和任务边界漂移。

### Decision

- 采用 `PRODUCT_SCOPE.md` 中的 Slice 0～8 实施顺序；实际完成状态和当前下一项只以 `CURRENT_STATE.md` 为唯一依据，`PRODUCT_SCOPE.md` 不负责维护动态完成状态。
- Organization 归属 `src/platform/organization`；`src/modules` 仅用于具体 PLM 和质量业务模块。
- 不强制通用 Repository；`ARCHITECTURE.md` 中的开源参考映射作为设计输入索引。
- 路线变更必须通过新的决策和权威文档修改，不以聊天内容直接覆盖。

### Consequences

- 后续 Codex 提示词必须引用对应 Slice；一个任务只能交付一个清晰目标，且不允许提前进入后续 Slice。
- 旧粗粒度路线仅保留为 Historical / superseded 背景，不再驱动开发；不新增 `ROADMAP.md`，避免文档职责重复。

## D-026 — Organization hierarchy concurrency control

状态：已确认（Accepted）
日期：2026-08-03

同一 Organization 上的 `createOrgUnit`、`moveOrgUnit`、`setOrgUnitStatus` 和 `setOrganizationStatus` 均在交互式 Prisma 事务内，按 Organization UUID 获取同一个 PostgreSQL transaction-scoped advisory lock。锁调用使用参数化 tagged SQL，且只保留在 organization 基础设施内部。

Organization 状态变化必须与 hierarchy writers 串行化：writer 在取得锁后重新读取 Organization，避免其在停用前读取到的 stale `ACTIVE` 状态被用于后续层级写入。同一 Organization 的层级规则判断和写入因此串行化，不同 Organization 保持并发，公开契约不泄漏 Prisma 或 raw SQL。`renameOrgUnit` 不属于 hierarchy/status writer，不获取该锁。

## D-027 — Account authentication and revocable Session semantics

状态：已确认（Accepted）
日期：2026-08-19

Slice 1B 使用单一 `Account` 身份实体，不同时建立 `User` 与 `Account`。Account 通过 required `organizationId` 与 `primaryOrgUnitId` 归属于同一 Organization，用户名以 trim + lowercase 得到 globally unique `normalizedUsername`，状态为 `ACTIVE`、`INACTIVE` 或 `LOCKED`。密码凭据使用 infrastructure 封装的 Argon2id，参数固定为 memory 19456 KiB、passes 2、parallelism 1、16-byte salt 与 32-byte tag。

Session 是数据库实体，保存 UUID、Account 外键、唯一 SHA-256 `tokenHash`、创建/绝对过期/撤销时间和有界 user-agent；raw token 由 32 个密码学安全随机字节生成后仅返回给 Cookie，不持久化。Session 绝对有效期为七天，不启用 sliding expiration；每个 Account 最多三条 active Session，登录创建与 Account 状态变更共享 Account row serialization boundary。Account 从 ACTIVE 变为 INACTIVE 或 LOCKED 时，在同一事务中永久撤销其现有 Session；重新激活不复活旧 Session。Organization 或 primary OrgUnit 停用通过每次 Session validation 动态使身份失效，不反向批量修改 Session。

Identity / Session 通过现有 RequestContext 的 `AuthenticatedActor` 表达身份；Authorization、角色、权限、Data Scope 与 Audit 保留给 Slice 1C / 1D。

## D-028 — Fixed roles, role assignments and policy-driven authorization

状态：已确认（Accepted）
日期：2026-08-19

Slice 1C 固定五种 Role：`ADMIN`、`QUALITY_MANAGER`、`INSPECTOR`、`ENGINEER`、`VIEWER`。`AccountRoleAssignment` 持久化 Account、Organization、Role、required `scopeOrgUnitId` 与创建时间；Account、Assignment、scope OrgUnit 必须属于同一 Organization，完全相同的 Account + Role + scope OrgUnit 由数据库唯一约束禁止。`Account.primaryOrgUnitId` 仅表达组织身份，不能替代或自动改变授权 scope。

Permission 使用代码声明的 `module.business_action` policy，不建立 Permission 主表、完整业务矩阵、custom Role/Permission、role hierarchy、priority 或 explicit DENY。多个 Role、Assignment 和 grant 采用 additive union。Data Scope 固定为 `ALL`、`ORG_SUBTREE`、`ORG_UNIT`、`ASSIGNED`、`OWN_CREATED`、`NONE`；所需 target fact 缺失时 fail closed。

`ADMIN` 对任意有效 Permission 自动获得本 Organization 内 `ALL`，但不能跨 Organization，不能绕过 `CREATOR_REVIEW`，也不绕过业务领域状态机。紧急越权必须等待 Slice 1D 的 reason + Audit + atomic audit semantics，不在 1C 提前实现。

Authorization 只接受最小 target facts，并通过 `RequestContext.actor.userId` 每次读取当前已提交 Role Assignment。Role、Permission 和 Data Scope 不进入 Session、RequestContext 或 JWT snapshot；不建立授权 cache。Role revoke 提交后只影响新的授权检查，已经完成授权判断的 in-flight Use Case 不追溯取消。

## D-029 — Access management, last-admin liveness and atomic Audit

状态：已确认（Accepted）
日期：2026-08-19

Slice 1D 的平台管理能力仅授予本 Organization 的 `ADMIN`；其他四个固定 Role 在本阶段不获得 Account、Role Assignment、Organization selector 或 Audit 管理 grant。Account 可以没有 Role Assignment，username 创建后不可变，历史 Account 不删除而以 `INACTIVE` 表达停用；`Account.primaryOrgUnitId` 仍只表达组织身份，不得自动改变 Role scope。

任何可能减少有效 Admin Account 数量的 Account 状态 mutation 或 ADMIN Role Assignment revoke，都在业务事务内先锁定 Organization row，再 fresh-read 并以 `COUNT(DISTINCT accountId)` 验证至少保留一个有效 Admin。该 row lock 只服务 access-admin liveness，不修改 D-026 的 hierarchy/status advisory-lock 语义。

自助改密保留当前 Session、撤销其他 active Sessions；管理员只能重置同 Organization 的其他 Account，重置后撤销目标全部 active Sessions且不改变 Account status。登录在 Argon2 验证后必须于 Account row lock 内比较 fresh passwordHash，关闭 reset/change 与旧密码登录的竞态。

Audit 使用 `USER` / `SYSTEM` actor，稳定 action/target machine codes 和递归 secret-key 拒绝。关键 Account、Role Assignment、password 与 bootstrap mutation 和 AuditLog insert 必须在同一 PostgreSQL transaction 提交；失败尝试不产生业务 Audit。`bootstrap-admin` 只用于系统尚无任何 ADMIN assignment 时的初始建权：fresh install 原子创建 Account、ADMIN assignment 与 SYSTEM Audit；已有 1B Account 时可明确晋升一个符合条件的 Account；一旦存在任意 ADMIN assignment 即永久冲突。Slice 1D 不实现 emergency business override。

## D-030 — Part master identity, classification and organization-scoped numbering

状态：已确认（Accepted）
日期：2026-08-21

Slice 2A 建立 flat `PartCategory`、`PartMaster` 与 platform Numbering foundation。所有对象继续使用不可变内部 UUID；`partNumber` 由 Numbering 按 `organizationId + key` 原子分配，格式为 `PART-`、minimum width 6，从 1 开始，创建后 immutable。编号分配是独立短事务，成功分配即永久消费，允许非 gapless，不回滚、不复用；Numbering 不反向依赖业务模块且不写 allocation ledger 或 AuditLog。

`PartCategory` 仅有 ACTIVE/INACTIVE，不实现层级；名称保存 trim 展示值并以 trim + lowercase 规范化，在 Organization 内唯一。`PartMaster` 的 `drawingNumber` 可选，展示值 trim、规范化值 trim + uppercase，在 Organization 内唯一且允许多个 NULL；`PartMaster(categoryId, organizationId)` 通过 composite FK 保证组织边界。Category 停用不级联 PartMaster，已有关系保留；PartMaster 与 Category 均不提供 delete；无业务值变化的 mutation 不写 Audit。

Slice 2A 的 PartMaster 是 Organization-level enterprise master data；ENGINEER 获得 Category/PartMaster 的 view/create/update/set_status，QUALITY_MANAGER、INSPECTOR、VIEWER 只读，ADMIN 继续沿用同 Organization automatic ALL。Data Scope 为 ALL 且始终受 actor.organizationId 边界限制。所有真正业务 mutation 与 AuditLog 在同一 PostgreSQL transaction 中提交；跨 Organization direct UUID 统一表现为 RESOURCE.NOT_FOUND。SupplierRelation deferred；Slice 2B 引入 PartRevision 后重新审查已有 Revision 对 `drawingNumber` 修改的约束。

## D-031 — Linear PartRevision lifecycle and drawing-number freeze

状态：已确认（Accepted）
日期：2026-08-22

Slice 2B establishes an organization-scoped PartRevision lifecycle with immutable UUID identity, PartMaster-scoped integer `revisionNo`, immutable Review history, and a strict single-unreleased chain. A PostgreSQL partial unique index is the final guard for one non-RELEASED Revision, while the PartMaster row lock is the common serialization boundary for revision allocation, lifecycle prerequisites, and drawing-number update versus first-Revision creation. The Slice-local PartRevision transaction composition adapter owns the cross-Aggregate Prisma transaction, PartMaster/Revision/Review persistence and transaction-bound Audit recording; PartRevision application/domain sees only narrow typed capabilities. It is not a global UnitOfWork and exposes neither arbitrary transaction/model/SQL execution nor Prisma types. PartMaster stays independent of PartRevision persistence; its row-locked update/status path relies on the PostgreSQL trigger as the final drawing-number freeze guard.

Only `DRAFT -> REVIEWING`, `RETURNED -> REVIEWING`, `REVIEWING -> RETURNED`, `REVIEWING -> APPROVED`, and `APPROVED -> RELEASED` are legal. Review and release are separate. The creator is denied ordinary RETURN/APPROVE; an ADMIN needs an explicit reasoned override that creates immutable Review and Audit evidence atomically. RELEASED is permanently immutable, and any Revision freezes PartMaster `drawingNumber`; other PartMaster fields retain Slice 2A semantics. No cancellation, delete, CAD/BOM/ECN/ECO, generic workflow/approval engine, or parallel Revision branch is introduced.
