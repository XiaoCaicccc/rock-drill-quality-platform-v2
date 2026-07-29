# 架构原则

采用模块化单体，不采用微服务。平台底座与业务模块分离：平台模块包括 Identity and Session、Organization、Authorization、Audit、Numbering、QR Access、File Metadata、Import Infrastructure、Error Handling、Observability、Time；PLM 模块包括 Part Category、Part Master、Part Revision、Supplier Relation、Batch、Part Instance、Equipment、Equipment Position、Installation；质量模块包括 Inspection Template、Inspection Template Version、Inspection Task、Inspection Record、Inspection Result、Inspection Correction、Basic Nonconformance、Inspection Ledger、Analysis Report、Report Review、Report Snapshot。

依赖方向为：质量模块可依赖 PLM 和平台模块；PLM 模块可依赖平台模块；平台模块不得依赖业务模块；同层模块仅通过明确的应用接口和内部 ID 协作。禁止万能 Service、万能 Entity 与万能工作流引擎。

权限必须在服务端结合用户身份、功能权限、组织、Data Scope、对象归属、对象状态和创建/审核隔离校验；前端隐藏按钮不能替代授权。审核与关键业务写入须与审计在同一事务提交。企业业务时区固定为 `Asia/Shanghai`，业务日期、精确时间和有效区间须分别表达。

编号与内部 ID 分离。二维码仅是统一对象入口，不保存第二份业务数据；第一阶段二维码内容必须登录后才能访问。Excel 导入必须经过上传、解析、映射、预览、校验、确认、事务写入和导入记录。

候选技术基线为 TypeScript、Next.js、PostgreSQL、Prisma Migration、可撤销数据库 Session、S3 兼容对象存储与服务端 Excel 解析；它们仅为候选，本任务不实现、不安装。
