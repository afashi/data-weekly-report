/**
 * 数据周报自动化系统 - 类型定义
 * 与后端 API 响应格式保持一致（camelCase）
 */

export type ReportStatus = 'loading' | 'success' | 'normal';

export type TabType = 'DONE' | 'SELF' | 'PLAN';

export type SourceType = 'JIRA' | 'SQL' | 'MANUAL';

/**
 * 报告主数据
 */
export interface Report {
    id: string;
    weekRange: string; // 后端 Entity 属性：weekRange
    weekNumber: number; // 后端 Entity 属性：weekNumber
    createdAt: string; // 后端 Entity 属性：createdAt
    isDeleted: boolean; // 后端 Entity 属性：isDeleted
}

/**
 * 系统指标
 */
export interface SystemMetric {
    id: string;
    reportId: string; // 后端 Entity 属性：reportId
    metricKey: 'TOTAL_COUNT' | 'PROCESS_COUNT' | 'MANUAL_COUNT' | 'VERIFY_ETL' | 'REVIEW_ETL';
    metricValue: string; // 后端 Entity 属性：metricValue
    statusCode: ReportStatus; // 后端 Entity 属性：statusCode
}

/**
 * 报表条目内容（JSON 结构）
 */
export interface ReportItemContent {
    // 通用字段
    jiraKey?: string; // Jira号
    taskName: string; // 任务名称
    dimension?: string; // 维度
    status?: string; // 状态/进度
    owner?: string; // 负责人
    eta?: string; // 预计工期
    actualDoneAt?: string; // 完成时间
    envProdStatus?: string; // 生产环境状态
    envVerifyStatus?: string; // 验证环境状态
    envReviewStatus?: string; // 复盘环境状态
    remark?: string; // 备注

    // 自采数据特定字段
    nodeType?: 'ROOT' | 'CHILD'; // 节点类型
    overallStatus?: string; // 整体状态（主任务）
    stepName?: string; // 步骤名（子任务）
    duration?: string; // 工期（子任务）
    progress?: string; // 进度（子任务）
}

/**
 * 报表条目
 */
export interface ReportItem {
    id: string;
    reportId: string; // 后端 Entity 属性：reportId
    tabType: TabType; // 后端 Entity 属性：tabType
    sourceType: SourceType; // 后端 Entity 属性：sourceType
    parentId: string | null; // 后端 Entity 属性：parentId
    contentJson: ReportItemContent; // 后端 Entity 属性：contentJson（已解析）
    sortOrder: number; // 后端 Entity 属性：sortOrder
    children?: ReportItem[]; // 前端组装树结构时使用
}

/**
 * 会议待办
 */
export interface MeetingNote {
    id: string;
    reportId: string; // 后端 Entity 属性：reportId
    content: string;
}

/**
 * 周报详情（完整数据）
 */
export interface ReportDetail {
    report: Report;
    metrics: SystemMetric[];
    items: {
        done: ReportItem[];
        self: ReportItem[];
        plan: ReportItem[];
    };
    note: MeetingNote;
}

/**
 * API 响应包装
 */
export interface ApiResponse<T> {
    data: T;
    message?: string;
    success: boolean;
}

// 导出新的 API 类型（用于生成周报接口）
export type {
    GenerateReportRequest,
    ReportResponse,
    MetricDto,
    ReportItemDto,
    HealthCheckResponse,
} from './api';

// 导出业务领域类型
export type {Metric, EditAction, EditHistory} from './report';
