# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 项目概述

**数据周报自动化系统** - 一个基于 NestJS + React 的全栈应用，用于自动化生成和管理数据周报。

**核心功能**：

- 🔄 自动从 Jira 和 PostgreSQL 拉取数据生成周报
- 📸 快照式版本管理，确保历史数据可追溯
- ✏️ 支持手动编辑和补充数据
- 📊 可视化指标看板展示
- 📥 导出标准格式 Excel 周报

**技术栈**：

- **后端**: NestJS 10 + TypeORM 0.3 + SQLite (WAL 模式)
- **前端**: React 18 + Ant Design 5 + Vite 7 + React Query 5
- **ID 生成**: Snowflake 算法（64 位分布式 ID）
- **数据库**: SQLite (本地存储) + PostgreSQL (外部数据源)

---

## 快速开始

### 环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
# 后端依赖
cd backend
npm install

# 前端依赖
cd ../frontend
npm install
```

### 配置文件

```bash
cd backend/config
cp app.yaml.example app.yaml
# 编辑 app.yaml，填入 Jira 凭证和 PostgreSQL 连接信息
```

### 初始化数据库

```bash
cd backend
npm run migration:run
```

### 启动开发服务器

```bash
# 后端（端口 3000）
cd backend
npm run start:dev

# 前端（端口 5173）
cd ../frontend
npm run dev
```

访问：http://localhost:5173

---

## 常用命令

### 后端命令

```bash
# 开发模式（热重载）
npm run start:dev

# 生产构建
npm run build

# 生产模式启动
npm run start:prod

# 数据库 Migration
npm run migration:generate -- -n <变更描述>
npm run migration:run
npm run migration:revert

# 测试
npm run test
npm run test:watch
npm run test:cov
```

### 前端命令

```bash
# 开发模式（热重载）
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview

# 代码检查
npm run lint

# 类型检查
npm run type-check
```

---

## 架构设计

### 数据流

```
用户触发生成
  → 后端计算周期（周一至周日）
  → 并发拉取数据（Jira + PostgreSQL）
  → 数据转换与映射
  → 单事务写入 4 张表
  → 返回新周报 ID
  → 前端自动跳转
```

### 核心模块

**后端模块**：

- `generate` - 周报生成（核心业务逻辑）
- `reports` - 历史查询
- `items` - 条目编辑
- `notes` - 会议待办
- `export` - Excel 导出
- `id` - Snowflake ID 生成

**前端模块**：

- `features/report` - 周报页面
- `features/sidebar` - 侧边栏
- `components/business` - 业务组件
- `hooks` - React Hooks（数据请求）
- `services` - API 服务层
- `store` - 全局状态管理（Zustand）

### 数据库设计

**4 张核心表**：

1. `reports` - 报告主表（周报元数据）
2. `system_metrics` - 系统指标表（ETL 加载时间、业务量统计）
3. `report_items` - 报表条目表（任务明细，支持树形结构）
4. `meeting_notes` - 会议待办表（纯文本内容）

**关键设计**：

- 所有 ID 使用 TEXT 类型存储（防止 JavaScript 精度丢失）
- 软删除机制（`is_deleted` 字段）
- 树形结构支持（`parent_id` 自关联）
- SQLite WAL 模式（支持读写并发）

---

## 关键技术约束

### 1. ID 处理（重要！）

**问题**：JavaScript 无法安全处理超过 53 位的整数，会导致精度丢失。

**解决方案**：

- 数据库：所有 ID 字段使用 `TEXT` 类型
- 后端：`IdService.nextId()` 返回 String 类型
- API：通过 `BigIntToStringInterceptor` 自动序列化
- 前端：所有 ID 作为 String 处理

**示例**：

```typescript
// ✅ 正确
const id = idService.nextId(); // 返回 "1234567890123456789"

// ❌ 错误
const id = BigInt(1234567890123456789); // 会丢失精度
```

### 2. 数据库 Migration

**重要**：使用 `run-migrations.js` 而非 TypeORM CLI，因为：

- 手动创建表结构，确保 ID 字段为 TEXT 类型
- 自动配置 SQLite WAL 模式
- 避免 TypeORM 自动生成 BIGINT 类型

### 3. 事务管理

涉及多表写入必须使用 TypeORM 事务：

```typescript
await this.dataSource.transaction(async (manager) => {
  const report = await manager.save(ReportEntity, reportData);
  await manager.save(SystemMetricEntity, metrics);
  await manager.save(ReportItemEntity, items);
  await manager.save(MeetingNoteEntity, notes);
});
```

### 4. API 路由前缀

所有 API 端点自动添加 `/api` 前缀（在 `main.ts` 中配置）：

- 实际端点：`POST /api/generate`
- 健康检查：`GET /api/generate/health`

### 5. CORS 配置

后端已配置 CORS，允许前端跨域请求：

- 默认允许：`http://localhost:5173`
- 可在 `config/app.yaml` 中修改

---

## 核心 API 端点

### 周报生成

- `POST /api/generate` - 生成新周报
  - 请求体：`{ weekRange?: string, weekNumber?: number }`
  - 响应：完整周报数据

### 周报查询

- `GET /api/reports` - 获取历史周报列表
- `GET /api/reports/:id` - 获取指定周报详情

### 条目编辑

- `PATCH /api/items/:id` - 更新单行条目
- `PUT /api/reports/:id/manual-items` - 全量更新自采数据

### 会议待办

- `PATCH /api/notes/:report_id` - 更新会议待办

### Excel 导出

- `GET /api/reports/:id/export` - 导出 Excel（⚠️ 未完成）

### 健康检查

- `GET /api/generate/health` - 检查所有依赖服务状态

---

## 开发指南

### 添加新的后端 API

```bash
# 使用 NestJS CLI 生成模块
cd backend
nest g module modules/<模块名>
nest g controller modules/<模块名>
nest g service modules/<模块名>
```

### 修改数据库结构

```bash
# 1. 修改 Entity 文件
# 2. 更新 run-migrations.js 中的表结构
# 3. 运行 Migration
cd backend
npm run migration:run
```

### 添加新的前端页面

```typescript
// 1. 在 features/ 创建功能模块
// 2. 在 App.tsx 添加路由
<Route path="/your-path" element={<YourComponent />} />
```

### 添加新的 React Hook

```typescript
// 在 hooks/ 创建 Hook
export function useYourFeature() {
  return useQuery({
    queryKey: ['your-feature'],
    queryFn: () => api.fetchData(),
  });
}
```

---

## 编码规范

### 命名约定

- **数据库**：snake_case（表名、字段名）
- **TypeScript**：camelCase（变量、函数）、PascalCase（类、接口）
- **文件名**：kebab-case（组件文件）
- **React 组件**：PascalCase（文件名与组件名一致）

### 关键原则

1. **类型安全**：禁止使用 `any`，必须明确类型定义
2. **ID 生成**：必须通过 `IdService.nextId()` 生成
3. **错误处理**：使用 NestJS 内置异常类
4. **组件拆分**：单个组件不超过 300 行
5. **Hook 封装**：业务逻辑必须封装在 Hook 中

---

## 调试技巧

### 后端调试

**启用 SQL 日志**：

```typescript
// typeorm.config.ts
logging: true,
```

**健康检查**：

```bash
curl http://localhost:3000/api/generate/health
```

**查看数据库**：
```bash
# 使用 SQLite 客户端
sqlite3 backend/data/weekly-report.sqlite
.tables
.schema reports
```

### 前端调试

**React Query DevTools**：

- 开发模式自动显示
- 查看缓存数据与请求状态

**Zustand DevTools**：

- 安装浏览器扩展
- 查看全局状态变化

**Network 面板**：

- 查看 API 请求与响应
- 检查请求参数与响应数据

---

## 已知问题与限制

### 当前状态

- ✅ 后端核心功能已完成（约 70%）
- ✅ 前端基础框架已搭建（约 40%）
- ⚠️ Excel 导出功能未实现
- ⚠️ 部分前端组件功能不完整

### 技术限制

1. **SQLite 并发**：WAL 模式支持读写并发，但写写互斥
2. **Jira API**：单次查询限制 1000 条，需分页处理
3. **前端渲染**：大表格需考虑虚拟滚动（未实现）

---

## 项目结构

```
data-weekly-report/
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── main.ts            # 应用入口
│   │   ├── app.module.ts      # 根模块
│   │   ├── common/            # 公共模块
│   │   ├── config/            # 配置管理
│   │   ├── entities/          # 数据模型
│   │   ├── migrations/        # 数据库迁移
│   │   └── modules/           # 业务模块
│   ├── config/
│   │   └── app.yaml           # 配置文件
│   ├── data/                  # 数据目录
│   ├── run-migrations.js      # Migration 脚本
│   └── package.json
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── App.tsx            # 根组件
│   │   ├── main.tsx           # 应用入口
│   │   ├── components/        # UI 组件
│   │   ├── features/          # 功能模块
│   │   ├── hooks/             # React Hooks
│   │   ├── services/          # API 服务
│   │   ├── store/             # 状态管理
│   │   └── types/             # 类型定义
│   └── package.json
└── CLAUDE.md                   # 本文件
```

---

## 参考文档

- [NestJS 官方文档](https://docs.nestjs.com/)
- [React 官方文档](https://react.dev/)
- [Ant Design 组件库](https://ant.design/)
- [TypeORM 文档](https://typeorm.io/)
- [React Query 文档](https://tanstack.com/query/latest)

---

**最后更新**: 2026-02-09
**项目状态**: 🟡 开发中
**维护者**: Development Team
