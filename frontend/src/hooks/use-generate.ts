import {useMutation, UseMutationResult, useQuery, UseQueryResult} from '@tanstack/react-query';
import {generateApi} from '../services';
import type {GenerateReportRequest, HealthCheckResponse, ReportResponse} from '../types';

/**
 * React Query Hooks
 * 封装周报生成相关的数据获取和变更操作
 */

/**
 * 生成周报 Mutation Hook
 *
 * @example
 * const { mutate, isPending, isError, data } = useGenerateReport();
 * mutate({ weekRange: '2026/01/12-2026/01/18' });
 */
export function useGenerateReport(): UseMutationResult<
    ReportResponse,
    Error,
    GenerateReportRequest | undefined
> {
    return useMutation({
        mutationFn: (params?: GenerateReportRequest) => generateApi.generateReport(params),
        onSuccess: (data) => {
            console.log('[React Query] 周报生成成功:', data.id);
        },
        onError: (error: Error) => {
            console.error('[React Query] 周报生成失败:', error.message);
        },
    });
}

/**
 * 健康检查 Query Hook
 *
 * @param options 查询选项
 * @example
 * const { data, isLoading, isError, refetch } = useHealthCheck({
 *   refetchInterval: 30000 // 每30秒自动刷新
 * });
 */
export function useHealthCheck(options?: {
    enabled?: boolean;
    refetchInterval?: number;
}): UseQueryResult<HealthCheckResponse, Error> {
    return useQuery({
        queryKey: ['health-check'],
        queryFn: () => generateApi.healthCheck(),
        enabled: options?.enabled ?? true,
        refetchInterval: options?.refetchInterval,
        retry: 3, // 失败重试3次
        staleTime: 10000, // 10秒内数据视为新鲜
    });
}

/**
 * Query Keys 常量
 * 用于手动操作 React Query 缓存
 */
export const queryKeys = {
    healthCheck: ['health-check'] as const,
    generateReport: ['generate-report'] as const,
} as const;
