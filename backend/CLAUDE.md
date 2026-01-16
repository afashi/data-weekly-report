[根目录](../CLAUDE.md) > **backend**

---

# Backend 模块文档

> **模块路径**: `backend/`
> **职责**: 后端服务 - 周报生成、数据聚合、API 提供
> **技术栈**: NestJS 10.x + TypeORM 0.3.x + SQLite + PostgreSQL
> **状态**: 🟡 70% 完成

---

## 变更记录 (Changelog)

### 2026-01-16
- 初始化模块文档
- 完成基础架构搭建（ConfigModule、IdModule、GenerateModule）
- 完成数据库 Migration（4 张表）
- 完成 Jira 和 SQL 适配器

---

## 模块职责

Backend 模块是数据周报自动化系统的核心服务层，负责：

1. **数据聚合**：从 Jira 和 PostgreSQL 拉取数据并标准化
2. **周报生成**：计算周期、整合数据、事务写入数据库
3. **API 提供**：为前端提供 RESTful API
4. **ID 生成**：基于 Snowflake 算法生成全局唯一 ID
5. **配置管理**：外部 YAML 配置文件加载与校验

---

## 入口与启动

### 主入口文件
- **文件**: `src/main.ts`
- **端口**: 3000（可通过配置文件修改）
- **全局配置**:
  - 验证管道（ValidationPipe）：自动校验请求参数
  - BIGINT 序列化拦截器：ID 自动转为 String
  - CORS：允许前端跨域请求
  - 全局路由前缀：`/api`

### 启动命令
```bash
# 开发模式（热重载）
npm run start:dev

# 生产模式
npm run build
npm run start:prod

# 调试模式
npm run start:debug
```

### 健康检查
访问 `http://localhost:3000/api/generate/health` 验证所有依赖服务状态。

---

## 对外接口

### 1. 生成周报
- **端点**: `POST /api/generate`
- **请求体**:
  ```json
  {
    "weekRange": "2026/01/12-2026/01/18",  // 可选
    "weekNumber": 3                         // 可选
  }
  ```
- **响应**:
  ```json
  {
    "id": "1234567890123456789",
    "weekRange": "2026/01/12-2026/01/18",
    "weekNumber": 3,
    "createdAt": "2026-01-16T10:30:00.000Z",
    "metrics": [...],
    "items": [...],
    "notes": ""
  }
  ```
- **说明**: 如果不传参数，自动计算当前周的周期

### 2. 健康检查
- **端点**: `GET /api/generate/health`
- **响应**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-01-16T10:30:00.000Z",
    "services": {
      "jira": true,
      "sql": {
        "brv_db": true,
        "rev_db": true
      },
      "database": true
    }
  }
  ```

### 待实现接口
- `GET /api/reports` - 获取历史周报列表
- `GET /api/reports/:id` - 获取指定周报详情
- `PATCH /api/items/:id` - 更新单行条目
- `PUT /api/reports/:id/manual-items` - 全量更新自采数据
- `PATCH /api/notes/:report_id` - 更新会议待办
- `GET /api/reports/:id/export` - 导出 Excel
- `DELETE /api/reports/:id` - 软删除周报

---

## 关键依赖与配置

### 核心依赖
```json
{
  "@nestjs/common": "^10.3.0",
  "@nestjs/typeorm": "^10.0.1",
  "typeorm": "^0.3.1",
  "axios": "^1.6.5",
  "pg": "^8.11.3",
  "sqlite3": "^5.1.7",
  "nodejs-snowflake": "^2.0.1",
  "exceljs": "^4.4.0",
  "date-fns": "^3.2.0",
  "zod": "^3.22.4"
}
```

### 配置文件结构
**文件**: `config/app.yaml`（需从 `app.yaml.example` 复制）

```yaml
server:
  port: 3000
  corsOrigin: "http://localhost:5173"

database:
  path: "data/weekly-report.sqlite"

id:
  workerId: 1
  datacenterId: 1

jira:
  baseUrl: "https://your-domain.atlassian.net"
  email: "your-email@example.com"
  apiToken: "YOUR_JIRA_API_TOKEN"
  jql:
    done: "project = DATADEV AND status = Done AND updated >= startOfWeek()"
    plan: "project = DATADEV AND status in (Open, \"In Progress\")"
  fields:
    - "summary"
    - "status"
    - "assignee"
    - "customfield_10016"

externalDatabases:
  - name: "brv_db"
    type: "postgres"
    host: "192.168.0.51"
    port: 5432
    database: "tjfj"
    username: "readonly_user"
    password: "YOUR_PASSWORD"
    connectTimeoutMs: 5000
    queryTimeoutMs: 15000
    ssl: false

sqlQueries:
  metrics_brv: "SELECT 'TOTAL_COUNT' as metric_key, COUNT(*) as metric_value, 'success' as status FROM tasks"
  etl_status_rev: "SELECT 'REVIEW_ETL' as metric_key, MAX(load_time) as metric_value, 'success' as status FROM etl_logs"

excel:
  templatePath: "数据周报_模板.xlsx"
  indentSize: 2

ui:
  theme: "light"
  primaryColor: "#1677ff"
```

### 配置校验
使用 Zod 进行严格的配置校验（`src/config/config.schema.ts`），启动时自动验证配置文件格式。

---

## 数据模型

### Entity 列表

| Entity | 文件 | 说明 |
|--------|------|------|
| ReportEntity | `entities/report.entity.ts` | 报告主表 |
| SystemMetricEntity | `entities/system-metric.entity.ts` | 系统指标表 |
| ReportItemEntity | `entities/report-item.entity.ts` | 报表条目表 |
| MeetingNoteEntity | `entities/meeting-note.entity.ts` | 会议待办表 |

### 关键字段说明

**ReportEntity**:
- `id`: BIGINT（Snowflake ID）
- `weekRange`: 周周期描述（如 "2026/01/12-2026/01/18"）
- `weekNumber`: 年度周数（1-53）
- `createdAt`: 生成时间
- `isDeleted`: 软删除标记

**SystemMetricEntity**:
- `metricKey`: 指标标识（TOTAL_COUNT, PROCESS_COUNT, MANUAL_COUNT, VERIFY_ETL, REVIEW_ETL）
- `metricValue`: 显示值（数值或时间字符串）
- `statusCode`: 状态标识（loading, success, normal）

**ReportItemEntity**:
- `tabType`: 标签类型（DONE, SELF, PLAN）
- `sourceType`: 数据来源（JIRA, SQL, MANUAL）
- `parentId`: 父节点 ID（用于树形结构）
- `contentJson`: 业务数据 JSON
- `sortOrder`: 排序权重

**MeetingNoteEntity**:
- `content`: 纯文本内容

### 关系定义
- 所有子表通过 `reportId` 关联到 `ReportEntity`
- 使用 `@ManyToOne` 和 `@JoinColumn` 定义外键关系
- 级联删除：`onDelete: 'CASCADE'`

---

## 测试与质量

### 当前状态
- ❌ 单元测试：未实施
- ❌ 集成测试：未实施
- ✅ 手动测试：基础功能验证

### 测试计划

**单元测试**（优先级：高）:
```bash
# 待添加测试文件
src/modules/id/id.service.spec.ts
src/modules/generate/adapters/jira.adapter.spec.ts
src/modules/generate/adapters/sql.adapter.spec.ts
src/modules/generate/generate.service.spec.ts
```

**集成测试**（优先级：中）:
- 完整周报生成流程
- 数据库事务回滚验证
- 外部 API 调用 Mock

### 代码质量工具
- **ESLint**: 已配置（`.eslintrc.js`）
- **Prettier**: 已配置（`.prettierrc`）
- **TypeScript**: 严格模式（`tsconfig.json`）

---

## 常见问题 (FAQ)

### Q1: 如何添加新的数据库表？
**A**:
1. 在 `src/entities/` 创建新的 Entity 文件
2. 继承 `BaseIdEntity` 类
3. 运行 `npm run migration:generate -- -n AddNewTable`
4. 检查生成的 Migration 文件
5. 运行 `npm run migration:run`

### Q2: 如何修改 Jira 查询条件？
**A**: 修改 `config/app.yaml` 中的 `jira.jql.done` 和 `jira.jql.plan` 字段。

### Q3: 如何添加新的外部数据库？
**A**:
1. 在 `config/app.yaml` 的 `externalDatabases` 数组中添加新配置
2. 在 `sqlQueries` 中添加对应的 SQL 查询
3. 修改 `SqlAdapter` 添加新的查询方法

### Q4: 为什么 ID 要转为 String？
**A**: JavaScript 的 Number 类型只能安全表示 53 位整数，而 Snowflake ID 是 64 位。为防止精度丢失，在 API 层自动转为 String。

### Q5: 如何调试 SQL 查询？
**A**:
1. 修改 `src/config/typeorm.config.ts` 中的 `logging` 选项为 `true`
2. 重启服务，查看控制台输出的 SQL 语句

---

## 相关文件清单

### 核心模块
```
src/
├── main.ts                          # 应用入口
├── app.module.ts                    # 根模块
├── common/
│   ├── entities/
│   │   └── base-id.entity.ts        # 基础 Entity（ID 序列化）
│   ├── interceptors/
│   │   └── bigint-to-string.interceptor.ts  # BIGINT 序列化拦截器
│   └── utils/
│       └── snowflake.ts             # Snowflake 工具类（未使用）
├── config/
│   ├── config.loader.ts             # 配置加载器
│   ├── config.module.ts             # 配置模块
│   ├── config.schema.ts             # Zod 校验 Schema
│   ├── config.types.ts              # 配置类型定义
│   └── typeorm.config.ts            # TypeORM 配置
├── entities/
│   ├── report.entity.ts             # 报告主表
│   ├── system-metric.entity.ts      # 系统指标表
│   ├── report-item.entity.ts        # 报表条目表
│   └── meeting-note.entity.ts       # 会议待办表
├── migrations/
│   └── 1736931600000-InitDatabase.ts  # 初始化数据库
└── modules/
    ├── id/
    │   ├── id.module.ts             # ID 生成模块
    │   └── id.service.ts            # Snowflake ID 服务
    └── generate/
        ├── generate.module.ts       # 周报生成模块
        ├── generate.controller.ts   # 控制器
        ├── generate.service.ts      # 核心业务逻辑
        ├── adapters/
        │   ├── jira.adapter.ts      # Jira API 适配器
        │   └── sql.adapter.ts       # PostgreSQL 适配器
        ├── dto/
        │   └── generate.dto.ts      # 请求/响应 DTO
        └── types/
            ├── jira.types.ts        # Jira 类型定义
            └── sql.types.ts         # SQL 类型定义
```

### 配置文件
```
config/
└── app.yaml.example                 # 配置文件模板

ormconfig.ts                         # TypeORM CLI 配置
nest-cli.json                        # NestJS CLI 配置
tsconfig.json                        # TypeScript 配置
package.json                         # 依赖管理
```

---

## 架构设计亮点

### 1. Snowflake ID 生成
- 64 位分布式 ID，确保全局唯一
- 时间有序，便于索引和排序
- 支持多机房、多实例部署

### 2. 适配器模式
- `JiraAdapter` 和 `SqlAdapter` 封装外部数据源
- 统一的数据标准化接口
- 便于扩展新的数据源

### 3. 事务管理
- 使用 TypeORM 事务确保数据一致性
- 单次生成涉及 4 张表的写入，全部成功或全部回滚

### 4. 配置外部化
- 敏感信息不提交到版本控制
- 支持多环境配置（开发、测试、生产）
- Zod 校验确保配置格式正确

### 5. SQLite WAL 模式
- 读写并发性能更好
- 写操作不阻塞读操作
- 数据库崩溃恢复更快

---

## 性能优化建议

### 已实施
- ✅ 并发拉取数据（Promise.all）
- ✅ 数据库连接池（PostgreSQL）
- ✅ SQLite WAL 模式
- ✅ 索引优化（复合索引）

### 待优化
- [ ] Jira API 分页查询（当前限制 1000 条）
- [ ] 缓存热点数据（Redis）
- [ ] 异步任务队列（Bull）
- [ ] 数据库查询优化（N+1 问题）

---

## 安全措施

### 已实施
- ✅ 配置文件不提交到版本控制（`.gitignore`）
- ✅ PostgreSQL 使用只读账号
- ✅ 参数化查询（防止 SQL 注入）
- ✅ 请求参数校验（ValidationPipe）
- ✅ 超时控制（连接超时 5 秒，查询超时 15 秒）

### 待加强
- [ ] API 认证与授权（JWT）
- [ ] 请求频率限制（Rate Limiting）
- [ ] 敏感数据加密（数据库密码）
- [ ] 审计日志（操作记录）

---

**文档生成时间**: 2026-01-16
**模块覆盖率**: 约 90%（核心代码已扫描，测试部分待补充）
