# 数据周报自动化系统 - 需求规格与测试属性

## 功能需求规格

### FR-001: 周报生成（支持更新）

**需求描述**:
系统应支持生成新周报，并允许通过overwrite参数更新现有周报。

**前置条件**:

- Jira API和PostgreSQL连接正常
- 配置文件已正确加载

**输入**:

- `weekRange` (可选): 周周期范围，格式 yyyy/MM/dd-yyyy/MM/dd
- `weekNumber` (可选): 年度周数
- `overwrite` (可选): 是否允许更新现有周报，默认false

**处理逻辑**:

1. 计算周期范围（如未提供）
2. 检查是否已存在同一week_range的周报
3. 如果存在且overwrite=false，返回409 Conflict
4. 如果存在且overwrite=true，更新现有周报
5. 如果不存在，创建新周报
6. 并发拉取4个数据源（Jira DONE、Jira PLAN、BRV指标、REV指标）
7. 单事务写入4张表（reports、system_metrics、report_items、meeting_notes）

**输出**:

- 成功：返回201 Created + 完整周报数据
- 冲突：返回409 Conflict + 错误信息
- 失败：返回500 Internal Server Error + 错误详情

**异常处理**:

- 外部数据源失败：返回空数组或默认值，记录警告日志
- 事务失败：回滚所有操作，不留下脏数据
- 唯一约束冲突：返回409错误

**性能要求**:

- 正常场景：<5秒
- 外部数据源超时：30秒
- 事务超时：10秒

---

### FR-002: 条目删除

**需求描述**:
系统应支持删除单个报表条目，并提供乐观更新的用户体验。

**前置条件**:

- 条目ID有效且存在

**输入**:

- `id`: 条目ID（String类型）

**处理逻辑**:

1. 验证条目是否存在
2. 执行软删除（设置is_deleted=true）
3. 返回204 No Content

**输出**:

- 成功：返回204 No Content
- 不存在：返回404 Not Found
- 失败：返回500 Internal Server Error

**前端交互**:

- 使用Popconfirm组件二次确认
- 乐观更新：立即从UI移除条目
- 错误回滚：恢复条目显示

---

### FR-003: Excel导出（基于模板）

**需求描述**:
系统应基于模板文件生成Excel周报，支持树形数据格式化。

**前置条件**:

- 模板文件已加载到内存
- 周报ID有效且存在

**输入**:

- `reportId`: 周报ID（String类型）

**处理逻辑**:

1. 查询周报及关联数据
2. 克隆模板工作簿
3. 填充5个Sheet页（概览、本周完成、自采数据、后续计划、会议待办）
4. 树形数据缩进显示（根节点加粗+深灰背景，子节点灰色字体+缩进）
5. 流式写入Buffer

**输出**:

- 成功：返回Excel文件流（application/vnd.openxmlformats-officedocument.spreadsheetml.sheet）
- 不存在：返回404 Not Found
- 失败：返回500 Internal Server Error

**文件命名**:

- 格式：`数据周报_YYYYMMDD_第N周.xlsx`
- 使用encodeURIComponent处理中文

**性能要求**:

- 正常场景：<10秒
- 最大行数限制：500行

---

### FR-004: 乐观更新统一

**需求描述**:
系统应统一所有编辑操作的乐观更新策略，提供一致的用户体验。

**适用场景**:

- 单行条目编辑（ReportTable）
- 批量条目更新（TreeTable）
- 条目删除
- 会议待办保存

**实施方案**:

1. 封装通用的`useOptimisticMutation` Hook
2. 统一处理onMutate（快照+取消查询+写缓存）
3. 统一处理onError（回滚）
4. 统一处理onSuccess（失效缓存）

**用户体验**:

- 操作立即生效（UI即时响应）
- 失败时自动回滚（无需手动刷新）
- 成功时显示提示（message.success）

---

### FR-005: 类型安全改进

**需求描述**:
系统应消除contentJson字段的any类型使用，提供严格的类型安全。

**实施方案**:

1. 定义Zod Schema（TaskContentSchema）
2. 使用泛型ReportItem<T>区分不同Tab的数据结构
3. 后端Entity添加@Transform自动解析JSON
4. 前端使用Zod运行时验证

**验证策略**:

- TypeScript编译时检查
- Zod运行时验证
- 单元测试覆盖

---

## 基于属性的测试 (PBT)

### PBT-001: ID生成唯一性

**属性**: 任意两次调用`IdService.nextId()`返回的ID必须不同

**不变量**: `∀ i, j ∈ [1, N], i ≠ j ⇒ id[i] ≠ id[j]`

**测试策略**:

```typescript
import fc from 'fast-check';

test('ID uniqueness property', () => {
  fc.assert(
    fc.property(fc.integer({min: 100, max: 10000}), (n) => {
      const ids = Array.from({length: n}, () => idService.nextId());
      return new Set(ids).size === ids.length;
    })
  );
});
```

**反例生成**:

- 生成大量ID（如10000个）
- 检查是否存在重复
- 如果存在重复，缩小范围找到最小反例

**边界条件**:

- 同一毫秒内生成多个ID
- 跨毫秒边界生成ID
- 时钟回拨场景

---

### PBT-002: ID生成单调性

**属性**: 后生成的ID的时间戳部分必须 ≥ 先生成的ID

**不变量**: `∀ i < j, timestamp(id[i]) ≤ timestamp(id[j])`

**测试策略**:

```typescript
test('ID monotonicity property', () => {
  fc.assert(
    fc.property(fc.integer({min: 2, max: 1000}), (n) => {
      const ids = Array.from({length: n}, () => idService.nextId());
      for (let i = 0; i < ids.length - 1; i++) {
        const ts1 = idService.parseId(ids[i]).timestamp;
        const ts2 = idService.parseId(ids[i + 1]).timestamp;
        if (ts2 < ts1) return false;
      }
      return true;
    })
  );
});
```

**反例生成**:

- 生成ID序列
- 检查是否存在逆序
- 如果存在逆序，记录时间戳差异

---

### PBT-003: 事务原子性

**属性**: 周报生成失败时，4张表都不应有数据残留

**不变量**: `transaction_failed ⇒ ∀ table ∈ {reports, metrics, items, notes}, count(table) = count_before`

**测试策略**:

```typescript
test('Transaction atomicity property', async () => {
  const beforeCounts = await countAllTables();

  await fc.assert(
    fc.asyncProperty(
      fc.record({
        weekRange: fc.string(),
        invalidData: fc.boolean()
      }),
      async (input) => {
        try {
          if (input.invalidData) {
            // 故意触发失败
            await generateReport({...input, forceError: true});
          }
        } catch (e) {
          // 预期失败
        }

        const afterCounts = await countAllTables();
        return JSON.stringify(beforeCounts) === JSON.stringify(afterCounts);
      }
    )
  );
});
```

**反例生成**:

- 随机生成输入参数
- 故意触发各种失败场景
- 检查数据库是否有残留

---

### PBT-004: BIGINT序列化往返一致性

**属性**: `serialize(deserialize(id)) === id`

**不变量**: `∀ id, JSON.parse(JSON.stringify({id})).id === id ∧ typeof id === 'string'`

**测试策略**:

```typescript
test('ID serialization round-trip property', () => {
  fc.assert(
    fc.property(fc.integer({min: 1}), (seed) => {
      const id = idService.nextId();
      const serialized = JSON.stringify({id});
      const deserialized = JSON.parse(serialized);

      return (
        deserialized.id === id &&
        typeof deserialized.id === 'string' &&
        deserialized.id.length === 19
      );
    })
  );
});
```

**反例生成**:

- 生成各种ID
- 序列化后反序列化
- 检查类型和值是否一致

---

### PBT-005: week_range唯一性

**属性**: 同一week_range只能存在一个未删除的report

**不变量**:
`∀ r1, r2 ∈ reports, r1.weekRange = r2.weekRange ∧ r1.isDeleted = false ∧ r2.isDeleted = false ⇒ r1.id = r2.id`

**测试策略**:

```typescript
test('Week range uniqueness property', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({minLength: 23, maxLength: 23}), // yyyy/MM/dd-yyyy/MM/dd
      async (weekRange) => {
        // 第一次生成
        await generateReport({weekRange});

        // 第二次生成（不带overwrite）
        try {
          await generateReport({weekRange});
          return false; // 应该抛出409错误
        } catch (e) {
          return e.status === 409;
        }
      }
    )
  );
});
```

**反例生成**:

- 随机生成week_range
- 尝试重复生成
- 检查是否正确抛出409错误

---

### PBT-006: 更新幂等性

**属性**: 使用overwrite=true重复生成同一周期，结果应该一致

**不变量**: `∀ weekRange, generate(weekRange, overwrite=true) = generate(weekRange, overwrite=true)`

**测试策略**:

```typescript
test('Update idempotency property', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({minLength: 23, maxLength: 23}),
      async (weekRange) => {
        const report1 = await generateReport({weekRange, overwrite: true});
        const report2 = await generateReport({weekRange, overwrite: true});

        return (
          report1.id === report2.id &&
          report1.weekRange === report2.weekRange
        );
      }
    )
  );
});
```

**反例生成**:

- 随机生成week_range
- 重复生成多次
- 检查ID是否一致

---

### PBT-007: 树形数据深度限制

**属性**: 所有树形数据深度必须 ≤ 2

**不变量**: `∀ tree ∈ items, maxDepth(tree) ≤ 2`

**测试策略**:

```typescript
test('Tree depth limit property', () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          id: fc.string(),
          parentId: fc.option(fc.string(), {nil: null}),
          content: fc.object()
        })
      ),
      (items) => {
        const tree = buildTree(items);
        return maxDepth(tree) <= 2;
      }
    )
  );
});

function maxDepth(nodes: TreeNode[]): number {
  if (nodes.length === 0) return 0;
  return 1 + Math.max(...nodes.map(n => maxDepth(n.children || [])));
}
```

**反例生成**:

- 随机生成树形结构
- 检查深度是否超过2
- 如果超过，缩小范围找到最小反例

---

### PBT-008: 父子一致性

**属性**: 子节点的parentId必须指向有效的父节点ID

**不变量**: `∀ item ∈ items, item.parentId ≠ null ⇒ ∃ parent ∈ items, parent.id = item.parentId`

**测试策略**:

```typescript
test('Parent-child consistency property', () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          id: fc.string(),
          parentId: fc.option(fc.string(), {nil: null}),
          content: fc.object()
        })
      ),
      (items) => {
        const itemMap = new Map(items.map(i => [i.id, i]));
        return items.every(item =>
          item.parentId === null || itemMap.has(item.parentId)
        );
      }
    )
  );
});
```

**反例生成**:

- 随机生成条目列表
- 检查是否存在悬空的parentId
- 如果存在，记录无效的parentId

---

### PBT-009: 无循环引用

**属性**: 不存在 A.parentId = B.id && B.parentId = A.id

**不变量**: `∀ A, B ∈ items, A.parentId = B.id ⇒ B.parentId ≠ A.id`

**测试策略**:

```typescript
test('No circular reference property', () => {
  fc.assert(
    fc.property(
      fc.array(
        fc.record({
          id: fc.string(),
          parentId: fc.option(fc.string(), {nil: null}),
          content: fc.object()
        })
      ),
      (items) => {
        return !hasCircularReference(items);
      }
    )
  );
});

function hasCircularReference(items: Item[]): boolean {
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(id: string): boolean {
    if (recStack.has(id)) return true; // 发现循环
    if (visited.has(id)) return false;

    visited.add(id);
    recStack.add(id);

    const item = items.find(i => i.id === id);
    if (item?.parentId) {
      if (dfs(item.parentId)) return true;
    }

    recStack.delete(id);
    return false;
  }

  return items.some(item => dfs(item.id));
}
```

**反例生成**:

- 随机生成条目列表
- 检查是否存在循环引用
- 如果存在，记录循环路径

---

### PBT-010: 外部数据源容错

**属性**: 外部数据源失败不应阻塞周报生成

**不变量**: `∀ source ∈ {jira, postgresql}, source_failed ⇒ report_generated ∧ source_data = []`

**测试策略**:

```typescript
test('External source fault tolerance property', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        jiraFails: fc.boolean(),
        pgFails: fc.boolean()
      }),
      async (failures) => {
        // 模拟外部数据源失败
        mockJiraAdapter.fetchDoneTasks.mockImplementation(() => {
          if (failures.jiraFails) throw new Error('Jira failed');
          return Promise.resolve([]);
        });

        mockSqlAdapter.fetchBrvMetrics.mockImplementation(() => {
          if (failures.pgFails) throw new Error('PG failed');
          return Promise.resolve([]);
        });

        // 周报应该仍然能生成
        const report = await generateReport({});
        return report.id !== null && report.id !== undefined;
      }
    )
  );
});
```

**反例生成**:

- 随机模拟各种失败场景
- 检查周报是否仍能生成
- 如果失败，记录失败原因

---

## 验收标准

### 功能完整性

- [ ] 所有FR需求已实现
- [ ] 所有API端点正常响应
- [ ] 前端所有页面和组件正常渲染

### 属性验证

- [ ] 所有PBT属性测试通过
- [ ] 无反例生成
- [ ] 边界条件覆盖完整

### 性能指标

- [ ] 周报生成耗时<5秒
- [ ] Excel导出耗时<10秒
- [ ] API响应时间<1秒

### 代码质量

- [ ] TypeScript编译无错误
- [ ] ESLint无警告
- [ ] 测试覆盖率>80%

---

**文档版本**: V1.0
**创建时间**: 2026-01-30
**维护者**: AI Assistant
