/**
 * Jira API 响应数据类型定义
 */

/**
 * Jira Issue 响应结构
 */
export interface JiraIssue {
    key: string; // Jira 号，如 PROJ-123
    fields: {
        summary: string; // 任务标题
        status: {
            name: string; // 状态名称
        };
        assignee?: {
            displayName: string; // 负责人
        };
        customfield_10016?: number; // Story Points（示例字段）
        [key: string]: any; // 支持自定义字段
    };
}

/**
 * Jira Search API 响应结构
 */
export interface JiraSearchResponse {
    startAt: number;
    maxResults: number;
    total: number;
    issues: JiraIssue[];
}

/**
 * 内部统一的任务数据格式
 */
export interface NormalizedTask {
    jiraKey: string; // Jira 号
    title: string; // 任务标题
    status: string; // 状态
    assignee: string; // 负责人
    storyPoints?: number; // 工作量
    [key: string]: any; // 支持扩展字段
}
