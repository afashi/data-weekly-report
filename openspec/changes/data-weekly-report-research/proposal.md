# 数据周报自动化系统 - 需求研究提案

## Context

### 用户需求

构建一套自动化数据周报管理系统,解决手工统计耗时、口径不统一及历史追溯难的问题。系统需实现多源数据(
Jira、PostgreSQL、人工录入)的自动化聚合,提供快照式的版本管理与编辑功能,并支持一键导出标准格式Excel周报。

### 技术栈

- **前端**: React 18 + Ant Design 5 + Vite 7 + TypeScript 5.3
- **后端**: NestJS 10 + TypeORM 0.3 + TypeScript 5.3
- **数据库**: SQLite (WAL模式) + PostgreSQL (外部数据源)
- **ID生成**: Snowflake算法(64位分布式ID)
- **状态管理**: Zustand 4.5 (UI状态) + React Query 5.x (服务端状态)
- **Excel处理**: ExcelJS 4.4

### 代码库现状

#### 后端数据层约束

1. **ID生成策略**: 采用Snowflake算法生成64位分布式ID,通过IdService全局单例服务提供
2. **BIGINT序列化**: 数据库层使用BIGINT存储ID,TypeScript层使用string类型,通过@Transform装饰器和BigIntToStringInterceptor全局拦截器自动序列化
3. **事务管理**: 所有多表写入操作使用TypeORM事务(dataSource.transaction),确保原子性
4. **数据库配置**: SQLite启用WAL模式(journal_mode=WAL),支持读写并发
5. **Migration管理**: 禁用synchronize自动同步,使用手动编写的Migration文件

#### 后端业务层约束

1. **周报生成流程**: 使用date-fns库计算周期(周一为起始日),并发拉取4个数据源(Promise.all),单事务写入4张表
2. **外部数据源适配**: Jira使用Basic Auth认证(超时30秒),PostgreSQL使用连接池管理(最大10连接)
3. **API设计**: 全局前缀/api,RESTful风格,双路径兼容(新路径+旧路径)
4. **配置管理**: YAML文件 + Zod Schema验证,优先级: 环境变量 > app.yaml > app.yaml.example
5. **Excel导出**: 5个Sheet页,树形数据缩进显示,文件名格式固定

#### 前端UI层约束

1. **架构模式**: 分层架构 features -> components -> hooks -> services -> types
2. **状态管理**: Zustand管理UI状态 + React Query管理服务端状态,职责清晰分离
3. **数据流**: 所有ID作为String类型处理,临时ID使用temp_前缀,后端返回idMapping映射表
4. **组件交互**: TreeTable全量提交模式,ReportTable行内编辑支持单行保存
5. **类型安全**: TypeScript严格模式,但contentJson字段存在any类型使用

---

## Requirements

### R1: ID生成与序列化约束

**场景**: 系统需要生成全局唯一的分布式ID,并确保前后端传输时不丢失精度

**约束**:

- 所有主键必须通过IdService.nextId()生成,禁止手动赋值或使用数据库自增
- 数据库层使用BIGINT类型存储,TypeScript层使用string类型
- API传输层所有BIGINT类型ID必须序列化为String(通过BigIntToStringInterceptor全局拦截器)
- 前端必须作为String类型处理所有ID,禁止使用Number类型

**验证标准**:

- 所有生成的ID格式为19位数字字符串
- API响应中所有ID字段类型为string(typeof检查)
- 前端TypeScript类型定义中所有ID字段为string类型

### R2: 事务管理与数据一致性

**场景**: 周报生成涉及4张表的写入(reports、system_metrics、report_items、meeting_notes),必须保证原子性

**约束**:

- 涉及多表写入必须使用TypeORM事务(dataSource.transaction或queryRunner)
- 周报生成必须单事务完成,失败则全部回滚
- 批量更新自采数据(SELF标签页)必须先删除旧数据再插入新数据,使用事务保证原子性

**验证标准**:

- 数据库日志显示BEGIN/COMMIT事务标记
- 异常情况下所有操作正确回滚,不留下脏数据
- 周报生成成功后4张表数据完整且reportId一致

### R3: 数据库设计规范

**场景**: 确保数据库设计符合规范,支持高效查询和数据完整性

**约束**:

- 所有表名、字段名必须使用snake_case命名
- 所有主键必须为BIGINT类型
- 外键关系必须通过@ManyToOne装饰器声明,配置{onDelete: 'CASCADE'}实现级联删除
- 关键查询字段必须创建索引(is_deleted+created_at, reportId+tabType等)
- 树形结构通过parent_id实现自关联,根节点parent_id为null

**验证标准**:

- 所有表名和字段名符合snake_case规范
- 删除report后关联的metrics、items、notes自动删除(级联删除生效)
- 索引创建成功(通过PRAGMA index_list查询验证)

### R4: 周报生成流程约束

**场景**: 自动化生成周报,整合多源数据,确保数据完整性和一致性

**约束**:

- 周期计算必须使用date-fns库,周一为起始日(weekStartsOn: 1),格式为yyyy/MM/dd-yyyy/MM/dd
- 必须并发拉取4个数据源(Promise.all): Jira DONE任务、Jira PLAN任务、BRV指标、REV指标
- 外部数据源查询失败不阻塞周报生成,返回空数组或默认值并记录警告日志
- 单事务写入4张表,失败则全部回滚

**验证标准**:

- 周期范围格式正确(yyyy/MM/dd-yyyy/MM/dd),周一为起始日
- 4个数据源并发查询,总耗时不超过单个最慢数据源的时间
- 外部数据源失败时周报仍能生成,日志记录警告信息
- 周报生成耗时<5秒

### R5: 外部数据源适配约束

**场景**: 集成Jira和PostgreSQL外部数据源,确保连接稳定和数据准确

**约束**:

- Jira API使用Basic Auth认证,超时设置为30秒,单次最多返回1000条(maxResults: 1000)
- PostgreSQL使用连接池管理(最大10连接,空闲超时30秒,连接超时5秒)
- PostgreSQL连接池必须在模块销毁时关闭(OnModuleDestroy钩子),防止连接泄漏
- 健康检查必须并发执行(Promise.all),验证Jira API、PostgreSQL连接、SQLite数据库状态

**验证标准**:

- Jira API调用成功,返回符合预期的任务数据
- PostgreSQL连接池正常工作,无连接泄漏
- 健康检查接口返回所有依赖服务的状态(status: ok)
- 健康检查响应时间<3秒

### R6: API设计规范

**场景**: 提供RESTful API供前端调用,确保接口设计规范和错误处理完善

**约束**:

- 全局前缀/api,RESTful风格(GET/POST/PUT/PATCH/DELETE)
- 双路径兼容: 新路径(符合需求规格) + 旧路径(向后兼容)
- HTTP状态码: POST返回201 CREATED, DELETE返回204 NO_CONTENT, 查询返回200 OK
- 错误处理: 使用NestJS内置异常(NotFoundException/BadRequestException),自动转换为标准HTTP错误响应
- 所有DTO必须使用class-validator装饰器验证,ValidationPipe全局启用whitelist和forbidNonWhitelisted

**验证标准**:

- 所有API路径符合RESTful规范
- 错误响应格式统一,包含statusCode、message、error字段
- DTO验证生效,发送非法参数返回400错误
- API响应时间<1秒

### R7: 配置管理约束

**场景**: 管理应用配置,支持多环境部署,确保敏感信息安全

**约束**:

- 配置文件必须通过Zod Schema验证,验证失败则应用启动失败
- 配置文件优先级: 环境变量 > app.yaml > app.yaml.example
- 敏感信息(Jira凭证、数据库密码)必须通过环境变量或加密存储,不应提交到版本控制
- 配置文件必须包含所有必需字段的默认值

**验证标准**:

- 配置文件格式错误时应用启动失败,提示明确的错误信息
- 环境变量正确覆盖配置文件中的值
- app.yaml不包含敏感信息,或已加密存储

### R8: Excel导出约束

**场景**: 基于周报数据生成标准格式Excel文件,支持树形数据格式化

**约束**:

- 必须包含5个Sheet页: 概览、本周完成、自采数据、后续计划、会议待办
- 树形数据(SELF标签页)必须缩进显示: 根节点加粗+深灰背景,子节点灰色字体+缩进
- 文件名格式固定: 数据周报_YYYYMMDD_第N周.xlsx
- 使用encodeURIComponent处理中文文件名
- 单元格必须设置边框、对齐方式、自动换行

**验证标准**:

- 生成的Excel文件包含5个Sheet页,格式符合规范
- 树形数据正确缩进显示,样式符合要求
- 文件名格式正确,中文文件名正常下载
- Excel导出耗时<10秒

### R9: 前端架构约束

**场景**: 构建清晰的前端架构,确保代码可维护性和可扩展性

**约束**:

- 分层架构: features(功能模块) -> components(UI组件) -> hooks(业务逻辑) -> services(API调用) -> types(类型定义)
- 状态管理双轨制: Zustand管理UI状态(侧边栏、加载状态) + React Query管理服务端状态(数据缓存)
- 组件命名: PascalCase,文件组织: 每个模块有index.ts统一导出
- Props类型定义: 接口名=组件名+Props后缀
- 路径别名: @/指向src目录

**验证标准**:

- 所有组件符合命名规范
- UI状态和服务端状态职责清晰分离
- 组件可复用性高,单一职责原则
- TypeScript编译无错误

### R10: 数据流约束

**场景**: 确保前后端数据流转正确,类型安全,错误处理完善

**约束**:

- 所有ID必须作为String类型处理(后端BIGINT序列化为String)
- 临时ID必须以temp_开头,后端识别并生成真实ID,返回idMapping映射表
- contentJson字段: 后端存储为JSON字符串,前端需要JSON.parse解析
- TreeTable全量提交模式: SELF标签页必须一次性提交整棵树,不支持单行保存
- React Query缓存键约定: 使用reportKeys工厂函数生成(reportKeys.detail(id)、reportKeys.lists())

**验证标准**:

- 所有ID在前端作为String类型处理,无精度丢失
- 临时ID正确映射为真实ID,树形结构parentId关联正确
- contentJson字段正确解析,无JSON.parse错误
- TreeTable全量提交成功,数据完整性保持

### R11: 组件交互约束

**场景**: 实现复杂的用户交互,确保用户体验流畅和数据一致性

**约束**:

- TreeTable全量提交: 不支持单行保存,必须一次性提交整棵树
- ReportTable行内编辑: 支持单行保存,临时ID调用onAdd,真实ID调用onSave
- 会议待办防抖保存: 500ms防抖自动保存,支持手动立即保存
- 版本切换: 无刷新重载,URL参数正确,自动跳转到最新版本
- 乐观更新: useUpdateItem使用乐观更新,失败时正确回滚

**验证标准**:

- TreeTable全量提交成功,树形结构正确
- ReportTable单行编辑保存成功,临时ID正确映射
- 会议待办自动保存生效,无数据丢失
- 版本切换流畅,无页面刷新
- 乐观更新失败时正确回滚,用户感知友好

### R12: 类型安全约束

**场景**: 确保TypeScript类型安全,减少运行时错误

**约束**:

- TypeScript严格模式: tsconfig.json启用strict、noUnusedLocals、noUnusedParameters
- 所有API响应和组件Props都有明确的TypeScript类型定义
- 禁止使用any类型,必须明确类型定义
- contentJson字段必须定义具体的业务数据类型,避免使用any

**验证标准**:

- TypeScript编译无错误和警告
- 所有API响应类型与后端DTO一致
- 无any类型使用(或已明确标注原因)
- contentJson字段有明确的类型定义

---

## Success Criteria

### 功能完整性

- [ ] 所有API端点正常响应,返回符合DTO定义的数据结构
- [ ] 周报生成功能正常,数据完整且关联正确
- [ ] 历史周报查询、编辑、删除功能正常
- [ ] Excel导出功能正常,格式符合规范
- [ ] 前端所有页面和组件正常渲染,交互流畅

### 数据一致性

- [ ] 周报生成事务成功提交,4张表数据完整且reportId一致
- [ ] 批量更新自采数据事务成功,树形结构正确
- [ ] 级联删除生效,删除report后关联数据自动删除
- [ ] 临时ID正确映射为真实ID,树形结构parentId关联正确

### ID唯一性与精度

- [ ] 所有生成的Snowflake ID全局唯一,无重复或冲突
- [ ] API响应中所有ID字段为String类型
- [ ] 前端所有ID作为String类型处理,无精度丢失

### 外部集成

- [ ] Jira API连接正常,数据拉取成功
- [ ] PostgreSQL连接正常,指标查询成功
- [ ] 健康检查接口返回所有依赖服务的状态

### 错误处理

- [ ] 外部数据源失败时不阻塞周报生成,返回默认值并记录日志
- [ ] 事务失败时正确回滚,不留下脏数据
- [ ] API错误响应格式统一,提示信息友好
- [ ] 前端错误处理完善,用户感知友好

### 性能指标

- [ ] 周报生成耗时<5秒
- [ ] 历史查询耗时<1秒
- [ ] Excel导出耗时<10秒
- [ ] 健康检查响应时间<3秒
- [ ] API响应时间<1秒
- [ ] 前端首屏加载时间<3秒

### 代码质量

- [ ] TypeScript编译无错误和警告
- [ ] ESLint无警告
- [ ] 所有组件符合命名规范
- [ ] 代码注释完善,文档齐全

---

## Dependencies

### 模块依赖关系

1. **后端数据层** → **后端业务层**: 业务层依赖数据层的实体模型、Repository、IdService
2. **后端业务层** → **前端UI层**: 前端依赖后端提供的API接口和数据格式
3. **配置管理** → **所有模块**: 所有模块依赖配置文件中的参数

### 外部依赖

1. **Jira REST API**: 周报生成依赖Jira API拉取任务数据
2. **PostgreSQL数据库**: 周报生成依赖PostgreSQL查询ETL指标
3. **SQLite数据库**: 所有数据操作依赖SQLite本地数据库
4. **第三方库**: nodejs-snowflake、date-fns、exceljs、axios、pg等

### 实施顺序建议

1. **阶段1**: 确保后端数据层约束正确实施(ID生成、事务管理、数据库配置)
2. **阶段2**: 完善后端业务层(周报生成、外部数据源适配、API设计)
3. **阶段3**: 完善前端UI层(组件开发、状态管理、数据流)
4. **阶段4**: 集成测试和性能优化
5. **阶段5**: 生产部署和监控

---

## Risks

### 风险1: 外部依赖失败

**描述**: Jira API或PostgreSQL连接失败会导致周报数据不完整

**缓解策略**:

- 外部数据源查询失败不阻塞周报生成,返回空数组或默认值
- 记录详细的警告日志,便于问题排查
- 实现健康检查接口,定期监控外部依赖状态
- 考虑实现重试机制(可选)

### 风险2: 并发写入冲突

**描述**: SQLite WAL模式支持读写并发,但写写互斥,高并发场景可能出现SQLITE_BUSY错误

**缓解策略**:

- 配置busy_timeout=5000ms,允许等待锁释放
- 监控并发写入情况,评估是否需要迁移到PostgreSQL
- 考虑实现请求队列,避免同时多个写入操作

### 风险3: ID精度丢失

**描述**: 如果前端使用Number类型处理ID,会导致精度丢失(JavaScript Number最大安全整数2^53-1)

**缓解策略**:

- 后端通过BigIntToStringInterceptor全局拦截器自动将ID序列化为String
- 前端TypeScript类型定义中所有ID字段为string类型
- 代码审查时重点检查ID类型使用

### 风险4: 内存溢出

**描述**: Excel导出大量数据时,ExcelJS会占用大量内存,可能导致Node.js进程崩溃

**缓解策略**:

- 监控Excel导出时的内存使用情况
- 考虑实现分批导出或流式导出(可选)
- 限制单次导出的数据量

### 风险5: 配置泄露

**描述**: app.yaml包含敏感信息(Jira凭证、数据库密码),需要妥善保管

**缓解策略**:

- 将app.yaml添加到.gitignore,不提交到版本控制
- 使用环境变量覆盖敏感配置
- 考虑使用加密存储或密钥管理服务(可选)

### 风险6: 时钟回拨

**描述**: 服务器时间回拨会导致Snowflake ID生成失败

**缓解策略**:

- Snowflake算法会检测时钟回拨并抛出异常
- 监控服务器时间同步状态
- 考虑实现持久化最后时间戳(可选)

### 风险7: 类型安全

**描述**: contentJson字段存在any类型使用,可能导致运行时错误

**缓解策略**:

- 定义具体的业务数据类型,替代any类型
- 实现运行时类型验证(可选)
- 代码审查时重点检查any类型使用

### 风险8: 数据不一致

**描述**: 批量更新自采数据时,如果事务回滚但前端未正确处理,可能导致前后端数据不一致

**缓解策略**:

- 使用React Query的invalidateQueries刷新缓存
- 实现乐观更新和回滚机制
- 错误处理时提示用户刷新页面

---

## User Decisions

### 已确认的决策

1. **Jira API分页处理**: ✅ **暂不实现,1000条足够**
    - 当前业务场景下任务量不会超过1000条
    - 后续如有需要再扩展分页逻辑

2. **并发周报生成**: ✅ **添加week_range唯一索引,防止重复生成**
    - 禁止同一周期重复生成周报
    - 如需重新生成,只更新部分字段(不删除重建)
    - 需要在Migration中添加UNIQUE INDEX

3. **数据保留策略**: ✅ **暂不需要自动归档,手动管理**
    - 数据量不大,暂不实现自动归档机制
    - 需要时手动删除历史数据

4. **权限控制**: ✅ **暂不需要,内网使用**
    - 系统部署在内网环境,仅内部人员访问
    - 暂不实现用户认证和授权

---

## Open Questions

### 待技术验证的问题

5. **Excel模板**: 是否需要基于模板文件生成Excel?配置中有templatePath但代码未使用
    - 最好基于模板文件生成Excel
6. **WAL模式验证**: SQLite的WAL模式是否已正确配置?需要验证并发读写性能
    - 不需要
7. **自定义字段映射**: Jira的customfield_10016/10017字段含义是否正确?需要根据实际Jira配置调整
    - 后续用户自己调整
8. **SQL查询参数**: 当前SQL查询传入当前日期($1),是否应该传入周期范围?
    - 暂时不需要
9. **错误重试机制**: 外部数据源查询失败是否需要重试?当前直接返回空数组
    - 不需要
10. **树形数据深度**: SELF标签页是否只支持两层(主任务-子任务)?代码未限制深度但Excel导出仅处理两层
- 是
11. **ReportTable删除功能**: 是否需要实现后端DELETE /api/items/:id接口?当前标记为TODO
- 是
12. **乐观更新策略**: useUpdateItem使用了乐观更新,但useUpdateManualItems没有,是否需要统一?
- 统一

---

## 附录: 探索任务详细报告

### 后端数据层探索报告

- Agent ID: a0c4b40
- 关键发现: ID生成策略、BIGINT序列化方案、事务管理模式、数据库配置、Migration管理
- 潜在风险: Migration不一致、外键约束缺失、并发写入限制、配置安全

### 后端业务层探索报告

- Agent ID: aeff0cf
- 关键发现: 周报生成流程、外部数据源适配、API设计、配置管理、Excel导出
- 潜在风险: 外部API失败、事务超时、ID精度丢失、并发写入冲突、内存溢出

### 前端UI层探索报告

- Agent ID: a82f40e
- 关键发现: 架构模式、状态管理、数据流、组件交互、类型安全
- 潜在风险: 类型安全、内存泄漏、并发冲突、ID映射丢失、缓存失效

---

**提案创建时间**: 2026-01-30
**提案状态**: 待用户确认
**下一步**: 用户确认开放问题后,进入规划阶段(/ccg:spec-plan)
