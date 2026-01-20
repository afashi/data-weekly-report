# 数据周报自动化系统 - 待办事项清单

> **最后更新**: 2026-01-16
> **项目状态**: 🟡 阶段 1 部分完成（约 55%）
> **当前进度**: 后端 70% | 前端 30%

---

## 📊 项目整体状态

### 阶段完成度

| 阶段   | 名称       | 完成度 | 状态      |
|------|----------|-----|---------|
| 阶段 1 | 基础设施搭建   | 90% | 🟢 基本完成 |
| 阶段 2 | 数据库与核心模块 | 70% | 🟡 部分完成 |
| 阶段 3 | 核心功能开发   | 20% | 🔴 进行中  |
| 阶段 4 | 复杂功能开发   | 10% | 🔴 未开始  |
| 阶段 5 | 全局功能串联   | 5%  | 🔴 未开始  |
| 阶段 6 | 样式优化与测试  | 0%  | 🔴 未开始  |

### 关键阻塞点

1. ❌ **前端缺少核心交互组件**（VersionSelector、ActionBar、MeetingSidebar）
2. ❌ **前端缺少路由逻辑**，无法访问特定周报
3. ❌ **后端缺少 PUT /api/reports/:id/manual-items API**，SELF 标签页无法保存
4. ❌ **前端缺少完整的 React Query Hooks**，数据同步不完整

---

## 🔴 高优先级任务（P0 - 阻塞核心功能）

### 前端核心组件（预计 7 小时）

#### 1. ActionBar 操作栏组件 ⚠️ **最高优先级**

- **文件**: `frontend/src/components/business/ActionBar.tsx`
- **预计时间**: 2 小时
- **功能需求**:
    - [ ] 生成周报按钮（调用 POST /api/generate）
    - [ ] 导出 Excel 按钮（调用 GET /api/export/:reportId）
    - [ ] 切换侧边栏按钮（控制 MeetingSidebar 显示/隐藏）
    - [ ] 按钮加载状态与禁用逻辑
    - [ ] 成功/失败提示（message.success/error）
- **依赖**: React Query Hooks（useGenerateReport、useExportReport）
- **影响**: 用户无法触发任何核心操作

#### 2. VersionSelector 版本选择器组件 ⚠️ **最高优先级**

- **文件**: `frontend/src/features/navigation/VersionSelector.tsx`
- **预计时间**: 2 小时
- **功能需求**:
    - [ ] 下拉菜单展示历史版本列表（Ant Design Dropdown）
    - [ ] 版本切换逻辑（路由跳转到 /reports/:reportId）
    - [ ] 删除版本功能（调用 DELETE /api/reports/:id）
    - [ ] 删除确认对话框（Modal.confirm）
    - [ ] 当前版本高亮显示
- **依赖**: React Query Hooks（useReports、useDeleteReport）
- **影响**: 用户无法切换历史周报

#### 3. MeetingSidebar 会议待办侧边栏 ⚠️ **高优先级**

- **文件**: `frontend/src/features/sidebar/MeetingSidebar.tsx`
- **预计时间**: 2 小时
- **功能需求**:
    - [ ] Drawer 侧边栏容器（Ant Design Drawer）
    - [ ] TextArea 编辑器（支持多行文本）
    - [ ] 自动保存逻辑（防抖 500ms）
    - [ ] 保存中加载状态
    - [ ] 保存成功/失败提示
- **依赖**: React Query Hooks（useUpdateNotes）
- **影响**: 用户无法编辑会议待办

#### 4. 路由逻辑配置 ⚠️ **高优先级**

- **文件**: `frontend/src/App.tsx`
- **预计时间**: 1 小时
- **功能需求**:
    - [ ] 配置 `/reports/:reportId` 路由
    - [ ] 配置 `/latest` 重定向逻辑（重定向到最新周报）
    - [ ] 配置 404 页面（NotFound 组件）
    - [ ] 路由参数解析与传递
- **依赖**: React Router
- **影响**: 用户无法通过 URL 访问特定周报

---

### 后端核心 API（预计 3 小时）

#### 5. PUT /api/reports/:id/manual-items - 全量更新自采数据 ⚠️ **高优先级**

- **文件**: `backend/src/modules/items/items.controller.ts`
- **预计时间**: 3 小时
- **功能需求**:
    - [ ] ItemsController 添加 `updateManualItems()` 方法
    - [ ] ItemsService 实现批量删除 + 插入逻辑
    - [ ] ID 映射机制（临时 ID → 真实 Snowflake ID）
    - [ ] 事务保证（使用 TypeORM QueryRunner）
    - [ ] 树形数据扁平化处理
    - [ ] DTO 定义（UpdateManualItemsDto）
- **依赖**: IdService、ReportItemEntity
- **影响**: 前端 SELF 标签页无法保存树形数据

---

### 前端数据层完善（预计 2 小时）

#### 6. React Query Hooks 完善 ⚠️ **高优先级**

- **文件**: `frontend/src/services/reportHooks.ts`
- **预计时间**: 2 小时
- **功能需求**:
    - [ ] `useReportDetail(id)` - 获取周报详情
    - [ ] `useUpdateItem(id)` - 更新单行条目
    - [ ] `useUpdateManualItems(reportId)` - 更新自采数据
    - [ ] `useUpdateNotes(reportId)` - 更新会议待办
    - [ ] `useDeleteReport(id)` - 删除周报
    - [ ] `useExportReport(id)` - 导出 Excel
    - [ ] `useGenerateReport()` - 生成周报
- **依赖**: API 服务层
- **影响**: 数据同步不完整

---

## 🟡 中优先级任务（P1 - 影响用户体验）

### 前端体验优化（预计 4 小时）

#### 7. 加载状态与错误边界

- **文件**: `frontend/src/components/common/`
- **预计时间**: 2 小时
- **功能需求**:
    - [ ] Skeleton 加载占位符（表格、卡片）
    - [ ] ErrorBoundary 全局错误捕获组件
    - [ ] 空状态展示（Empty 组件）
    - [ ] 加载失败重试按钮
- **依赖**: Ant Design
- **影响**: 用户体验不佳

#### 8. 表格编辑交互优化

- **文件**: `frontend/src/components/business/ReportTable.tsx`
- **预计时间**: 2 小时
- **功能需求**:
    - [ ] 防抖处理（避免频繁保存，500ms）
    - [ ] 保存中加载状态（Spin 组件）
    - [ ] 保存成功/失败提示（message）
    - [ ] 编辑冲突检测（乐观更新失败回滚）
- **依赖**: lodash.debounce
- **影响**: 编辑体验不流畅

---

### 后端基础设施（预计 2.5 小时）

#### 9. 全局异常过滤器

- **文件**: `backend/src/common/filters/http-exception.filter.ts`
- **预计时间**: 1 小时
- **功能需求**:
    - [ ] 实现 HttpExceptionFilter
    - [ ] 统一错误响应格式（code、message、timestamp、path）
    - [ ] 错误日志记录（Logger）
    - [ ] 在 main.ts 中注册全局过滤器
- **依赖**: @nestjs/common
- **影响**: 前端错误处理不友好

#### 10. 配置校验问题修复

- **文件**: `backend/src/config/config.schema.ts`
- **预计时间**: 0.5 小时
- **功能需求**:
    - [ ] 修复 Jira email 字段校验（改为 `z.string().min(1)`）
    - [ ] 锁定 PostgreSQL 类型（`z.literal('postgres')`）
    - [ ] 添加配置示例文件（app.yaml.example）
- **依赖**: Zod
- **影响**: 配置文件无法正常加载

#### 11. 错误处理完善

- **文件**: `backend/src/modules/generate/adapters/`
- **预计时间**: 1 小时
- **功能需求**:
    - [ ] Jira API 限流重试机制（指数退避，最多 3 次）
    - [ ] PostgreSQL 连接超时降级（显示"加载失败"）
    - [ ] 部分失败时的降级策略（Promise.allSettled）
    - [ ] 详细错误日志记录
- **依赖**: axios-retry
- **影响**: 外部服务故障时系统不稳定

---

## 🟢 低优先级任务（P2 - 后续优化）

### 前端性能与响应式（预计 5 小时）

#### 12. 响应式适配

- **文件**: `frontend/src/components/`
- **预计时间**: 3 小时
- **功能需求**:
    - [ ] 1200px 断点适配（Grid 布局调整）
    - [ ] 移动端布局优化（Drawer 全屏显示）
    - [ ] 表格横向滚动优化（固定列）
    - [ ] 卡片堆叠布局（小屏幕）
- **依赖**: Ant Design Grid
- **影响**: 小屏幕设备体验差

#### 13. 性能优化

- **文件**: `frontend/src/`
- **预计时间**: 2 小时
- **功能需求**:
    - [ ] React Query 缓存策略调整（staleTime、cacheTime）
    - [ ] 大表格虚拟滚动（react-window）
    - [ ] 组件懒加载（React.lazy + Suspense）
    - [ ] 图片懒加载（Intersection Observer）
- **依赖**: react-window
- **影响**: 大数据量时性能下降

---

### 后端监控与文档（预计 2 小时）

#### 14. 日志记录增强

- **文件**: `backend/src/common/logger/`
- **预计时间**: 1 小时
- **功能需求**:
    - [ ] 结构化日志（JSON 格式）
    - [ ] 日志级别配置（环境变量控制）
    - [ ] 日志文件轮转（winston-daily-rotate-file）
    - [ ] 请求追踪（correlation-id）
- **依赖**: winston
- **影响**: 问题排查困难

#### 15. API 文档生成

- **文件**: `backend/src/main.ts`
- **预计时间**: 1 小时
- **功能需求**:
    - [ ] 集成 Swagger（@nestjs/swagger）
    - [ ] 为所有 DTO 添加 @ApiProperty 装饰器
    - [ ] 为所有 Controller 添加 @ApiTags 装饰器
    - [ ] 配置 Swagger UI（/api/docs）
- **依赖**: @nestjs/swagger
- **影响**: API 文档缺失

---

## 🧪 测试任务（P3 - 质量保障）

### 后端测试（预计 8 小时）

#### 16. 单元测试 - 核心服务

- **文件**: `backend/src/modules/*/tests/`
- **预计时间**: 4 小时
- **功能需求**:
    - [ ] IdService 测试（Snowflake ID 生成与解析）
    - [ ] JiraAdapter 测试（API 调用与数据标准化）
    - [ ] SqlAdapter 测试（数据库连接与查询）
    - [ ] GenerateService 测试（周报生成核心逻辑）
    - [ ] ReportsService 测试（CRUD 操作）
    - [ ] ItemsService 测试（条目更新）
    - [ ] NotesService 测试（会议待办更新）
- **依赖**: Jest、@nestjs/testing
- **影响**: 代码质量保障不足

#### 17. 集成测试 - API 端点

- **文件**: `backend/test/`
- **预计时间**: 3 小时
- **功能需求**:
    - [ ] POST /api/generate - 周报生成流程测试
    - [ ] GET /api/reports - 列表查询测试
    - [ ] GET /api/reports/:id - 详情查询测试
    - [ ] PATCH /api/items/:id - 条目更新测试
    - [ ] PUT /api/reports/:id/manual-items - 批量更新测试
    - [ ] PATCH /api/notes/:reportId - 会议待办更新测试
    - [ ] DELETE /api/reports/:id - 软删除测试
    - [ ] GET /api/export/:reportId - Excel 导出测试
- **依赖**: supertest
- **影响**: 端到端功能验证缺失

#### 18. 数据库测试

- **文件**: `backend/test/database/`
- **预计时间**: 1 小时
- **功能需求**:
    - [ ] Migration 测试（up/down 可逆性）
    - [ ] 外键约束测试（级联删除）
    - [ ] 唯一约束测试（重复数据拒绝）
    - [ ] 索引性能测试（查询优化）
- **依赖**: SQLite in-memory
- **影响**: 数据一致性保障不足

---

### 前端测试（预计 6 小时）

#### 19. 组件测试

- **文件**: `frontend/src/components/**/*.test.tsx`
- **预计时间**: 3 小时
- **功能需求**:
    - [ ] MetricCard 测试（数据展示与状态）
    - [ ] StackedProgress 测试（进度条渲染）
    - [ ] ReportTable 测试（编辑交互）
    - [ ] TreeTable 测试（树形数据操作）
    - [ ] VersionSelector 测试（版本切换）
    - [ ] ActionBar 测试（按钮交互）
    - [ ] MeetingSidebar 测试（自动保存）
- **依赖**: Vitest、@testing-library/react
- **影响**: 组件质量保障不足

#### 20. Hook 测试

- **文件**: `frontend/src/services/**/*.test.ts`
- **预计时间**: 2 小时
- **功能需求**:
    - [ ] useReports 测试（列表查询）
    - [ ] useReportDetail 测试（详情查询）
    - [ ] useGenerateReport 测试（周报生成）
    - [ ] useUpdateItem 测试（条目更新）
    - [ ] useUpdateManualItems 测试（批量更新）
    - [ ] useUpdateNotes 测试（会议待办更新）
    - [ ] useDeleteReport 测试（删除周报）
    - [ ] useExportReport 测试（Excel 导出）
- **依赖**: @testing-library/react-hooks
- **影响**: 数据层质量保障不足

#### 21. E2E 测试

- **文件**: `e2e/`
- **预计时间**: 1 小时
- **功能需求**:
    - [ ] 完整周报生成流程测试
    - [ ] 编辑与保存流程测试
    - [ ] 版本切换流程测试
    - [ ] Excel 导出验证测试
- **依赖**: Playwright
- **影响**: 用户场景覆盖不足

---

## 🚀 部署任务（P4 - 生产就绪）

### 容器化与 CI/CD（预计 4 小时）

#### 22. Docker 容器化

- **文件**: `Dockerfile`、`docker-compose.yml`
- **预计时间**: 2 小时
- **功能需求**:
    - [ ] 后端 Dockerfile（多阶段构建）
    - [ ] 前端 Dockerfile（Nginx 静态服务）
    - [ ] docker-compose.yml（本地开发环境）
    - [ ] .dockerignore 配置
    - [ ] 环境变量配置（.env.example）
- **依赖**: Docker
- **影响**: 部署不便

#### 23. CI/CD 流水线

- **文件**: `.github/workflows/` 或 `.gitlab-ci.yml`
- **预计时间**: 2 小时
- **功能需求**:
    - [ ] 代码检查（ESLint、TypeScript）
    - [ ] 单元测试自动运行
    - [ ] 构建验证（前后端）
    - [ ] Docker 镜像构建与推送
    - [ ] 自动部署到测试环境
- **依赖**: GitHub Actions / GitLab CI
- **影响**: 发布流程手动

---

## 📋 实施建议

### 推荐实施顺序

#### 第一阶段：解锁核心功能（预计 12 小时）⚠️ **立即开始**

**目标**: 让系统可用，用户能够完成基本的周报生成、查看、编辑、导出流程

1. **前端 ActionBar 组件**（2 小时）- 任务 #1
2. **前端 VersionSelector 组件**（2 小时）- 任务 #2
3. **前端路由逻辑配置**（1 小时）- 任务 #4
4. **前端 React Query Hooks 完善**（2 小时）- 任务 #6
5. **前端 MeetingSidebar 组件**（2 小时）- 任务 #3
6. **后端 PUT /api/reports/:id/manual-items**（3 小时）- 任务 #5

**验收标准**:

- ✅ 用户可以点击按钮生成周报
- ✅ 用户可以切换历史版本
- ✅ 用户可以编辑 DONE/PLAN 标签页
- ✅ 用户可以编辑 SELF 标签页（树形数据）
- ✅ 用户可以编辑会议待办
- ✅ 用户可以导出 Excel

---

#### 第二阶段：完善用户体验（预计 6.5 小时）

**目标**: 提升系统稳定性和用户体验

1. **前端加载状态与错误边界**（2 小时）- 任务 #7
2. **前端表格编辑交互优化**（2 小时）- 任务 #8
3. **后端全局异常过滤器**（1 小时）- 任务 #9
4. **后端配置校验问题修复**（0.5 小时）- 任务 #10
5. **后端错误处理完善**（1 小时）- 任务 #11

**验收标准**:

- ✅ 加载时显示 Skeleton 占位符
- ✅ 错误时显示友好提示
- ✅ 编辑时有防抖和加载状态
- ✅ 外部服务故障时系统降级而非崩溃

---

#### 第三阶段：性能与监控（预计 7 小时）

**目标**: 优化性能，增强可观测性

1. **前端响应式适配**（3 小时）- 任务 #12
2. **前端性能优化**（2 小时）- 任务 #13
3. **后端日志记录增强**（1 小时）- 任务 #14
4. **后端 API 文档生成**（1 小时）- 任务 #15

**验收标准**:

- ✅ 小屏幕设备体验良好
- ✅ 大数据量时性能稳定
- ✅ 日志结构化，便于排查问题
- ✅ API 文档完整，便于前端开发

---

#### 第四阶段：测试覆盖（预计 14 小时）

**目标**: 建立测试体系，保障代码质量

1. **后端单元测试**（4 小时）- 任务 #16
2. **后端集成测试**（3 小时）- 任务 #17
3. **后端数据库测试**（1 小时）- 任务 #18
4. **前端组件测试**（3 小时）- 任务 #19
5. **前端 Hook 测试**（2 小时）- 任务 #20
6. **E2E 测试**（1 小时）- 任务 #21

**验收标准**:

- ✅ 核心服务单元测试覆盖率 > 80%
- ✅ API 端点集成测试覆盖率 100%
- ✅ 核心组件测试覆盖率 > 70%
- ✅ 关键用户流程 E2E 测试通过

---

#### 第五阶段：生产部署（预计 4 小时）

**目标**: 容器化部署，建立 CI/CD 流水线

1. **Docker 容器化**（2 小时）- 任务 #22
2. **CI/CD 流水线**（2 小时）- 任务 #23

**验收标准**:

- ✅ 本地可通过 docker-compose 一键启动
- ✅ 代码提交后自动运行测试和构建
- ✅ 测试环境自动部署

---

## 📊 任务统计

### 按优先级统计

| 优先级         | 任务数量   | 预计时间        | 状态        |
|-------------|--------|-------------|-----------|
| 🔴 P0（高优先级） | 6      | 12 小时       | ⚠️ 阻塞核心功能 |
| 🟡 P1（中优先级） | 5      | 6.5 小时      | 影响用户体验    |
| 🟢 P2（低优先级） | 4      | 7 小时        | 后续优化      |
| 🧪 P3（测试）   | 6      | 14 小时       | 质量保障      |
| 🚀 P4（部署）   | 2      | 4 小时        | 生产就绪      |
| **总计**      | **23** | **43.5 小时** | -         |

### 按模块统计

| 模块     | 任务数量 | 预计时间   |
|--------|------|--------|
| 前端核心组件 | 4    | 7 小时   |
| 前端数据层  | 1    | 2 小时   |
| 前端体验优化 | 2    | 4 小时   |
| 前端性能   | 2    | 5 小时   |
| 前端测试   | 3    | 6 小时   |
| 后端 API | 1    | 3 小时   |
| 后端基础设施 | 3    | 2.5 小时 |
| 后端监控文档 | 2    | 2 小时   |
| 后端测试   | 3    | 8 小时   |
| 部署     | 2    | 4 小时   |

---

## 💡 关键提示

### 开发注意事项

1. **ID 类型一致性** ⚠️
    - 所有主键使用 BIGINT（数据库）+ String（API 传输）
    - 必须通过 IdService.nextId() 生成，禁止手动赋值
    - 前端临时 ID 使用 `temp_${Date.now()}` 格式

2. **事务管理** ⚠️
    - 涉及多表写入必须使用 TypeORM 事务（QueryRunner）
    - 批量操作使用 `Promise.allSettled` 处理部分失败

3. **错误处理** ⚠️
    - 使用 NestJS 内置异常类（BadRequestException、NotFoundException 等）
    - 前端使用 React Query 的 onError 处理错误
    - 外部服务故障时实现降级策略

4. **类型安全** ⚠️
    - 禁止使用 any，必须明确类型定义
    - DTO 使用 class-validator 装饰器校验
    - 前端使用 Zod Schema 校验表单数据

5. **命名约定** ⚠️
    - 数据库：snake_case（表名、字段名）
    - TypeScript：camelCase（变量、函数）、PascalCase（类、接口、类型）
    - 文件名：kebab-case（组件文件）、camelCase（工具函数）

---

## 📚 参考文档

### 项目文档

- [项目规划](./.claude/plan/数据周报自动化系统.md)
- [阶段 2 实施计划](./.claude/plan/阶段2-实施计划.md)
- [需求规格说明书](../数据周报自动化系统%20-%20需求规格说明书.md)
- [根级 CLAUDE.md](../CLAUDE.md)
- [后端模块文档](../backend/CLAUDE.md)
- [前端模块文档](../frontend/CLAUDE.md)

### 技术文档

- [NestJS 官方文档](https://docs.nestjs.com/)
- [React 官方文档](https://react.dev/)
- [Ant Design 组件库](https://ant.design/)
- [TypeORM 文档](https://typeorm.io/)
- [React Query 文档](https://tanstack.com/query/latest)
- [Zustand 文档](https://zustand-demo.pmnd.rs/)

---

## 🎯 下一步行动

### 立即开始（今天）

1. **前端 ActionBar 组件**（2 小时）
    - 创建 `frontend/src/components/business/ActionBar.tsx`
    - 实现生成、导出、切换侧边栏按钮
    - 集成 React Query Hooks

2. **前端 VersionSelector 组件**（2 小时）
    - 创建 `frontend/src/features/navigation/VersionSelector.tsx`
    - 实现下拉菜单和版本切换逻辑
    - 集成删除确认对话框

### 本周完成（Week 1）

- ✅ 完成第一阶段所有任务（12 小时）
- ✅ 系统基本可用，用户能完成核心流程

### 下周完成（Week 2）

- ✅ 完成第二阶段所有任务（6.5 小时）
- ✅ 用户体验显著提升

---

**文档生成时间**: 2026-01-16
**预计总工时**: 43.5 小时
**当前项目完成度**: 55%（后端 70% | 前端 30%）

---

