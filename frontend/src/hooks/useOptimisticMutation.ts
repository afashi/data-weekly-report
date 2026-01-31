import {
    type MutationFunction,
    type QueryKey,
    useMutation,
    type UseMutationResult,
    useQueryClient
} from '@tanstack/react-query';
import {message} from 'antd';

interface OptimisticMutationOptions<TData, TVariables> {
    /** 实际的 API 调用函数 */
    mutationFn: MutationFunction<TData, TVariables>;
    /** 需要失效的查询 key */
    queryKey: QueryKey;
    /** 成功提示文案 */
    successMessage?: string;
    /** 错误提示文案前缀 */
    errorMessage?: string;
}

/**
 * 通用乐观更新 Hook
 *
 * @description 封装了 React Query 的乐观更新模式：
 * 1. onMutate: 取消相关查询 + 保存快照
 * 2. onSuccess: 失效缓存 + 成功提示
 * 3. onError: 回滚快照 + 错误提示
 *
 * @template TData Mutation 返回的数据类型
 * @template TVariables Mutation 参数类型
 *
 * @example
 * const { mutate, isPending } = useOptimisticMutation({
 *   mutationFn: (data) => ItemAPI.updateItem(data.id, data.contentJson),
 *   queryKey: reportKeys.details(),
 *   successMessage: '保存成功！',
 *   errorMessage: '保存失败：'
 * });
 */
export function useOptimisticMutation<TData, TVariables>(
    options: OptimisticMutationOptions<TData, TVariables>
): UseMutationResult<TData, Error, TVariables, { previousData: any[] }> {
    const {mutationFn, queryKey, successMessage, errorMessage = '操作失败：'} = options;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn,
        onMutate: async () => {
            // 取消正在进行的查询，避免覆盖乐观更新
            await queryClient.cancelQueries({queryKey});

            // 保存当前数据快照，用于回滚
            const previousData = queryClient.getQueriesData({queryKey});

            return {previousData};
        },
        onSuccess: () => {
            // 使相关缓存失效，触发重新获取
            queryClient.invalidateQueries({queryKey});

            if (successMessage) {
                message.success(successMessage);
            }
        },
        onError: (error, _, context) => {
            // 发生错误时回滚数据
            if (context?.previousData) {
                context.previousData.forEach(([key, data]) => {
                    queryClient.setQueryData(key, data);
                });
            }

            message.error(`${errorMessage}${error.message}`);
        },
    });
}
