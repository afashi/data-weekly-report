/**
 * 前端业务领域类型定义
 */

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
 */
export interface ReportItem {
    id: string;
    tabType: TabType;
    sourceType: SourceType;
    parentId?: string;
    content: TaskContent; // 已解析的业务数据
    sortOrder: number;
    children?: ReportItem[]; // 子节点（用于自采数据的树形结构）
}

/**
 * 任务内容（业务数据）
 */
export interface TaskContent {
    jiraKey: string; // Jira 号
    title: string; // 任务名称
    status: string; // 状态
    assignee: string; // 负责人
    storyPoints?: number; // 工作量
    workDays?: number; // 工期（天）
    devStatus?: string; // 开发环境状态
    testStatus?: string; // 测试环境状态
    verifyStatus?: string; // 验证环境状态
    reviewStatus?: string; // 评审环境状态
    prodStatus?: string; // 生产环境状态
    [key: string]: any; // 支持扩展
}

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
