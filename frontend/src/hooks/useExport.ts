import {useMutation} from '@tanstack/react-query';
import {ExportAPI} from '@/services/export-api';
import {message} from 'antd';

/**
 * 导出周报为 Excel
 *
 * @returns Mutation 对象
 *
 * @example
 * const { mutate, isPending } = useExportReport();
 * mutate({ reportId: '123', weekRange: '2026/01/12-2026/01/18' });
 */
export function useExportReport() {
    return useMutation({
        mutationFn: async ({reportId, weekRange}: { reportId: string; weekRange: string }) => {
            const blob = await ExportAPI.exportReport(reportId);
            return {blob, weekRange};
        },
        onSuccess: ({blob, weekRange}) => {
            // 生成文件名：数据周报_2026-01-12至2026-01-18.xlsx
            const filename = `数据周报_${weekRange.replace(/\//g, '-').replace('-', '至')}.xlsx`;

            // 触发浏览器下载
            ExportAPI.downloadFile(blob, filename);

            message.success('Excel 导出成功！');
        },
        onError: (error: Error) => {
            message.error(`Excel 导出失败：${error.message}`);
        },
    });
}
