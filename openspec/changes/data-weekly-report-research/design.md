# 数据周报自动化系统 - 技术设计文档

## 架构决策记录 (ADR)

### ADR-001: 周报生成保持同步模式

**决策**: 保持HTTP同步响应，不引入消息队列

**理由**:

- 当前业务场景下5秒耗时可接受
- 避免引入消息队列的架构复杂度
- 简化运维和部署

**实施**:

- 前端添加步骤进度条反馈（Jira抓取 → 数据清洗 → 报告生成）
- 后端优化事务性能（读聚合+写入两阶段）
- 设置合理的HTTP超时时间（30秒）

**权衡**:

- 优点：架构简单，易于调试
- 缺点：无法处理超长耗时场景，扩展性受限

---

### ADR-002: Excel导出保持同步模式

**决策**: 保持同步导出，不实现异步任务

**理由**:

- 当前10秒耗时勉强可接受
- 避免实现任务队列和轮询机制
- 数据量可控，不会出现超大文件

**实施**:

- 前端添加Loading提示和进度反馈
- 后端使用流式写入优化内存占用
- 限制单次导出最大行数（如500行）

**权衡**:

- 优点：实现简单，用户体验直观
- 缺点：大数据量时可能超时或内存溢出

---

### ADR-003: 暂不引入Redis缓存层

**决策**: 暂不引入Redis，后续根据性能评估决定

**理由**:

- 当前数据量不大，SQLite性能足够
- 避免增加Redis依赖和缓存一致性复杂度
- 内网环境，并发量可控

**实施**:

- 优化数据库索引，提升查询性能
- 使用React Query的客户端缓存
- 监控数据库查询性能，设定阈值

**权衡**:

- 优点：架构简单，无缓存一致性问题
- 缺点：高并发场景下数据库可能成为瓶颈

---

### ADR-004: 允许同一周期更新周报

**决策**: 支持overwrite=true参数，允许更新现有周报

**理由**:

- 用户可能需要重新生成周报（数据源更新）
- 避免强制删除旧版本的繁琐操作
- 保留历史版本的审计需求

**实施**:

- 添加week_range唯一索引
- 默认拒绝重复生成（返回409）
- 提供overwrite=true参数，更新现有周报
- 记录更新时间和操作日志

**权衡**:

- 优点：用户体验更好，灵活性高
- 缺点：需要处理更新逻辑，增加复杂度

---

## 技术实施方案

### 1. 唯一约束实现

**数据库层**:

```sql
-- Migration: 添加week_range唯一索引
CREATE UNIQUE INDEX idx_reports_week_range_unique
ON reports(week_range)
WHERE is_deleted = false;
```

**实体层**:

```typescript
@Entity({name: 'reports'})
@Index('idx_reports_week_range_unique', ['weekRange'], {
    unique: true,
    where: 'is_deleted = false'
})
export class ReportEntity extends BaseIdEntity {
    @Column({name: 'week_range', type: 'varchar', length: 32})
    weekRange: string;
    // ...
}
```

**服务层**:

```typescript
async
generateReport(dto
:
GenerateReportDto
):
Promise < ReportResponseDto > {
    const {weekRange, overwrite} = dto;

    // 检查是否已存在
    const existing = await this.reportRepository.findOne({
        where: {weekRange, isDeleted: false}
    });

    if(existing && !overwrite
)
{
    throw new ConflictException(`周报已存在: ${weekRange}`);
}

if (existing && overwrite) {
    // 更新模式：保留ID，更新数据
    return this.updateReport(existing.id, weekRange);
}

// 新建模式：创建新周报
return this.createReport(weekRange);
}
```

---

### 2. 事务优化方案

**两阶段提交**:

```typescript
async
generateReport(dto
:
GenerateReportDto
):
Promise < ReportResponseDto > {
    // 阶段1：读聚合（无事务）
    const [jiraDone, jiraPlan, brvMetrics, revMetrics] = await Promise.all([
        this.jiraAdapter.fetchDoneTasks(),
        this.jiraAdapter.fetchPlanTasks(),
        this.sqlAdapter.fetchBrvMetrics(),
        this.sqlAdapter.fetchRevMetrics()
    ]);

    // 阶段2：写入（短事务）
    return await this.dataSource.transaction(async (manager) => {
        const reportId = this.idService.nextId();

        // 批量插入优化
        await manager.insert(ReportEntity, {...});
        await manager.insert(SystemMetricEntity, metricsArray);
        await manager.insert(ReportItemEntity, itemsArray);
        await manager.insert(MeetingNoteEntity, {...});

        return this.buildResponse(reportId);
    });
}
```

---

### 3. Excel模板处理

**模板缓存**:

```typescript
@Injectable()
export class ExcelService {
    private templateBuffer: Buffer;

    async onModuleInit() {
        // 启动时加载模板到内存
        const templatePath = this.config.excel.templatePath;
        this.templateBuffer = await fs.readFile(templatePath);
    }

    async exportReport(reportId: string): Promise<Buffer> {
        // 克隆模板工作簿
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(this.templateBuffer);

        // 填充数据
        const sheet1 = workbook.getWorksheet('本周完成');
        // ... 填充逻辑

        // 流式写入
        const buffer = await workbook.xlsx.writeBuffer();
        return buffer;
    }
}
```

---

### 4. 删除功能实现

**后端API**:

```typescript
@Delete('items/:id')
@HttpCode(HttpStatus.NO_CONTENT)
async
deleteItem(@Param('id')
id: string
):
Promise < void > {
    const item = await this.itemRepository.findOne({
        where: {id: id as any}
    });

    if(!
item
)
{
    throw new NotFoundException(`条目不存在: ${id}`);
}

// 软删除（推荐）
await this.itemRepository.softRemove(item);

// 或硬删除
// await this.itemRepository.remove(item);
}
```

**前端交互**:

```typescript
const useDeleteItem = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => ItemAPI.deleteItem(id),
        onMutate: async (id) => {
            // 乐观更新：立即从UI移除
            await queryClient.cancelQueries({queryKey: reportKeys.detail(reportId)});
            const previous = queryClient.getQueryData(reportKeys.detail(reportId));

            queryClient.setQueryData(reportKeys.detail(reportId), (old) => ({
                ...old,
                items: old.items.filter(item => item.id !== id)
            }));

            return {previous};
        },
        onError: (err, id, context) => {
            // 回滚
            queryClient.setQueryData(reportKeys.detail(reportId), context.previous);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: reportKeys.detail(reportId)});
        }
    });
};
```

---

### 5. 乐观更新统一方案

**通用Hook封装**:

```typescript
function useOptimisticMutation<TData, TVariables>({
                                                      mutationFn,
                                                      queryKey,
                                                      updateCacheFn
                                                  }: {
    mutationFn: (variables: TVariables) => Promise<TData>;
    queryKey: QueryKey;
    updateCacheFn: (oldData: any, variables: TVariables) => any;
}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn,
        onMutate: async (variables) => {
            await queryClient.cancelQueries({queryKey});
            const previous = queryClient.getQueryData(queryKey);

            queryClient.setQueryData(queryKey, (old) =>
                updateCacheFn(old, variables)
            );

            return {previous};
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(queryKey, context.previous);
            message.error('操作失败，已回滚');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey});
            message.success('操作成功');
        }
    });
}
```

**使用示例**:

```typescript
const useUpdateItem = (reportId: string) => {
    return useOptimisticMutation({
        mutationFn: ({id, data}) => ItemAPI.updateItem(id, data),
        queryKey: reportKeys.detail(reportId),
        updateCacheFn: (old, {id, data}) => ({
            ...old,
            items: old.items.map(item =>
                item.id === id ? {...item, ...data} : item
            )
        })
    });
};
```

---

### 6. 类型安全改进

**Zod Schema定义**:

```typescript
// 定义严格的业务数据Schema
const TaskContentSchema = z.object({
    taskName: z.string(),
    jiraNumber: z.string().optional(),
    duration: z.number().optional(),
    prodStatus: z.string().optional(),
    verifyStatus: z.string().optional(),
    reviewStatus: z.string().optional(),
    owner: z.string().optional(),
    remark: z.string().optional()
});

type TaskContent = z.infer<typeof TaskContentSchema>;

// 替代原有的any类型
interface ReportItem<T = TaskContent> {
    id: string;
    reportId: string;
    tabType: 'DONE' | 'SELF' | 'PLAN';
    sourceType: 'JIRA' | 'SQL' | 'MANUAL';
    parentId: string | null;
    content: T; // 不再是any
    sortOrder: number;
}
```

**运行时验证**:

```typescript
// 后端DTO验证
export class UpdateItemDto {
    @IsString()
    @ValidateNested()
    @Type(() => TaskContentDto)
    content: TaskContentDto;
}

// 前端解析验证
const parseContent = (contentJson: string): TaskContent => {
    const parsed = JSON.parse(contentJson);
    return TaskContentSchema.parse(parsed); // 运行时验证
};
```

---

## 数据库Schema变更

### Migration: 添加唯一索引

```sql
-- 1. 添加week_range唯一索引
CREATE UNIQUE INDEX idx_reports_week_range_unique
ON reports(week_range)
WHERE is_deleted = false;

-- 2. 添加items表的软删除字段（如果需要）
ALTER TABLE report_items ADD COLUMN is_deleted BOOLEAN DEFAULT false;

-- 3. 优化查询索引
CREATE INDEX idx_report_items_report_tab_deleted
ON report_items(report_id, tab_type, is_deleted);
```

---

## API变更

### 新增/修改的API端点

1. **生成周报（支持overwrite）**
    - `POST /api/reports/generate`
    - Body: `{weekRange?: string, weekNumber?: number, overwrite?: boolean}`
    - Response: `ReportResponseDto`

2. **删除条目**
    - `DELETE /api/items/:id`
    - Response: `204 No Content`

3. **健康检查（增强）**
    - `GET /api/generate/health`
    - Response: 包含各数据源的详细状态

---

## 前端组件变更

### 1. 进度反馈组件

```typescript
// 周报生成进度条
const GenerateProgress = () => {
    const [current, setCurrent] = useState(0);

    const steps = [
        {title: 'Jira抓取', description: '获取任务数据'},
        {title: '数据清洗', description: '标准化处理'},
        {title: '报告生成', description: '写入数据库'}
    ];

    return <Steps current = {current}
    items = {steps}
    />;
};
```

### 2. 删除确认组件

```typescript
// 删除条目确认
const DeleteButton = ({itemId, onDelete}) => {
    return (
        <Popconfirm
            title = "确认删除"
    description = "删除后无法恢复，确定要删除吗？"
    onConfirm = {()
=>
    onDelete(itemId)
}
    okText = "确认"
    cancelText = "取消"
        >
        <Button danger
    icon = { < DeleteOutlined / >
}
    />
    < /Popconfirm>
)
    ;
};
```

---

## 测试策略

### 单元测试

1. **IdService测试**
    - ID唯一性测试（生成1000个ID，检查无重复）
    - ID单调性测试（后生成的ID ≥ 先生成的ID）
    - ID格式测试（19位数字字符串）

2. **GenerateService测试**
    - 事务回滚测试（失败时无数据残留）
    - 唯一约束测试（重复生成返回409）
    - overwrite测试（更新现有周报）

3. **ExcelService测试**
    - 模板加载测试
    - 数据填充测试
    - 树形数据格式化测试

### 集成测试

1. **完整周报生成流程**
    - 正常生成 → 验证4张表数据
    - 重复生成 → 验证409错误
    - overwrite生成 → 验证数据更新

2. **删除功能测试**
    - 删除条目 → 验证软删除标记
    - 乐观更新 → 验证UI立即响应
    - 错误回滚 → 验证数据恢复

### 性能测试

1. **周报生成性能**
    - 目标：<5秒
    - 测试场景：100条Jira任务 + 50条数据库指标

2. **Excel导出性能**
    - 目标：<10秒
    - 测试场景：500行数据 + 树形结构

3. **并发测试**
    - SQLite并发写入测试
    - 验证WAL模式配置

---

## 部署清单

### 环境变量

```bash
# 数据库配置
DATABASE_PATH=./data/weekly-report.sqlite

# Jira配置
JIRA_BASE_URL=https://jira.example.com
JIRA_USERNAME=your-username
JIRA_API_TOKEN=your-token

# PostgreSQL配置
PG_BRV_HOST=localhost
PG_BRV_PORT=5432
PG_BRV_DATABASE=brv_db
PG_BRV_USERNAME=postgres
PG_BRV_PASSWORD=password

# Excel模板路径
EXCEL_TEMPLATE_PATH=./templates/weekly-report-template.xlsx
```

### 依赖检查

- [ ] Node.js >= 18.0.0
- [ ] npm >= 9.0.0
- [ ] SQLite3 (WAL模式支持)
- [ ] PostgreSQL客户端库
- [ ] Excel模板文件

### 数据库初始化

```bash
# 运行Migration
npm run migration:run

# 验证索引创建
sqlite3 data/weekly-report.sqlite "PRAGMA index_list('reports');"
```

---

**文档版本**: V1.0
**创建时间**: 2026-01-30
**维护者**: AI Assistant
