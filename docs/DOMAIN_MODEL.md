# 领域模型原则

本阶段冻结领域原则；Slice 1A 已建立 Organization 与 OrgUnit。

## 组织层级

- Organization 与 OrgUnit 以 UUID 作为不可变内部 ID，业务 code 可变且不得作为跨模块外键。
- OrgUnit 使用 `parentId` adjacency list；数据库限制每 Organization 最多一个根，原子创建用例保证一个根。
- 状态为 ACTIVE / INACTIVE；inactive parent 不得接收或重新激活 child，active descendant 阻止 ancestor 停用。
- 根节点不得移动，禁止 self-parent、cross-organization parent 与 hierarchy cycle；Organization 停用后禁止创建或移动 OrgUnit。

## 身份与外部标识

- 所有核心对象使用不可变内部 ID；内部 ID 与业务编号严格分离，模块关联仅使用内部 ID。
- `ExternalIdentifier` 用于未来关联供应商条码、原始流水号、旧系统编号和第三方系统 ID。外部标识只能解析到内部 ID，不能成为模块间主关联。
- 二维码须区分不可变内部 ID、业务编号、外部标识和可撤销二维码访问 Token。二维码只保存对象引用，不复制业务数据。

## Slice 2A Part master foundation

- `PartCategory` 是 organization-scoped flat category，只有 `ACTIVE` / `INACTIVE`；2A 不建立 `parentId`、category tree、move、cycle prevention 或 ancestor traversal。`name` 保存 trim 后的用户展示大小写，`normalizedName` 为 trim + lowercase，并在同一 Organization 内唯一。
- `PartMaster.id` 是不可变内部 UUID；`partNumber` 是由 platform Numbering 自动生成、organization-scoped unique、创建后 immutable 的业务编号，格式为 `PART-` + minimum width 6。`drawingNumber` 是可选真实图号，展示值仅 trim，`normalizedDrawingNumber` 为 trim + uppercase；图号在同一 Organization 内唯一，NULL 可重复。
- PartMaster 通过 `(categoryId, organizationId)` composite FK 关联同 Organization 的 PartCategory；不得使用 `partNumber` 或 `drawingNumber` 作为 FK。PartMaster 为 Organization-level enterprise master data，Category/PartMaster 不提供 delete，停用不级联或破坏既有关系。
- Category status 只阻止新建或重新指派到 INACTIVE Category；已有关系保留。PartMaster status 与 Category status 独立，均允许 ACTIVE ↔ INACTIVE。无业务值变化的 mutation 返回当前 resource 且不写 Audit。
- Slice 2B 引入 PartRevision 后，必须重新审查已有 Revision 的 PartMaster 是否仍允许任意修改 `drawingNumber`；2A 不实现 Revision existence check、released revision lock 或 revision lifecycle。

## Slice 2B Part revision lifecycle

- `PartRevision.id` is the immutable cross-module UUID. `revisionNo` is only a PartMaster-scoped integer sequence, starts at 1, and is never a foreign key or enterprise code. Every Revision and Review carries `organizationId` and uses composite database foreign keys to preserve the Organization boundary.
- A PartMaster has at most one non-`RELEASED` Revision. Legal transitions are only `DRAFT -> REVIEWING`, `RETURNED -> REVIEWING`, `REVIEWING -> RETURNED`, `REVIEWING -> APPROVED`, and `APPROVED -> RELEASED`; all other transitions conflict. Only `DRAFT` and `RETURNED` may change `changeSummary`; no-op PATCH is not an Audit event.
- `PartRevisionReview` is an append-only decision record for RETURN/APPROVE. The creator cannot ordinarily review their own Revision; an ADMIN must make an explicit override with a non-empty reason, which becomes visible Review/Audit history. Review and release remain separate steps.
- `RELEASED` is permanently immutable. PartMaster must be ACTIVE for create and forward lifecycle transitions. Once any Revision exists, `drawingNumber` is frozen; PartMaster name, description and category retain their Slice 2A semantics.

### Slice 1B Account / Session

- 正式身份实体为 `Account`，不创建第二套 `User` 身份对象。Account 必须属于一个 Organization，并有一个属于同一 Organization 的 primary OrgUnit。
- Account username 输入先 trim、再 lowercase；`normalizedUsername` globally unique。状态为 `ACTIVE`、`INACTIVE`、`LOCKED`；Slice 1B 不实现自动失败次数锁定。
- 密码使用 Argon2id（memory 19456 KiB、passes 2、parallelism 1、16-byte salt、32-byte tag），且仅通过 infrastructure `PasswordHasher` 能力使用。密码和 passwordHash 不属于公共 DTO。
- Session 使用 UUID、Account 外键、唯一 tokenHash、createdAt / expiresAt / revokedAt 与有界 user-agent。原始 token 为 32 个密码学安全随机字节的 base64url 表示，只在创建响应中短暂使用；数据库只保存 SHA-256 tokenHash。
- Session 为七天 absolute expiration、无 sliding expiration；每个 Account 最多三条 active Session。Account 停用或锁定必须原子地永久撤销现有 Session；重新激活不复活旧 Session。Organization 或 primary OrgUnit 停用在 validation 时动态使 Session 无效。

### Slice 1C Role / Permission / Data Scope

- Role 固定为 `ADMIN`、`QUALITY_MANAGER`、`INSPECTOR`、`ENGINEER`、`VIEWER`。一个 Account 可有多个 Role，同一 Role 可在多个 OrgUnit scope 上分配；授权采用 additive union，不存在 deny override、优先级或角色层级。
- `AccountRoleAssignment` 是当前授权关系，包含 Account、Organization、固定 Role、required `scopeOrgUnitId` 与创建时间。Account、Assignment 与 scope OrgUnit 必须属于同一 Organization；完全相同的 Account + Role + scope OrgUnit 只能存在一条。
- `Account.primaryOrgUnitId` 表达组织身份，`AccountRoleAssignment.scopeOrgUnitId` 表达授权 anchor；两者不得互相推断或自动同步。
- Permission 是代码声明的稳定 `module.business_action` contract，不建设 Permission 主数据表或全业务矩阵。一个 Role 对一个 Permission 可有多个不同 Data Scope grant，但完全重复的 Role + Data Scope 无效。
- Data Scope 固定为 `ALL`、`ORG_SUBTREE`、`ORG_UNIT`、`ASSIGNED`、`OWN_CREATED`、`NONE`。所有范围先受 actor 与 target 同 Organization 限制；所需 target fact 缺失必须 fail closed。
- `ADMIN` 对任意有效 Permission 在本 Organization 内自动具有 `ALL`，但不能跨 Organization，也不能绕过 `CREATOR_REVIEW` 或未来业务状态机。
- 每次授权都读取当前已提交 Role Assignment，不在 Session 或 RequestContext 中保存 Role、Permission 或 Data Scope 快照。撤销提交后新的授权检查立即失效；已完成授权判断的 in-flight Use Case 不被追溯取消。

### Slice 1D Access closure / Audit

- Account username 创建后不可变，Account 可以没有 Role Assignment；停用使用 `INACTIVE`，不删除历史身份。
- 有效 Admin Account 必须同时满足 Organization、Account 与 primary OrgUnit 均为 `ACTIVE` 且至少有一个 `ADMIN` assignment；同一 Account 的多个 ADMIN assignments 只计一次。
- 自助改密保留当前 Session 并撤销其余 active Sessions；管理员重置他人密码撤销目标全部 active Sessions，不改变目标 Account status。
- `AuditLog` 属于一个 Organization；USER actor 必须同时保存 same-Organization actor Account 与历史 session UUID snapshot，SYSTEM actor 的 Account/Session 字段必须为空。Audit 不依赖 Session FK，历史不会阻止 Session retention。
- Audit 只记录成功提交的业务事实；Account、Role Assignment、password 与 bootstrap mutation 必须和对应 AuditLog 在同一事务内提交或回滚。

## 生命周期与追溯

- `PartMaster` 与 `PartRevision` 分离；已发布版本不得覆盖修改。
- `Batch` 与 `PartInstance` 分离，追踪模式支持 `NONE`、`BATCH`、`SERIALIZED`。
- `InspectionTemplate` 与 `InspectionTemplateVersion` 分离。第一阶段模板项目类型为 `NUMBER`、`TEXT`、`OPTION`、`BOOLEAN`、`ATTACHMENT`、`INSTRUCTION`。
- 检测任务创建时必须固定零件版本、模板版本、参数定义、参数顺序、数据类型、单位、标准上下限、判定规则和来源对象。后续模板或零件版本变化不能改变已有任务。
- 分析报告与正式发布快照分离；已发布快照不可变。
- 设备装配关系保留有效区间历史，装配区间不得重叠。

核心生命周期必须有明确状态机。审核与发布是两个独立步骤；创建人原则上不得审核自己创建的内容。已提交或已确认的检测结果不得静默覆盖；修正必须保留原值、新值、修改原因、申请人、批准人和修改时间。历史检测、装配、版本和报告不得被静默覆盖。
