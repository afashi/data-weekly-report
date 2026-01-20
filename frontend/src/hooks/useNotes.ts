import {useMutation, useQueryClient} from '@tanstack/react-query';
import {NotesAPI} from '@/services/notes-api';
import {reportKeys} from './useReports';
import {message} from 'antd';

/**
 * 更新会议待办
 *
 * @returns Mutation 对象
 *
 * @example
 * const { mutate, isPending } = useUpdateNotes();
 * mutate({ reportId: '123', content: '新的会议待办内容' });
 */
export function useUpdateNotes() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({reportId, content}: { reportId: string; content: string }) =>
            NotesAPI.updateNotes(reportId, content),
        onSuccess: (data) => {
            // 使相关周报详情缓存失效
            queryClient.invalidateQueries({
                queryKey: reportKeys.detail(data.reportId)
            });

            message.success('会议待办保存成功！');
        },
        onError: (error: Error) => {
            message.error(`会议待办保存失败：${error.message}`);
        },
    });
}
