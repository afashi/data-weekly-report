# 数据周报自动化系统

自动化数据周报管理系统，支持多源数据聚合（Jira + PostgreSQL）、快照式版本管理、可视化编辑与一键 Excel 导出。

## 📦 技术栈

### 后端

- **框架**: NestJS + TypeScript
- **ORM**: TypeORM
- **数据库**: SQLite (WAL 模式) + PostgreSQL (外部数据源)
- **ID 生成**: Snowflake 算法
- **Excel**: ExcelJS

### 前端

- **框架**: React 18 + TypeScript
- **构建**: Vite
- **UI 库**: Ant Design 5.x
- **状态管理**: Zustand (UI) + React Query (数据)
- **数据处理**: Immer

---

## 🚀 快速开始

### 1. 安装依赖

```bash
# 后端依赖
cd backend
npm install

# 前端依赖
cd ../frontend
npm install
```

### 2. 配置文件

复制配置示例并填入真实配置：

```bash
cd backend/config
cp app.yaml.example app.yaml
```

编辑 `backend/config/app.yaml`，填入：

- Jira 凭证（baseUrl, email, apiToken）
- PostgreSQL 连接信息（brv_db 和 rev_db）
- SQL 查询语句

### 3. 初始化数据库

```bash
cd backend

# 生成初始 Migration（如果需要）
npm run migration:generate -- -n Init

# 运行 Migration
npm run migration:run
```

### 4. 启动开发服务器

**后端**（端口 3000）：

```bash
cd backend
npm run start:dev
```

**前端**（端口 5173）：

```bash
cd frontend
npm run dev
```

访问：http://localhost:5173

---

## 📁 项目结构

```
data-weekly-report/
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── common/             # 通用模块（Entity、拦截器）
│   │   ├── config/             # 配置管理
│   │   ├── modules/            # 业务模块（ID、Reports 等）
│   │   ├── entities/           # 数据库实体
│   │   ├── datasources/        # 数据源适配器（Jira、PostgreSQL）
│   │   └── main.ts
│   ├── config/
│   │   └── app.yaml.example    # 配置文件模板
│   └── package.json
│
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── components/         # UI 组件
│   │   ├── features/           # 业务模块
│   │   ├── store/              # Zustand 状态
│   │   ├── lib/                # Axios、React Query 配置
│   │   ├── types/              # TypeScript 类型
│   │   └── main.tsx
│   └── package.json
│
├── 数据周报_模板.xlsx          # Excel 导出模板
└── README.md
```

---

## 🗄️ 数据库设计

### 表结构

| 表名               | 说明                        |
|------------------|---------------------------|
| `reports`        | 报告主表（周报版本元数据）             |
| `system_metrics` | 系统指标表（顶部卡片数据）             |
| `report_items`   | 报表条目表（3 个 Tab 的详细数据，支持树形） |
| `meeting_notes`  | 会议待办表                     |

### 关键约束

- **命名规范**: 所有表名、字段名使用 `snake_case`
- **主键类型**: BIGINT（Snowflake ID）
- **ID 序列化**: API 层自动转为 String（防止 JS 精度丢失）
- **索引策略**: 已在 Entity 中定义复合索引

---

## 🔧 开发指南

### 后端开发

**添加新模块**：

```bash
cd backend
nest g module modules/example
nest g service modules/example
nest g controller modules/example
```

**创建 Migration**：

```bash
npm run migration:generate -- -n AddNewFeature
npm run migration:run
```

### 前端开发

**组件结构**：

- `components/common/`: 通用组件（Loading、ErrorFallback）
- `components/business/`: 业务组件（MetricCard、StackedProgress）
- `features/`: 业务模块（report、sidebar、navigation）

**API 请求**：

- 使用 `@tanstack/react-query` 管理服务端状态
- 所有请求通过 `src/services/` 封装

---

## 📝 核心功能

### 1. 版本化周报管理

- 快照模式：每次生成独立版本
- 历史版本切换与删除（软删除）
- 无刷新数据重载

### 2. 多源数据聚合

- **Jira**: 自动拉取任务数据（基于 JQL 查询）
- **PostgreSQL**: 查询 ETL 指标（brv_db 和 rev_db）
- **人工录入**: 表格行内编辑

### 3. 三个 Tab 编辑器

- **Tab 1 - 本周完成**: 二维表格，双击编辑，失焦自动保存
- **Tab 2 - 自采数据**: 树形表格（2 层），Draft 模式 + 全量提交
- **Tab 3 - 后续计划**: 同 Tab 1

### 4. 指标看板

- 业务量卡片（双色堆叠进度条）
- 验证环境 ETL 状态
- 复盘环境 ETL 状态

### 5. Excel 导出

- 基于模板导出（`数据周报_模板.xlsx`）
- 树形数据层级格式化（缩进 + 样式）
- 4 个 Sheet（本周完成、自采数据、后续计划、维度说明）

---

## ⚙️ 配置说明

### Jira 配置

```yaml
jira:
  baseUrl: "https://your-domain.atlassian.net"
  email: "your-email@example.com"
  apiToken: "YOUR_JIRA_API_TOKEN"
  jql:
    done: "project = DATADEV AND issuetype = 数据加工 AND status = Done AND updated >= startOfWeek()"
    plan: "project = DATADEV AND issuetype = 数据加工 AND status in (Open, \"In Progress\")"
  fields:
    - "summary"
    - "status"
    - "assignee"
    - "customfield_10016"  # 根据实际字段调整
```

### PostgreSQL 配置

```yaml
externalDatabases:
  - name: "brv_db"
    host: "192.168.0.51"
    port: 5432
    database: "tjfj"
    username: "readonly_user"
    password: "YOUR_PASSWORD"

  - name: "rev_db"
    host: "192.168.0.45"
    port: 5432
    database: "tjfj"
    username: "readonly_user"
    password: "YOUR_PASSWORD"
```

---

## 🛠️ 常见问题

### Q: 后端启动失败？

**A**: 检查配置文件：

1. `backend/config/app.yaml` 是否存在
2. Jira 和数据库凭证是否正确
3. 数据库连接是否可达

### Q: 前端启动后无法访问后端？

**A**: 确认：

1. 后端服务已启动（http://localhost:3000）
2. CORS 配置正确（`app.yaml` 中的 `server.corsOrigin`）

### Q: Excel 导出样式不对？

**A**: 确认 `数据周报_模板.xlsx` 路径正确，且文件格式未损坏。

---

## 📄 API 文档

详见 `.claude/plan/数据周报自动化系统.md` 中的接口设计章节。

**核心端点**：

- `GET /api/reports` - 获取历史周报列表
- `POST /api/reports/generate` - 生成新周报
- `GET /api/reports/:id` - 获取周报详情
- `GET /api/reports/:id/export` - 导出 Excel

---

## 📊 数据流程

```
用户触发生成
    ↓
后端计算周期
    ↓
并发拉取数据（Jira + PostgreSQL）
    ↓
数据转换与映射
    ↓
单事务写入 4 张表
    ↓
返回新周报 ID
    ↓
前端自动跳转
```

---

## 🔒 安全措施

- **配置文件**: `app.yaml` 已添加到 `.gitignore`，不提交到版本控制
- **SQL 注入防护**: 参数化查询 + SELECT-only 限制
- **只读账号**: PostgreSQL 使用只读权限
- **超时控制**: 查询超时 15 秒，连接超时 5 秒

---

## 📈 性能优化

- **SQLite WAL 模式**: 提升读写并发性能
- **React Query 缓存**: 5 分钟 staleTime，减少重复请求
- **乐观更新**: 失焦自动保存，即时反馈
- **虚拟滚动**: 大数据量表格（可选）

---

## 🎨 UI 设计

- **主题**: 现代企业级 SaaS 风格
- **色彩**: 清爽蓝主色（#1677ff）
- **字体**: PingFang SC / Microsoft YaHei（中文）
- **动效**: 微动效（卡片 Hover、保存成功）
- **响应式**: 断点 1200px（xl 屏幕 12:6:6，小屏 24:12:12）

---

## 📦 构建与部署

### 生产构建

```bash
# 后端
cd backend
npm run build
npm run start:prod

# 前端
cd frontend
npm run build
```

### 部署建议

- **后端**: PM2 进程管理
- **前端**: Nginx 静态文件服务
- **数据库**: 定期备份 SQLite 文件

---

## 📝 开发进度

### ✅ 阶段 1：基础设施（~70% 完成）

**已完成**：

- ✅ 后端：NestJS 框架、ConfigModule、IdService、TypeORM 配置
- ✅ 后端：4 个 Entity 定义（需补充关系约束）
- ✅ 前端：Vite + React 项目、Ant Design、Zustand、React Query
- ✅ 前端：MainLayout 基础骨架

**阻塞问题**：

- 🔴 **缺少数据库 Migration**（无法初始化数据库）
- ⚠️ WAL 配置未生效
- ⚠️ Jira email 配置校验错误

### ⏳ 阶段 2-6：待实施

**下一步**：

- [ ] 修复阻塞问题（Migration + 配置修正）
- [ ] 实现 JiraAdapter 和 SqlAdapter
- [ ] 实现 GenerateService 核心逻辑
- [ ] 前端类型定义 + API 服务层

---

## 📊 整体完成度

| 阶段          | 完成度      | 状态            |
|-------------|----------|---------------|
| 阶段 1：基础设施   | 70%      | 🟡 部分完成（存在阻塞） |
| 阶段 2：核心模块   | 5%       | 🔴 未开始        |
| 阶段 3-6：业务功能 | 0%       | 🔴 未开始        |
| **整体进度**    | **~15%** | 🔴 初期阶段       |

---

## 📧 联系方式

如有问题，请查看 `.claude/plan/数据周报自动化系统.md` 完整技术文档。

---

**开发状态**: 🟡 阶段 1 部分完成，正在修复阻塞问题

**详细计划**：查看 `.claude/plan/数据周报自动化系统.md`
