import {Inject, Injectable, Logger} from '@nestjs/common';
import axios, {AxiosInstance} from 'axios';
import {JiraConfig} from '../../../config/config.types';
import {JiraSearchResponse, NormalizedTask} from '../types/jira.types';

/**
 * Jira API 适配器
 * 负责从 Jira 获取任务数据并标准化
 */
@Injectable()
export class JiraAdapter {
    private readonly logger = new Logger(JiraAdapter.name);
    private readonly axiosInstance: AxiosInstance;
    private readonly config: JiraConfig;

    constructor(@Inject('APP_CONFIG') private readonly appConfig: { jira: JiraConfig }) {
        this.config = appConfig.jira;

        // 创建 Axios 实例，配置 Basic Auth
        this.axiosInstance = axios.create({
            baseURL: this.config.baseUrl,
            auth: {
                username: this.config.email,
                password: this.config.apiToken,
            },
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        });

        this.logger.log(`JiraAdapter 初始化成功 - Base URL: ${this.config.baseUrl}`);
    }

    /**
     * 查询 Jira 任务（本周完成）
     * @returns 标准化的任务列表
     */
    async fetchDoneTasks(): Promise<NormalizedTask[]> {
        this.logger.log('开始查询 Jira 已完成任务');
        const jql = this.config.jql.done;
        return this.executeJqlQuery(jql);
    }

    /**
     * 查询 Jira 任务（后续计划）
     * @returns 标准化的任务列表
     */
    async fetchPlanTasks(): Promise<NormalizedTask[]> {
        this.logger.log('开始查询 Jira 计划任务');
        const jql = this.config.jql.plan;
        return this.executeJqlQuery(jql);
    }

    /**
     * 健康检查 - 测试 Jira API 连接
     * @returns 是否连接成功
     */
    async healthCheck(): Promise<boolean> {
        try {
            await this.axiosInstance.get('/rest/api/3/myself');
            this.logger.log('Jira API 健康检查成功');
            return true;
        } catch (error) {
            this.logger.error(`Jira API 健康检查失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 执行 JQL 查询
     * @param jql JQL 查询语句
     * @returns 标准化的任务列表
     */
    private async executeJqlQuery(jql: string): Promise<NormalizedTask[]> {
        try {
            const response = await this.axiosInstance.post<JiraSearchResponse>('/rest/api/3/search', {
                jql,
                fields: this.config.fields,
                maxResults: 1000, // 每次最多获取 1000 条
            });

            this.logger.log(`JQL 查询成功 - 共 ${response.data.total} 条结果`);

            // 转换为统一格式
            return response.data.issues.map((issue) => this.normalizeIssue(issue));
        } catch (error) {
            this.logger.error(`JQL 查询失败: ${error.message}`, error.stack);
            throw new Error(`Jira API 调用失败: ${error.message}`);
        }
    }

    /**
     * 标准化 Jira Issue 数据
     * @param issue 原始 Jira Issue
     * @returns 标准化任务对象
     */
    private normalizeIssue(issue: any): NormalizedTask {
        const fields = issue.fields || {};

        return {
            jiraKey: issue.key,
            title: fields.summary || '',
            status: fields.status?.name || 'Unknown',
            assignee: fields.assignee?.displayName || '未分配',
            storyPoints: fields.customfield_10016, // Story Points 字段（根据实际配置调整）
            // 支持更多自定义字段扩展
            raw: fields, // 保留原始数据供后续处理
        };
    }
}
