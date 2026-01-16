/**
 * 后端 API 类型定义
 * 与后端 DTO 保持一致
 */

/**
 * 生成周报请求参数
 */
export interface GenerateReportRequest {
  weekRange?: string; // 可选的周范围，格式：2026/01/12-2026/01/18
  weekNumber?: number; // 可选的周数，如第 3 周
}

/**
 * 周报响应数据
 */
export interface ReportResponse {
  id: string;
  weekRange: string;
  weekNumber: number;
  createdAt: string;
  metrics: MetricDto[];
  items: ReportItemDto[];
  notes?: string;
}

/**
 * 系统指标 DTO
 */
export interface MetricDto {
  id: string;
  metricKey: string; // TOTAL_COUNT, PROCESS_COUNT, MANUAL_COUNT, VERIFY_ETL, REVIEW_ETL
  metricValue: string; // 显示值
  statusCode: 'loading' | 'success' | 'normal'; // 状态标识
}

/**
 * 报表条目 DTO
 */
export interface ReportItemDto {
  id: string;
  tabType: 'DONE' | 'SELF' | 'PLAN'; // 标签类型
  sourceType: 'JIRA' | 'SQL' | 'MANUAL'; // 数据来源
  parentId?: string; // 父节点 ID（用于树形结构）
  contentJson: string; // 业务数据 JSON
  sortOrder: number; // 排序权重
}

/**
 * 业务内容结构（从 contentJson 解析）
 */
export interface ApiTaskContent {
  jiraKey: string; // Jira 号
  title: string; // 任务标题
  status: string; // 状态
  assignee: string; // 负责人
  storyPoints?: number; // 工作量
  [key: string]: any; // 支持扩展字段
}

/**
 * 健康检查响应
 */
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  services: {
    jira: boolean;
    sql: Record<string, boolean>;
    database: boolean;
  };
}

/**
 * 周报列表项
 */
export interface ReportListItem {
  id: string;
  weekRange: string;
  weekNumber: number;
  createdAt: string;
}

/**
 * 周报列表响应
 */
export interface ReportListResponse {
  items: ReportListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 周报详情响应
 */
export interface ReportDetailResponse {
  id: string;
  weekRange: string;
  weekNumber: number;
  createdAt: string;
  metrics: MetricDto[];
  items: ReportItemDto[];
  notes: string;
}

/**
 * 条目更新响应
 */
export interface ItemResponse {
  id: string;
  reportId: string;
  tabType: string;
  sourceType: string;
  parentId: string | null;
  contentJson: Record<string, any>;
  sortOrder: number;
}

/**
 * 会议待办响应
 */
export interface NotesResponse {
  id: string;
  reportId: string;
  content: string;
}
