/**
 * 前端业务领域类型定义
 */

// 导入 Zod Schema 生成的类型
import type {DoneTaskContent, PlanTaskContent, SelfTaskContent, TaskContent,} from './schemas';

/**
 * 标签类型
 */
export type TabType = 'DONE' | 'SELF' | 'PLAN';

/**
 * 数据来源类型
 */
export type SourceType = 'JIRA' | 'SQL' | 'MANUAL';

/**
 * 状态码
 */
export type StatusCode = 'loading' | 'success' | 'normal';

/**
 * 系统指标（前端展示用）
 */
export interface Metric {
    id: string;
    key: string;
    label: string; // 显示标签，如 "总计"
    value: string;
    status: StatusCode;
}

/**
 * 报表条目（树形结构节点）
 * 支持泛型以提供更强的类型安全性
 *
 * @template TContent 任务内容类型，默认为 TaskContent 联合类型
 *
 * @example
 * ```typescript
 * // 使用默认类型
 * const item: ReportItem = { ... };
 *
 * // 使用特定类型
 * const doneItem: ReportItem<DoneTaskContent> = { ... };
 * const planItem: ReportItem<PlanTaskContent> = { ... };
 * ```
 */
export interface ReportItem<TContent = TaskContent> {
    id: string;
    tabType: TabType;
    sourceType: SourceType;
    parentId?: string;
    content: TContent; // 已解析的业务数据（使用 Zod Schema 验证）
    sortOrder: number;
    children?: ReportItem<TContent>[]; // 子节点（用于自采数据的树形结构）
}

/**
 * 特定 Tab 类型的 ReportItem 类型别名
 * 提供更精确的类型推导和类型安全
 */
export type DoneReportItem = ReportItem<DoneTaskContent>;
export type PlanReportItem = ReportItem<PlanTaskContent>;
export type SelfReportItem = ReportItem<SelfTaskContent>;

// 重新导出 Zod Schema 生成的类型，方便其他模块使用
export type {TaskContent, DoneTaskContent, PlanTaskContent, SelfTaskContent};

/**
 * 周报完整数据（前端 Store 使用）
 */
export interface Report {
    id: string;
    weekRange: string;
    weekNumber: number;
    createdAt: Date;
    metrics: Metric[];
    doneItems: ReportItem[]; // DONE 标签的条目
    selfItems: ReportItem[]; // SELF 标签的条目（树形结构）
    planItems: ReportItem[]; // PLAN 标签的条目
    notes: string; // 会议待办备注
}

/**
 * 编辑操作类型
 */
export type EditAction = 'add' | 'update' | 'delete' | 'move';

/**
 * 编辑历史记录
 */
export interface EditHistory {
    action: EditAction;
    tabType: TabType;
    itemId?: string;
    timestamp: Date;
    snapshot: Partial<ReportItem>; // 操作快照
}
