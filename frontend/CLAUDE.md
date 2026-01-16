[根目录](../CLAUDE.md) > **frontend**

---

# Frontend 模块文档

> **模块路径**: `frontend/`
> **职责**: 前端应用 - 周报编辑、可视化展示、Excel 导出
> **技术栈**: React 18 + Ant Design 5.x + Vite 7.x + TypeScript
> **状态**: 🟡 30% 完成

---

## 变更记录 (Changelog)

### 2026-01-16
- 初始化模块文档
- 完成基础架构搭建（Vite + React + Ant Design）
- 完成状态管理配置（Zustand + React Query）
- 完成 API 服务层封装

---

## 模块职责

Frontend 模块是数据周报自动化系统的用户界面层，负责：

1. **周报展示**：可视化展示周报数据（指标卡片、表格）
2. **交互编辑**：支持行内编辑、树形编辑、会议待办编辑
3. **版本管理**：历史版本切换、删除
4. **数据同步**：与后端 API 交互，实时保存与加载
5. **Excel 导出**：触发后端导出并下载文件

---

## 入口与启动

### 主入口文件
- **文件**: `src/main.tsx`
- **端口**: 5173（Vite 默认）
- **全局配置**:
  - React Query：数据缓存与同步
  - Ant Design：中文语言包 + 主题配置
  - React Router：路由管理
  - dayjs：日期处理（中文环境）

### 启动命令
```bash
# 开发模式（热重载）
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview

# 类型检查
npm run type-check

# 代码检查
npm run lint
```

### 访问地址
- 开发环境：http://localhost:5173
- 生产环境：需配置 Nginx 或其他静态文件服务器

---

## 对外接口

### 路由定义

| 路径 | 组件 | 说明 | 状态 |
|------|------|------|------|
| `/` | MainLayout | 根路径，重定向到 `/latest` | ✅ 完成 |
| `/latest` | LatestReportResolver | 自动解析最新周报 | ❌ 待实现 |
| `/reports/:reportId` | ReportPage | 周报详情页 | ❌ 待实现 |
| `*` | NotFound | 404 页面 | ❌ 待实现 |

### 组件结构（规划）

```
src/
├── App.tsx                          # 路由配置
├── main.tsx                         # 应用入口
├── components/
│   ├── layout/
│   │   └── MainLayout.tsx           # 主布局（Header + Content + Drawer）
│   ├── common/
│   │   ├── Loading.tsx              # 加载组件
│   │   └── ErrorFallback.tsx        # 错误边界
│   └── business/
│       ├── MetricCard.tsx           # 指标卡片
│       ├── StackedProgress.tsx      # 堆叠进度条
│       ├── VersionSelector.tsx      # 版本选择器
│       ├── ReportTable.tsx          # 报表表格（DONE/PLAN）
│       ├── TreeTable.tsx            # 树形表格（SELF）
│       └── MeetingSidebar.tsx       # 会议待办侧边栏
├── features/
│   ├── report/
│   │   ├── ReportPage.tsx           # 周报详情页
│   │   ├── MetricDashboard.tsx      # 指标看板
│   │   └── TabEditor.tsx            # Tab 编辑器
│   ├── sidebar/
│   │   └── MeetingNotes.tsx         # 会议待办
│   └── navigation/
│       └── HeaderActions.tsx        # 顶部操作栏
├── services/
│   ├── generate-api.ts              # 周报生成 API
│   ├── report-api.ts                # 周报查询 API（待实现）
│   ├── item-api.ts                  # 条目编辑 API（待实现）
│   └── export-api.ts                # Excel 导出 API（待实现）
├── store/
│   └── uiStore.ts                   # UI 状态管理（Zustand）
├── hooks/
│   ├── use-generate.ts              # 生成周报 Hook
│   ├── use-report.ts                # 查询周报 Hook（待实现）
│   └── use-edit-item.ts             # 编辑条目 Hook（待实现）
├── types/
│   ├── api.ts                       # API 类型定义
│   ├── report.ts                    # 业务领域类型
│   └── index.ts                     # 类型导出
└── lib/
    ├── axios.ts                     # Axios 实例配置
    └── queryClient.ts               # React Query 配置
```

---

## 关键依赖与配置

### 核心依赖
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.22.0",
  "antd": "^5.13.3",
  "@ant-design/icons": "^5.2.6",
  "@tanstack/react-query": "^5.18.1",
  "zustand": "^4.5.0",
  "axios": "^1.6.5",
  "dayjs": "^1.11.10",
  "immer": "^10.0.3",
  "use-immer": "^0.9.0",
  "zod": "^3.22.4"
}
```

### Vite 配置
**文件**: `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

### Ant Design 主题配置
**文件**: `src/main.tsx`

```typescript
<ConfigProvider
  locale={zhCN}
  theme={{
    token: {
      colorPrimary: '#1677ff',
      borderRadius: 8,
      fontSize: 14,
    },
    components: {
      Table: {
        headerBg: '#fafafa',
        rowHoverBg: '#f5f7fa',
      },
      Card: {
        headerBg: 'transparent',
      },
    },
  }}
>
  <App />
</ConfigProvider>
```

### React Query 配置
**文件**: `src/lib/queryClient.ts`

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 分钟
      cacheTime: 10 * 60 * 1000,     // 10 分钟
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

---

## 数据模型

### 前端类型定义

**Report（周报完整数据）**:
```typescript
interface Report {
  id: string;
  weekRange: string;
  weekNumber: number;
  createdAt: Date;
  metrics: Metric[];
  doneItems: ReportItem[];
  selfItems: ReportItem[];
  planItems: ReportItem[];
  notes: string;
}
```

**Metric（系统指标）**:
```typescript
interface Metric {
  id: string;
  key: string;
  label: string;
  value: string;
  status: 'loading' | 'success' | 'normal';
}
```

**ReportItem（报表条目）**:
```typescript
interface ReportItem {
  id: string;
  tabType: 'DONE' | 'SELF' | 'PLAN';
  sourceType: 'JIRA' | 'SQL' | 'MANUAL';
  parentId?: string;
  content: TaskContent;
  sortOrder: number;
  children?: ReportItem[];  // 树形结构
}
```

**TaskContent（任务内容）**:
```typescript
interface TaskContent {
  jiraKey: string;
  title: string;
  status: string;
  assignee: string;
  storyPoints?: number;
  workDays?: number;
  devStatus?: string;
  testStatus?: string;
  verifyStatus?: string;
  reviewStatus?: string;
  prodStatus?: string;
  [key: string]: any;
}
```

---

## 测试与质量

### 当前状态
- ❌ 单元测试：未实施
- ❌ 组件测试：未实施
- ❌ E2E 测试：未实施
- ✅ 手动测试：基础布局验证

### 测试计划

**组件测试**（优先级：高）:
```bash
# 待添加测试文件
src/components/business/MetricCard.test.tsx
src/components/business/StackedProgress.test.tsx
src/components/business/ReportTable.test.tsx
src/components/business/TreeTable.test.tsx
```

**Hook 测试**（优先级：中）:
```bash
src/hooks/use-generate.test.ts
src/hooks/use-report.test.ts
src/hooks/use-edit-item.test.ts
```

**E2E 测试**（优先级：低）:
- 完整周报生成流程
- 编辑与保存流程
- Excel 导出验证

### 代码质量工具
- **ESLint**: 已配置（React + TypeScript 规则）
- **TypeScript**: 严格模式（`tsconfig.json`）
- **Prettier**: 待配置

---

## 常见问题 (FAQ)

### Q1: 如何添加新的 API 调用？
**A**:
1. 在 `src/services/` 创建新的 API 服务类
2. 在 `src/types/api.ts` 添加请求/响应类型
3. 在 `src/hooks/` 创建对应的 React Query Hook

### Q2: 如何管理全局状态？
**A**:
- **UI 状态**（侧边栏开关、加载状态）：使用 Zustand（`src/store/uiStore.ts`）
- **服务端状态**（周报数据、列表数据）：使用 React Query

### Q3: 如何处理表格编辑？
**A**:
- **行内编辑**：使用 Ant Design Table 的 `editable` 属性
- **失焦保存**：监听 `onBlur` 事件，调用 API 更新
- **乐观更新**：使用 React Query 的 `optimisticUpdate` 模式

### Q4: 如何实现树形表格？
**A**:
- 使用 Ant Design Table 的 `expandable` 属性
- 数据结构需包含 `children` 字段
- 使用 `defaultExpandAllRows` 控制默认展开状态

### Q5: 如何处理大数据量表格？
**A**:
- 使用虚拟滚动（`rc-virtual-list`）
- 分页加载（Ant Design Table 内置分页）
- 懒加载子节点（树形表格）

---

## 相关文件清单

### 核心文件
```
src/
├── main.tsx                         # 应用入口
├── App.tsx                          # 路由配置
├── index.css                        # 全局样式
├── components/
│   └── layout/
│       └── MainLayout.tsx           # 主布局（已完成）
├── services/
│   ├── generate-api.ts              # 周报生成 API（已完成）
│   ├── http-client.ts               # HTTP 客户端（已完成）
│   └── index.ts                     # 服务导出
├── store/
│   └── uiStore.ts                   # UI 状态管理（已完成）
├── hooks/
│   ├── use-generate.ts              # 生成周报 Hook（已完成）
│   └── index.ts                     # Hook 导出
├── types/
│   ├── api.ts                       # API 类型定义（已完成）
│   ├── report.ts                    # 业务类型定义（已完成）
│   └── index.ts                     # 类型导出
└── lib/
    ├── axios.ts                     # Axios 配置（已完成）
    └── queryClient.ts               # React Query 配置（已完成）
```

### 配置文件
```
vite.config.ts                       # Vite 配置
tsconfig.json                        # TypeScript 配置
tsconfig.node.json                   # Node 环境 TS 配置
package.json                         # 依赖管理
index.html                           # HTML 模板
```

---

## 架构设计亮点

### 1. 状态管理分层
- **UI 状态**：Zustand（轻量、简单）
- **服务端状态**：React Query（缓存、同步、乐观更新）
- **表单状态**：Ant Design Form（内置状态管理）

### 2. API 服务层封装
- 统一的 Axios 实例配置
- 请求/响应拦截器（错误处理、Token 注入）
- 类型安全的 API 调用

### 3. 组件设计原则
- **原子化**：common 组件可复用
- **业务化**：business 组件封装业务逻辑
- **特性化**：features 组件组合业务组件

### 4. 类型安全
- 前后端类型定义一致
- Zod 校验 API 响应
- TypeScript 严格模式

### 5. 性能优化
- React Query 缓存减少请求
- 虚拟滚动处理大数据量
- 懒加载路由组件

---

## UI 设计规范

### 主题色彩
- **主色**：#1677ff（清爽蓝）
- **成功色**：#52c41a（绿色）
- **警告色**：#faad14（橙色）
- **错误色**：#ff4d4f（红色）
- **背景色**：#f5f5f5（浅灰）

### 字体规范
- **中文字体**：PingFang SC / Microsoft YaHei
- **英文字体**：-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto
- **字号**：14px（正文）、16px（标题）、12px（辅助）

### 间距规范
- **小间距**：8px
- **中间距**：16px
- **大间距**：24px
- **超大间距**：32px

### 组件样式
- **卡片圆角**：8px
- **按钮圆角**：8px
- **表格行高**：48px
- **表头背景**：#fafafa

---

## 待实现功能清单

### 高优先级
- [ ] 版本选择器组件（VersionSelector）
- [ ] 指标看板（MetricDashboard）
  - [ ] 业务量卡片（双色堆叠进度条）
  - [ ] 验证环境 ETL 卡片
  - [ ] 复盘环境 ETL 卡片
- [ ] Tab 编辑器（TabEditor）
  - [ ] DONE 标签（二维表格 + 行内编辑）
  - [ ] SELF 标签（树形表格 + 全量提交）
  - [ ] PLAN 标签（二维表格 + 行内编辑）
- [ ] 会议待办侧边栏（MeetingSidebar）

### 中优先级
- [ ] 历史版本列表页
- [ ] 周报详情页路由解析
- [ ] Excel 导出功能
- [ ] 错误边界与友好提示
- [ ] 加载状态优化

### 低优先级
- [ ] 暗色主题支持
- [ ] 快捷键支持
- [ ] 数据导入功能
- [ ] 打印样式优化

---

## 性能优化建议

### 已实施
- ✅ React Query 缓存（5 分钟 staleTime）
- ✅ Vite 开发服务器（快速热重载）
- ✅ 路径别名（`@` 指向 `src`）

### 待优化
- [ ] 路由懒加载（React.lazy + Suspense）
- [ ] 虚拟滚动（大表格）
- [ ] 图片懒加载
- [ ] 代码分割（Vite 自动分割）
- [ ] CDN 加速（生产环境）

---

## 用户体验优化

### 已实施
- ✅ 中文语言包（Ant Design + dayjs）
- ✅ 主题配置（清爽蓝主色）
- ✅ 响应式布局（Grid 栅格）

### 待优化
- [ ] 骨架屏（Skeleton）
- [ ] 空状态提示（Empty）
- [ ] 操作反馈（Message、Notification）
- [ ] 表单校验提示
- [ ] 快捷键提示

---

## 浏览器兼容性

### 支持的浏览器
- Chrome >= 90
- Firefox >= 88
- Safari >= 14
- Edge >= 90

### 不支持的浏览器
- IE 11 及以下（React 18 不支持）

---

**文档生成时间**: 2026-01-16
**模块覆盖率**: 约 80%（基础架构已完成，业务组件待开发）
