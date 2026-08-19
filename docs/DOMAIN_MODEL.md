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

### Slice 1B Account / Session

- 正式身份实体为 `Account`，不创建第二套 `User` 身份对象。Account 必须属于一个 Organization，并有一个属于同一 Organization 的 primary OrgUnit。
- Account username 输入先 trim、再 lowercase；`normalizedUsername` globally unique。状态为 `ACTIVE`、`INACTIVE`、`LOCKED`；Slice 1B 不实现自动失败次数锁定。
- 密码使用 Argon2id（memory 19456 KiB、passes 2、parallelism 1、16-byte salt、32-byte tag），且仅通过 infrastructure `PasswordHasher` 能力使用。密码和 passwordHash 不属于公共 DTO。
- Session 使用 UUID、Account 外键、唯一 tokenHash、createdAt / expiresAt / revokedAt 与有界 user-agent。原始 token 为 32 个密码学安全随机字节的 base64url 表示，只在创建响应中短暂使用；数据库只保存 SHA-256 tokenHash。
- Session 为七天 absolute expiration、无 sliding expiration；每个 Account 最多三条 active Session。Account 停用或锁定必须原子地永久撤销现有 Session；重新激活不复活旧 Session。Organization 或 primary OrgUnit 停用在 validation 时动态使 Session 无效。

## 生命周期与追溯

- `PartMaster` 与 `PartRevision` 分离；已发布版本不得覆盖修改。
- `Batch` 与 `PartInstance` 分离，追踪模式支持 `NONE`、`BATCH`、`SERIALIZED`。
- `InspectionTemplate` 与 `InspectionTemplateVersion` 分离。第一阶段模板项目类型为 `NUMBER`、`TEXT`、`OPTION`、`BOOLEAN`、`ATTACHMENT`、`INSTRUCTION`。
- 检测任务创建时必须固定零件版本、模板版本、参数定义、参数顺序、数据类型、单位、标准上下限、判定规则和来源对象。后续模板或零件版本变化不能改变已有任务。
- 分析报告与正式发布快照分离；已发布快照不可变。
- 设备装配关系保留有效区间历史，装配区间不得重叠。

核心生命周期必须有明确状态机。审核与发布是两个独立步骤；创建人原则上不得审核自己创建的内容。已提交或已确认的检测结果不得静默覆盖；修正必须保留原值、新值、修改原因、申请人、批准人和修改时间。历史检测、装配、版本和报告不得被静默覆盖。
