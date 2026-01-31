# 数据周报自动化系统 - 实施任务清单

## 任务概览

本文档定义了零决策的实施任务，每个任务都是机械可执行的。

**总任务数**: 27个
**预计工期**: 5个阶段

---

## 阶段1：数据库层改造 (3个任务)

### Task-001: 创建Migration添加week_range唯一索引

- [x] 创建Migration文件
- [x] 添加唯一索引SQL
- [x] 运行Migration验证

### Task-002: 更新ReportEntity添加唯一索引装饰器

- [x] 添加@Index装饰器
- [x] TypeScript编译验证

### Task-003: 添加report_items表的is_deleted字段

- [x] 创建Migration文件
- [x] 添加字段和索引
- [x] 运行Migration验证

---

## 阶段2：后端业务层实现 (6个任务)

### Task-004: GenerateService添加overwrite参数支持

- [x] 更新GenerateReportDto
- [x] 添加@IsBoolean验证

### Task-005: 实现重复生成检查和更新逻辑

- [x] 添加existing检查
- [x] 实现overwrite逻辑
- [x] 单元测试覆盖

### Task-006: 优化事务性能

- [x] 重构为两阶段提交
- [x] 性能测试<5秒

### Task-007: ExcelService实现模板缓存和流式写入

- [x] 添加模板缓存
- [x] 实现流式写入
- [x] 导出测试<10秒

### Task-008: ItemsController添加DELETE接口

- [x] 添加DELETE端点
- [x] API测试返回204

### Task-009: ItemsService实现软删除逻辑

- [x] 实现deleteItem方法
- [x] 单元测试覆盖

---

## 阶段3：前端UI层改造 (8个任务)

### Task-010: 封装useOptimisticMutation通用Hook

- [x] 创建通用Hook文件
- [x] TypeScript编译通过

### Task-011: 重构useUpdateItem使用通用Hook

- [x] 使用useOptimisticMutation重构
- [x] 功能测试通过

### Task-012: 重构useUpdateManualItems使用通用Hook

- [x] 使用useOptimisticMutation重构
- [x] 功能测试通过

### Task-013: 实现useDeleteItem Hook

- [x] 创建删除Hook
- [x] 功能测试通过

### Task-014: ReportTable添加删除按钮和Popconfirm

- [x] 添加删除按钮
- [x] UI测试通过

### Task-015: 定义Zod Schema替代TaskContent的any类型

- [x] 创建Zod Schema
- [x] TypeScript编译通过

### Task-016: 更新ReportItem类型定义使用泛型

- [x] 使用泛型定义
- [x] TypeScript编译通过

### Task-017: 添加周报生成进度条组件

- [x] 创建进度条组件
- [x] UI测试通过

---

## 阶段4：测试实施 (5个任务)

### Task-018: 编写IdService单元测试

- [x] 测试ID唯一性
- [x] 测试ID单调性
- [x] 测试通过

### Task-019: 编写GenerateService单元测试

- [x] 测试事务回滚
- [x] 测试唯一约束
- [x] 测试overwrite
- [x] 测试通过

### Task-020: 编写ExcelService单元测试

- [x] 测试模板加载
- [x] 测试数据填充
- [x] 测试通过

### Task-021: 编写PBT属性测试

- [x] 使用fast-check编写
- [x] 测试通过

### Task-022: 编写集成测试

- [x] 测试完整流程
- [x] 测试通过

---

## 阶段5：部署准备 (5个任务)

### Task-023: 更新环境变量配置

- [x] 添加EXCEL_TEMPLATE_PATH
- [x] 配置文件完整

### Task-024: 准备Excel模板文件

- [x] 创建Excel模板
- [x] 模板文件存在

### Task-025: 运行Migration初始化数据库

- [x] 运行migration:run
- [x] 所有Migration成功

### Task-026: 验证WAL模式配置

- [x] 检查journal_mode
- [x] 返回WAL

### Task-027: 性能测试和优化

- [x] 周报生成<5秒
- [x] Excel导出<10秒
- [x] API响应<1秒

---

**文档版本**: V1.0
**创建时间**: 2026-01-30
**维护者**: AI Assistant
