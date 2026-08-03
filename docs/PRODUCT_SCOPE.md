# 产品范围

## 定位与用户

本产品是服务于单一制造企业、多组织单元的模块化 PLM 与质量数据平台。第一阶段用户包括质量人员、检验员、工艺/产品人员、设备相关人员和具备管理职责的审核人员。

第一阶段定义五种基础角色：`admin`、`quality_manager`、`inspector`、`engineer`、`viewer`。角色不是唯一授权依据，权限还须结合组织、功能权限、Data Scope、对象归属和对象状态。

## 第一阶段业务范围

用户与组织、功能权限、Data Scope、可撤销 Session、一个账号最多三台有效登录设备、用户自助修改密码、管理员重置密码、登录设备查看与撤销，以及操作审计。

零件类别、零件主数据、图号与零件版本、版本审核与发布、Excel 检测模板导入及模板版本、批次与实物流水号、设备与零件装配、检测任务、单零件现场检测、自动合格判断、复检和基础不合格处理、检测台账、分析报告、审核与发布、不可变快照、审计追溯，以及登录后的二维码对象访问。

黄金验收流程使用“大齿轮”：从零件及其已发布版本、检测模板版本，到批次或实物、检测任务、现场检测与判定、复检/基础不合格、台账与分析报告、审核发布及不可变快照，全程可追溯。

## 明确不做

第一阶段不实现完整 BOM、ECN/ECO、复杂工作流引擎、完整 CAPA、供应商门户、多租户 SaaS、原生移动 App、IoT 实时采集、完整 ERP 集成、低代码表单平台或 AI 自动业务决策。

## 成功标准

第一阶段应形成上述大齿轮质量闭环，具备基于身份、功能权限、组织、Data Scope、对象归属和状态的后端授权；关键历史可审计且不可静默覆盖；版本、检测与报告可追溯；二维码仅作受登录保护的统一对象入口。

# 第一阶段实施路线

本文件只定义 Slice 顺序与交付边界，是第一阶段唯一权威实施顺序；不在本路线中持续维护动态完成状态。Slice 实际完成状态和当前正在执行的工作，只以 `docs/CURRENT_STATE.md` 为唯一权威来源。每个具体 Codex 任务仍须有一个明确、可验证的目标。不得仅凭聊天内容改变路线；路线调整必须同步更新 `PRODUCT_SCOPE.md`、`ARCHITECTURE.md` 和 `DECISIONS.md`。旧的 Slice 0～5 粗粒度草案已被本路线取代（Historical / superseded）。

## Slice 0：工程控制与运行底座

### Slice 0A：项目控制基线

- 产品范围、架构与领域文档、决策体系、ACTIVE_PLAN、AGENTS、Git、Codex 和文档治理。

### Slice 0B-1：Web 工程骨架

- Next.js、TypeScript strict、Node.js runtime、npm、ESLint、Tailwind 和基础构建。

### Slice 0B-2：平台基础类型

- Error、Time、RequestContext 和 Vitest。

### Slice 0B-3：数据库基础

- PostgreSQL 17、Prisma 6.19.3、`DATABASE_URL` 与 `TEST_DATABASE_URL` 隔离、正式 Client 与测试 Client 分离、真实事务测试。

### Slice 0B-4：CI 与运行检查

- GitHub Actions、PostgreSQL 17 CI service、`/api/health`、Vercel Preview 和自动质量门。

## Slice 1：组织、身份、认证与授权

### Slice 1A：组织层级

- Organization、OrgUnit、单根组织树、启用与停用、移动与防循环、第一份业务 Migration。

### Slice 1B：账号、凭据与数据库 Session

- User / Account、密码凭据、账号启用/停用/锁定、数据库可撤销 Session、每账号最多三个有效设备 Session、登录、退出、Session 撤销和 bootstrap-admin CLI。

### Slice 1C：角色、权限与 Data Scope

- admin、quality_manager、inspector、engineer、viewer；模块.业务动作权限；ALL、ORG_SUBTREE、ORG_UNIT、ASSIGNED、OWN_CREATED、NONE；服务端统一授权入口；创建人与审核人隔离。

### Slice 1D：用户管理与访问闭环

- 登录页面、最小用户管理、组织与角色分配、停用用户立即失效、权限行为测试。
- 建立平台 Audit 基础；关键业务写入与审计记录必须原子提交；后续业务 Slice 复用统一审计能力。

## Slice 2：零件、版本与设备主数据

### Slice 2A：零件类别与零件主数据

- PartCategory、PartMaster、内部 UUID 与生成的业务编号严格分离、图号/零件编号/名称、基础查询与管理。
- 建立第一版平台 Numbering 能力，第一阶段先服务 PartMaster 业务编号；后续 Batch、InspectionTask、Report 等对象复用相同编号契约。
- SupplierRelation 仅在真实大齿轮业务材料确认需要时实现；不提前扩展为供应商门户。若真实材料不需要，该能力可以保持未实现，但不得从架构中静默删除。

### Slice 2B：零件版本生命周期

- PartRevision；draft、reviewing、returned、approved、released；审核与发布分离，历史版本不可覆盖。

### Slice 2C：设备与位置主数据

- Equipment、EquipmentPosition、编号与状态、删除保护、基础设备档案。

## Slice 3：检测模板与 Excel 导入

### Slice 3A：检测模板领域

- InspectionTemplate、InspectionTemplateVersion、模板项目顺序、NUMBER、TEXT、OPTION、BOOLEAN、ATTACHMENT、INSTRUCTION、单位/公差/判断规则、模板审核与发布。

### Slice 3B：Excel 导入基础设施

上传 → 服务端解析 → 字段映射 → 预览 → 校验 → 人工确认 → 事务写入 → 保存导入记录和逐行结果。包括服务端 Excel 解析、文件元数据、对象存储边界、导入错误报告；服务端结果为唯一权威结果。

### Slice 3C：大齿轮模板落地

- 真实大齿轮检测要求、数值/公差/技术说明、检测方式、模板来源和模板版本发布；不得伪造尚未由真实材料确认的固定项目数量。

## Slice 4：批次、实物与装配追溯

### Slice 4A：批次与实物身份

- Batch、PartInstance、trackingMode（NONE、BATCH、SERIALIZED）、流水号和内部身份。

### Slice 4B：设备装配

- Installation、PartRevision、Batch、PartInstance、EquipmentPosition、有效时间区间、防重叠；装配和拆卸历史不可覆盖。

### Slice 4C：外部标识

- ExternalIdentifier、供应商条码、旧系统编号、外部系统 ID；外部标识不得作为内部跨模块引用。

## Slice 5：检测任务与现场执行

### Slice 5A：检测任务与快照

任务创建时冻结 PartRevision、InspectionTemplateVersion、参数定义、顺序、类型、单位、上下限、判断规则和来源。

### Slice 5B：现场检测录入

- 单零件检测、手机和平板交互、参数逐项录入、自动合格判断、原子写入、检测员和 RequestContext；失败不得留下半份记录。

### Slice 5C：复检与任务完成

- 复检、结果替代关系、任务完成、不覆盖原检测事实、基础异常入口。

## Slice 6：质量台账、纠正与不合格

### Slice 6A：检测台账

统一筛选零件、图号、版本、设备、批次、流水号、检测日期、合格状态、检测员、组织与 Data Scope。

### Slice 6B：检测纠正

保留原始值、新值、原因、申请人、审批人、时间和关联检测记录；禁止静默覆盖。

### Slice 6C：基础不合格

- BasicNonconformance、来源检测、基本状态、复检关联、处理说明和审计；完整 NCR / CAPA 不进入第一阶段。

## Slice 7：报告、发布快照与二维码

### Slice 7A：分析报告

- 报告来源、零件版本、检测范围、分析内容和结论。

### Slice 7B：报告审核与发布

状态为 draft → reviewing → returned → approved → published。要求创建人与审核人隔离、并发冲突处理、发布与 Snapshot 原子提交、已发布报告不可修改、审计与业务同事务。

### Slice 7C：QR 与标签

- 可撤销 opaque token、不暴露数据库 ID、第一阶段登录后访问、对象统一入口、基础标签打印。

## Slice 8：分析、体验与黄金流程验收

### Slice 8A：Dashboard 与指标

- Shared Filter Contract、合格率唯一口径、时间范围一致、Data Scope 一致、基础趋势和分布、页面与导出范围一致。

### Slice 8B：移动端、搜索与整体 UX

- 手机现场检测、响应式工作台、对象搜索、QR 跳转、错误提示、空状态、加载状态。

### Slice 8C：大齿轮完整验收

完整走通：组织与用户 → 零件建档 → 版本发布 → Excel 模板导入 → 批次与实物 → 设备装配 → 检测任务 → 现场检测 → 自动判断 → 复检或基础不合格 → 台账 → 报告 → 审核发布 → 不可变快照 → QR 追溯。

- 最小 E2E、脱敏演示数据 CLI、备份恢复验证、基础日志和监控、演示流程。
