import {httpClient} from './http-client';

/**
 * Excel 导出 API
 */
export class ExportAPI {
    /**
     * 导出周报为 Excel 文件
     * GET /api/reports/:id/export（符合需求规格的路径）
     *
     * @param reportId 周报 ID
     * @returns Blob 数据（Excel 文件）
     */
    static async exportReport(reportId: string): Promise<Blob> {
        const response = await httpClient.get(`/reports/${reportId}/export`, {
            responseType: 'blob', // 重要：告诉 axios 返回二进制数据
        });
        return response.data;
    }

    /**
     * 触发浏览器下载文件
     *
     * @param blob 文件数据
     * @param filename 文件名
     */
    static downloadFile(blob: Blob, filename: string): void {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
}
