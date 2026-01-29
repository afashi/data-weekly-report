import httpClient from './http-client';
import type {GenerateReportRequest, HealthCheckResponse, ReportResponse,} from '../types';

/**
 * 周报生成 API 服务
 * 封装所有与周报生成相关的后端 API 调用
 */
class GenerateApiService {
    private readonly basePath = '/reports/generate';

    /**
     * 生成新周报
     * POST /api/reports/generate（符合需求规格的路径）
     *
     * @param params 生成参数（可选）
     * @returns 生成的周报数据
     */
    async generateReport(params?: GenerateReportRequest): Promise<ReportResponse> {
        const response = await httpClient.post<ReportResponse>(this.basePath, params || {});
        return response.data;
    }

    /**
     * 健康检查
     * GET /api/generate/health
     *
     * @returns 健康状态
     */
    async healthCheck(): Promise<HealthCheckResponse> {
        const response = await httpClient.get<HealthCheckResponse>(`${this.basePath}/health`);
        return response.data;
    }
}

// 导出单例实例
export const generateApi = new GenerateApiService();
