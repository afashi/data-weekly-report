import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {ReportAPI} from '@/services/report-api';
import {generateApi} from '@/services/generate-api';
import type {
    GenerateReportRequest
} from '@/types';
import {message} from 'antd';

/**
 * React Query Keys
 * 统一管理查询键，确保缓存一致性
 */
export const reportKeys = {
    all: ['reports'] as const,
    lists: () => [...reportKeys.all, 'list'] as const,
    list: (params?: { page?: number; pageSize?: number }) =>
        [...reportKeys.lists(), params] as const,
    details: () => [...reportKeys.all, 'detail'] as const,
    detail: (id: string) => [...reportKeys.details(), id] as const,
};

/**
 * 获取历史周报列表
 *
 * @param params 分页参数
 * @returns 周报列表数据
 *
 * @example
 * const { data, isLoading, error } = useReports({ page: 1, pageSize: 10 });
 */
export function useReports(params?: { page?: number; pageSize?: number }) {
    return useQuery({
        queryKey: reportKeys.list(params),
        queryFn: () => ReportAPI.getReports(params),
        staleTime: 5 * 60 * 1000, // 5 分钟内数据视为新鲜
        gcTime: 10 * 60 * 1000, // 10 分钟后清理缓存
    });
}

/**
 * 获取指定周报详情
 *
 * @param id 周报 ID
 * @returns 周报详情数据
 *
 * @example
 * const { data, isLoading, error } = useReportDetail('123456');
 */
export function useReportDetail(id: string) {
    return useQuery({
        queryKey: reportKeys.detail(id),
        queryFn: () => ReportAPI.getReportById(id),
        enabled: !!id, // 只有当 id 存在时才执行查询
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}

/**
 * 生成新周报
 *
 * @returns Mutation 对象
 *
 * @example
 * const { mutate, isPending } = useGenerateReport();
 * mutate({ weekRange: '2026/01/12-2026/01/18' });
 */
export function useGenerateReport() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (params?: GenerateReportRequest) =>
            generateApi.generateReport(params),
        onSuccess: (data) => {
            // 使列表缓存失效，触发重新获取
            queryClient.invalidateQueries({queryKey: reportKeys.lists()});

            // 预填充详情缓存
            queryClient.setQueryData(reportKeys.detail(data.id), data);

            message.success('周报生成成功！');
        },
        onError: (error: Error) => {
            message.error(`周报生成失败：${error.message}`);
        },
    });
}

/**
 * 删除周报（软删除）
 *
 * @returns Mutation 对象
 *
 * @example
 * const { mutate, isPending } = useDeleteReport();
 * mutate('123456');
 */
export function useDeleteReport() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => ReportAPI.deleteReport(id),
        onSuccess: (_, deletedId) => {
            // 使列表缓存失效
            queryClient.invalidateQueries({queryKey: reportKeys.lists()});

            // 移除详情缓存
            queryClient.removeQueries({queryKey: reportKeys.detail(deletedId)});

            message.success('周报删除成功！');
        },
        onError: (error: Error) => {
            message.error(`周报删除失败：${error.message}`);
        },
    });
}
