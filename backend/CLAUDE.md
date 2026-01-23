# Backend 模块 - AI 上下文文档

> **最后更新**: 2026-01-23
> **模块状态**: 🟡 开发中（约 70% 完成）
> **技术栈**: NestJS 10 + TypeORM 0.3 + SQLite + PostgreSQL

---

## 📋 模块概述

Backend 模块是数据周报自动化系统的后端服务，负责周报生成、数据聚合、API 提供等核心业务逻辑。

**核心职责**：

- 🔄 **周报生成**：整合 Jira、PostgreSQL 数据源，生成周报快照
- 📊 **数据聚合**：并发拉取多源数据，统一转换与存储
- 🔌 **API 服务**：提供 RESTful API 供前端调用
- 🗄️ **数据持久化**：基于 SQLite 的本地数据存储
- 🆔 **ID 生成**：基于 Snowflake 算法的分布式 ID 生成

---

## 🏗️ 模块结构

```
backend/
├── src/
│   ├── main.ts                          # 应用入口
│   ├── app.module.ts                    # 根模块
│   ├── common/                          # 公共模块
│   │   ├── entities/
│   │   │   └── base-id.entity.ts        # 基础 ID 实体
│   │   ├── interceptors/
│   │   │   └── bigint-to-string.interceptor.ts  # BIGINT 序列化拦截器
│   │   └── utils/
│   │       └── snowflake.ts             # Snowflake ID 工具
│   ├── config/                          # 配置管理
│   │   ├── config.loader.ts             # 配置加载器
│   │   ├── config.module.ts             # 配置模块
│   │   ├── config.schema.ts             # 配置 Schema（Zod）
│   │   ├── config.types.ts              # 配置类型定义
│   │   └── typeorm.config.ts            # TypeORM 配置
│   ├── entities/                        # 数据模型
│   │   ├── report.entity.ts             # 报告主表
│   │   ├── system-metric.entity.ts      # 系统指标表
│   │   ├── report-item.entity.ts        # 报表条目表
│   │   └── meeting-note.entity.ts       # 会议待办表
│   ├── migrations/                      # 数据库迁移
│   │   └── 1736931600000-InitDatabase.ts
│   └── modules/                         # 业务模块
│       ├── generate/                    # 周报生成模块
│       │   ├── adapters/
│       │   │   ├── jira.adapter.ts      # Jira 数据适配器
│       │   │   └── sql.adapter.ts       # SQL 数据适配器
│       │   ├── dto/
│       │   │   └── generate.dto.ts      # 生成 DTO
│       │   ├── types/
│       │   │   ├── jira.types.ts        # Jira 类型定义
│       │   │   └── sql.types.ts         # SQL 类型定义
│       │   ├── generate.controller.ts   # 生成控制器
│       │   ├── generate.module.ts       # 生成模块
│       │   └── generate.service.ts      # 生成服务
│       ├── reports/                     # 历史查询模块
│       │   ├── dto/
│       │   │   └── reports.dto.ts
│       │   ├── reports.controller.ts
│       │   ├── reports.module.ts
│       │   └── reports.service.ts
│       ├── items/                       # 条目编辑模块
│       │   ├── dto/
│       │   │   └── items.dto.ts
│       │   ├── items.controller.ts
│       │   ├── items.module.ts
│       │   └── items.service.ts
│       ├── notes/                       # 会议待办模块
│       │   ├── dto/
│       │   │   └── notes.dto.ts
│       │   ├── notes.controller.ts
│       │   ├── notes.module.ts
│       │   └── notes.service.ts
│       ├── export/                      # Excel 导出模块
│       │   ├── export.controller.ts
│       │   ├── export.module.ts
│       │   └── export.service.ts
│       └── id/                          # ID 生成模块
│           ├── id.module.ts
│           └── id.service.ts
├── config/
│   └── app.yaml.example                 # 配置文件示例
├── data/                                # 数据目录
│   └── weekly-report.sqlite             # SQLite 数据库
├── ormconfig.ts                         # TypeORM CLI 配置
├── run-migrations.js                    # Migration 运行脚本
├── package.json
├── tsconfig.json
└── nest-cli.json
```

---

## 📦 核心模块详解

### 1. Generate 模块（周报生成）

**路径**: `src/modules/generate/`

**职责**：

- 计算周期范围（周一至周日）
- 并发拉取 Jira 任务与 PostgreSQL 指标
- 数据转换与标准化
- 事务性写入 4 张表（reports、system_metrics、report_items、meeting_notes）

**关键文件**：

- `generate.service.ts:43-200` - 核心生成逻辑
- `adapters/jira.adapter.ts` - Jira API 调用与数据映射
- `adapters/sql.adapter.ts` - PostgreSQL 查询与指标提取

**API 端点**：

- `POST /api/generate` - 生成新周报
- `GET /api/generate/health` - 健康检查

**数据流**：

```
GenerateService.generateReport()
  ├─> 计算周期 (calculateWeekRange, calculateWeekNumber)
  ├─> 并发拉取数据
  │   ├─> JiraAdapter.fetchDoneTasks()
  │   ├─> JiraAdapter.fetchPlanTasks()
  │   ├─> SqlAdapter.fetchBrvMetrics()
  │   └─> SqlAdapter.fetchRevMetrics()
  ├─> 数据转换与映射
  └─> 事务写入数据库
      ├─> ReportEntity (主表)
      ├─> SystemMetricEntity[] (指标)
      ├─> ReportItemEntity[] (条目)
      └─> MeetingNoteEntity (待办)
```

### 2. Reports 模块（历史查询）

**路径**: `src/modules/reports/`

**职责**：

- 查询历史周报列表
- 获取指定周报详情
- 软删除周报

**API 端点**：
- `GET /api/reports` - 获取历史周报列表
- `GET /api/reports/:id` - 获取指定周报详情
- `DELETE /api/reports/:id` - 软删除周报

### 3. Items 模块（条目编辑）

**路径**: `src/modules/items/`

**职责**：

- 更新单行条目内容
- 批量更新自采数据（树形结构）
- 新增/删除条目

**API 端点**：
- `PATCH /api/items/:id` - 更新单行条目
- `PUT /api/reports/:id/manual-items` - 全量更新自采数据

### 4. Notes 模块（会议待办）

**路径**: `src/modules/notes/`

**职责**：

- 更新会议待办内容
- 关联周报 ID

**API 端点**：
- `PATCH /api/notes/:report_id` - 更新会议待办

### 5. Export 模块（Excel 导出）

**路径**: `src/modules/export/`

**职责**：

- 基于周报数据生成 Excel 文件
- 4 个 Sheet 页（本周完成、自采数据、后续计划、维度说明）
- 树形数据格式化（缩进 + 样式）

**API 端点**：
- `GET /api/reports/:id/export` - 导出 Excel

**状态**: ⚠️ 未完成

### 6. ID 模块（ID 生成）

**路径**: `src/modules/id/`

**职责**：

- 基于 Snowflake 算法生成 64 位分布式 ID
- 全局单例服务
- 确保 ID 唯一性与有序性

**关键方法**：

- `IdService.nextId()` - 生成新 ID（返回 String）

---

## 🗄️ 数据模型

### 1. ReportEntity（报告主表）

**文件**: `src/entities/report.entity.ts`

**字段**：

- `id` (BIGINT) - 主键，Snowflake ID
- `weekRange` (VARCHAR) - 周周期描述，如 "2026/01/12-2026/01/18"
- `weekNumber` (INT) - 年度周数，如第 3 周
- `createdAt` (DATETIME) - 生成时间
- `isDeleted` (BOOLEAN) - 软删除标记

**索引**：

- `idx_reports_is_deleted_created_at` - 软删除 + 时间排序

### 2. SystemMetricEntity（系统指标表）

**文件**: `src/entities/system-metric.entity.ts`

**字段**：

- `id` (BIGINT) - 主键
- `reportId` (BIGINT) - 关联报告 ID
- `metricKey` (VARCHAR) - 指标标识（TOTAL_COUNT、PROCESS_COUNT、MANUAL_COUNT、BRV_ETL、REV_ETL）
- `metricValue` (VARCHAR) - 显示值（数值或时间字符串）
- `statusCode` (VARCHAR) - 状态标识（loading、success、normal）

**索引**：

- `idx_system_metrics_report_id` - 报告 ID 索引
- `uniq_system_metrics_report_key` - 唯一约束（reportId + metricKey）

### 3. ReportItemEntity（报表条目表）

**文件**: `src/entities/report-item.entity.ts`

**字段**：

- `id` (BIGINT) - 主键
- `reportId` (BIGINT) - 关联报告 ID
- `tabType` (VARCHAR) - 标签类型（DONE、SELF、PLAN）
- `sourceType` (VARCHAR) - 数据来源（JIRA、SQL、MANUAL）
- `parentId` (BIGINT) - 父节点 ID（用于树形结构，根节点为 NULL）
- `contentJson` (TEXT) - 业务数据 JSON
- `sortOrder` (INT) - 排序权重

**索引**：

- `idx_report_items_report_tab` - 报告 ID + Tab 类型
- `idx_report_items_parent` - 父节点 ID
- `idx_report_items_sort` - 排序权重

### 4. MeetingNoteEntity（会议待办表）

**文件**: `src/entities/meeting-note.entity.ts`

**字段**：

- `id` (BIGINT) - 主键
- `reportId` (BIGINT) - 关联报告 ID
- `content` (TEXT) - 纯文本内容

**索引**：

- `idx_meeting_notes_report_id` - 报告 ID 索引

---

## ⚙️ 配置管理

### 配置文件结构

**文件**: `config/app.yaml`

```yaml
server:
  port: 3000
  corsOrigin: http://localhost:5173

database:
  path: ./data/weekly-report.sqlite

jira:
  baseUrl: https://your-jira-instance.atlassian.net
  email: your-email@example.com
  apiToken: your-api-token
  projectKey: YOUR_PROJECT

postgresql:
  host: localhost
  port: 5432
  username: postgres
  password: your-password
  database: your-database
```

### 配置加载流程

1. `config.loader.ts` - 读取 YAML 文件
2. `config.schema.ts` - Zod Schema 验证
3. `config.types.ts` - TypeScript 类型定义
4. `config.module.ts` - 注册为全局模块

---

## 🔧 开发指南

### 添加新的 API 端点

```bash
# 生成控制器
nest g controller modules/<模块名>

# 生成服务
nest g service modules/<模块名>

# 生成模块
nest g module modules/<模块名>
```

### 修改数据库结构

```bash
# 生成 Migration
npm run migration:generate -- -n <变更描述>

# 运行 Migration
npm run migration:run

# 回滚 Migration
npm run migration:revert
```

### 调试技巧

**启用 SQL 日志**：

```typescript
// typeorm.config.ts
logging: true,  // 启用 SQL 日志
```

**健康检查**：

```bash
curl http://localhost:3000/api/generate/health
```

**查看数据库**：

```bash
# 使用 SQLite 客户端
sqlite3 backend/data/weekly-report.sqlite
```

---

## 🚨 关键约束

1. **ID 生成**：所有主键必须通过 `IdService.nextId()` 生成
2. **BIGINT 序列化**：所有 ID 在 API 层自动转为 String（通过 `BigIntToStringInterceptor`）
3. **事务管理**：涉及多表写入必须使用 TypeORM 事务
4. **错误处理**：使用 NestJS 内置异常类（BadRequestException、NotFoundException 等）
5. **类型安全**：禁止使用 any，必须明确类型定义

---

## ⚠️ 已知问题

1. **WAL 模式配置**：需验证 SQLite WAL 模式是否生效
2. **Jira API 连接**：需真实凭证才能测试
3. **Excel 导出**：ExcelJS 集成未完成
4. **错误处理**：缺少全局错误过滤器

---

## 📚 参考资料

- [NestJS 官方文档](https://docs.nestjs.com/)
- [TypeORM 文档](https://typeorm.io/)
- [Snowflake ID 算法](https://en.wikipedia.org/wiki/Snowflake_ID)

---

**文档生成时间**: 2026-01-23
**文档版本**: V2.0
**维护者**: AI Assistant
