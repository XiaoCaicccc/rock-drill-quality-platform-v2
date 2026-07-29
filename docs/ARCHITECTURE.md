# 架构原则

采用模块化单体，不采用微服务。平台底座与业务模块分离：平台模块包括 Identity and Session、Organization、Authorization、Audit、Numbering、QR Access、File Metadata、Import Infrastructure、Error Handling、Observability、Time；PLM 模块包括 Part Category、Part Master、Part Revision、Supplier Relation、Batch、Part Instance、Equipment、Equipment Position、Installation；质量模块包括 Inspection Template、Inspection Template Version、Inspection Task、Inspection Record、Inspection Result、Inspection Correction、Basic Nonconformance、Inspection Ledger、Analysis Report、Report Review、Report Snapshot。

依赖方向为：质量模块可依赖 PLM 和平台模块；PLM 模块可依赖平台模块；平台模块不得依赖业务模块；同层模块仅通过明确的应用接口和内部 ID 协作。禁止万能 Service、万能 Entity 与万能工作流引擎。

## 权限

权限命名采用“模块.业务动作”，例如 `part_revision.submit_review`、`part_revision.approve`、`part_revision.release`、`inspection_task.execute`、`inspection_record.correct`、`report.publish`、`audit.view`。

最终权限由用户身份、功能权限、组织、Data Scope、对象归属、对象状态和创建人与审核人隔离共同决定。Data Scope 至少支持 `ALL`、`ORG_SUBTREE`、`ORG_UNIT`、`ASSIGNED`、`OWN_CREATED`、`NONE`。权限必须在服务端校验；前端隐藏按钮不能替代授权。审核与关键业务写入须与审计在同一事务提交。

## Session

使用数据库可撤销 Session。每个账号最多三条有效设备 Session；第四台设备登录时必须先撤销一台已有设备。后端必须通过事务保证设备上限，不能只依赖前端计数。

## 时间、编号与二维码

企业业务时区固定为 `Asia/Shanghai`，业务日期、精确时间和有效区间须分别表达。编号与内部 ID 分离。二维码仅是统一对象入口，不保存第二份业务数据；第一阶段二维码内容必须登录后才能访问。

## Excel 导入

Excel 导入必须经过上传、解析、映射、预览、校验、确认、事务写入和导入记录。服务端解析结果是唯一权威结果；前端只负责上传、映射、预览和确认，不允许前端与服务端使用两套可能产生不同结果的业务解析逻辑。导入必须保存原文件、字段映射、逐行结果和导入记录。

## AI 开发护栏

根 `AGENTS.md` 负责仓库级规则。将来创建核心业务模块时，每个模块应创建简短的局部 `AGENTS.md`，仅描述模块职责、Always、Ask First、Never、依赖边界和验证命令；不得把 `AGENTS.md` 变成开发历史文档。

已确认的工程技术基线为 Node.js 24 LTS、npm、当前稳定版 Next.js、App Router、TypeScript strict、`src/` 目录、ESLint、Tailwind CSS、`@/*` 导入别名、单应用仓库和模块化单体。业务服务默认使用 Node.js Runtime；第一阶段不建立 Monorepo，也不启用 React Compiler。

PostgreSQL、Prisma 的具体版本与配置、可撤销数据库 Session、S3 兼容对象存储、认证框架、Excel 库、部署平台、UI 组件库和后台任务系统仍是候选或后续决策；本任务不实现、不安装。
