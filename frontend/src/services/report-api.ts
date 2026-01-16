import { httpClient } from './http-client';
import type { ReportListResponse, ReportDetailResponse } from '@/types/api';

/**
 * 周报查询 API
 */
export class ReportAPI {
  /**
   * 获取历史周报列表
   */
  static async getReports(params?: {
    page?: number;
    pageSize?: number;
  }): Promise<ReportListResponse> {
    const response = await httpClient.get<ReportListResponse>('/reports', {
      params,
    });
    return response.data;
  }

  /**
   * 获取指定周报详情
   */
  static async getReportById(id: string): Promise<ReportDetailResponse> {
    const response = await httpClient.get<ReportDetailResponse>(`/reports/${id}`);
    return response.data;
  }

  /**
   * 软删除周报
   */
  static async deleteReport(id: string): Promise<void> {
    await httpClient.delete(`/reports/${id}`);
  }
}
