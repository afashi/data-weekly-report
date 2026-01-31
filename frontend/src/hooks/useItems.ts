import {useOptimisticMutation} from './useOptimisticMutation';
import {ItemAPI} from '@/services/item-api';
import {reportKeys} from './useReports';
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
    return useOptimisticMutation({
        mutationFn: ({id, contentJson}: { id: string; contentJson: Record<string, any> }) =>
            ItemAPI.updateItem(id, contentJson),
        queryKey: reportKeys.details(),
        successMessage: '保存成功！',
        errorMessage: '保存失败：',
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
    return useOptimisticMutation({
        mutationFn: ({
                         reportId,
                         items,
                     }: {
            reportId: string;
            items: UpdateManualItemsRequest['items'];
        }) => ItemAPI.updateManualItems(reportId, items),
        queryKey: reportKeys.details(),
        successMessage: '批量保存成功！',
        errorMessage: '批量保存失败：',
    });
}

/**
 * 删除条目
 *
 * @returns Mutation 对象
 *
 * @example
 * const { mutate, isPending } = useDeleteItem();
 * mutate({ id: '123' });
 */
export function useDeleteItem() {
    return useOptimisticMutation({
        mutationFn: ({id}: { id: string }) => ItemAPI.deleteItem(id),
        queryKey: reportKeys.details(),
        successMessage: '删除成功！',
        errorMessage: '删除失败：',
    });
}
