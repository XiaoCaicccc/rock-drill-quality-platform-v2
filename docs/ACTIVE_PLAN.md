# ACTIVE PLAN

## Status: ACTIVE

## Slice 1A — organization hierarchy and first business migration

### 目标

在 `src/platform/organization` 建立 Organization 与 OrgUnit 的单根、邻接表组织层级，并交付第一份正式 Prisma Migration、真实 PostgreSQL 17 集成测试及 CI Migration 验证。

### 数据模型与约束

- Organization 使用 UUID 内部主键和全局唯一业务 code；OrgUnit 使用 UUID、`organizationId` 与可空 `parentId` 邻接表关系。
- code 规范化为 `upper(trim(code))`，name 规范化为 `trim(name)`；数据库强制非空白、code 规范化、组织内 code 唯一、非负排序、自身非父节点和每组织最多一个根节点。
- 外键删除策略为 Restrict；不包含 tenant、账号、权限、审计、软删除或 JSON 字段。

### 应用用例

- 原子创建组织及唯一根节点；创建子节点、重命名、移动、组织单元状态变更和组织状态变更。
- 返回稳定 DTO；不公开 Prisma Model 或让调用方指定内部 UUID。

### 事务与并发策略

- 创建、移动与状态变更在交互式 Prisma 事务内执行。
- 同一 Organization 的层级写入使用参数化 PostgreSQL transaction-scoped advisory lock 串行化；锁后重新读取层级以完成父节点、后代和循环判断。

### Migration 策略

- 仅创建前向的 `organization_foundation` Prisma Migration；以 PostgreSQL 约束和 partial unique index 补足 Prisma schema 无法表达的约束。
- CI 先部署 Migration 到隔离的 PostgreSQL 17，再运行完整验证。

### 测试编号

- ORG-01～ORG-04：领域输入规范化。
- application behavior tests：稳定错误、root move、self-parent、active descendants、inactive parent activation、公共入口边界。
- ORG-DB-01～ORG-DB-13：真实 PostgreSQL 验收，覆盖 Migration 对象、原子提交与回滚、稳定错误、约束、层级与状态不变量、组织状态竞态、清理和真实并发。

### 非目标

- Account、Session、Role、Permission、Data Scope、API、UI、审计业务表及任何 PLM 或质量业务。

### 验收命令

- `npm run db:validate`
- `npm run db:generate`
- `npm run db:migrate:test`
- `npm run check:full`
