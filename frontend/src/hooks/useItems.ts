import {useMutation, useQueryClient} from '@tanstack/react-query';
import {ItemAPI} from '@/services/item-api';
import {reportKeys} from './useReports';
import {message} from 'antd';
import type {UpdateManualItemsRequest} from '@/types/api';

/**
 * 更新单行条目
 *
 * @returns Mutation 对象
 *
 * @example
 * const { mutate, isPending } = useUpdateItem();
 * mutate({ id: '123', contentJson: { title: '新标题' } });
 */
export function useUpdateItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({id, contentJson}: { id: string; contentJson: Record<string, any> }) =>
            ItemAPI.updateItem(id, contentJson),
        onMutate: async () => {
            // 乐观更新：立即更新 UI，不等待服务器响应
            // 这样用户体验更流畅！(￣▽￣)ノ

            // 取消正在进行的查询，避免覆盖乐观更新
            await queryClient.cancelQueries({queryKey: reportKeys.details()});

            // 保存之前的数据，用于回滚
            const previousData = queryClient.getQueriesData({queryKey: reportKeys.details()});

            return {previousData};
        },
        onSuccess: (data) => {
            // 使相关周报详情缓存失效
            queryClient.invalidateQueries({
                queryKey: reportKeys.detail(data.reportId)
            });

            message.success('保存成功！');
        },
        onError: (error: Error, _, context) => {
            // 回滚乐观更新
            if (context?.previousData) {
                context.previousData.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }

            message.error(`保存失败：${error.message}`);
        },
    });
}

/**
 * 批量更新手动条目(SELF 标签页)
 *
 * @returns Mutation 对象
 *
 * @example
 * const { mutate, isPending } = useUpdateManualItems();
 * mutate({
 *   reportId: '123',
 *   items: [
 *     { id: 'temp_1', contentJson: { title: '任务1' }, sortOrder: 0 },
 *     { id: 'temp_2', parentId: 'temp_1', contentJson: { title: '子任务' }, sortOrder: 1 }
 *   ]
 * });
 */
export function useUpdateManualItems() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
                         reportId,
                         items,
                     }: {
            reportId: string;
            items: UpdateManualItemsRequest['items'];
        }) => ItemAPI.updateManualItems(reportId, items),
        onSuccess: (data) => {
            // 使相关周报详情缓存失效，触发重新获取
            queryClient.invalidateQueries({
                queryKey: reportKeys.detail(data.reportId),
            });

            message.success(`成功保存 ${data.count} 条数据！`);
        },
        onError: (error: Error) => {
            message.error(`批量保存失败：${error.message}`);
        },
    });
}
