import React, {useCallback, useState} from 'react';
import {Button, Space, Tooltip} from 'antd';
import {DownloadOutlined, MenuOutlined, PlusOutlined,} from '@ant-design/icons';
// ✅ bundle-barrel-imports: 直接导入避免桶文件
import {useExportReport} from '@/hooks/useExport';
import {useGenerateReport} from '@/hooks/use-generate';
import {useUIStore} from '@/store/uiStore';
import {useNavigate} from 'react-router-dom';
import {GenerateProgress} from './GenerateProgress';

/**
 * ActionBar 操作栏组件
 *
 * 功能需求：
 * 1. 生成周报按钮（调用 POST /api/generate）
 * 2. 导出 Excel 按钮（调用 GET /api/export/:reportId）
 * 3. 切换侧边栏按钮（控制 MeetingSidebar 显示/隐藏）
 * 4. 按钮加载状态与禁用逻辑
 * 5. 成功/失败提示（message.success/error）
 *
 * ✅ 性能优化：
 * - 使用 React.memo 避免不必要的重渲染
 * - 使用 useCallback 稳定回调函数引用
 * - 使用 Zustand selector 避免订阅整个 store
 */

interface ActionBarProps {
    /** 当前周报 ID */
    reportId?: string;
    /** 当前周报的周范围（用于导出文件名） */
    weekRange?: string;
}

export const ActionBar: React.FC<ActionBarProps> = React.memo(({reportId, weekRange}) => {
    const navigate = useNavigate();
    // ✅ rerender-defer-reads: 只订阅需要的 store 状态
    const toggleSidebar = useUIStore((state) => state.toggleSidebar);
    const [showProgress, setShowProgress] = useState(false);

    // 生成周报 Hook
    const {mutate: generateReport, isPending: isGenerating} = useGenerateReport();

    // 导出 Excel Hook
    const {mutate: exportReport, isPending: isExporting} = useExportReport();

    /**
     * ✅ rerender-functional-setstate: 使用 useCallback 稳定回调引用
     * 处理生成周报 - 生成成功后自动跳转到新周报详情页
     */
    const handleGenerate = useCallback(() => {
        setShowProgress(true);
        generateReport(undefined, {
            onSuccess: (data) => {
                // 进度条完成后跳转到新生成的周报详情页
                setTimeout(() => {
                    setShowProgress(false);
                    navigate(`/reports/${data.id}`);
                }, 500);
            },
            onError: () => {
                // 发生错误时关闭进度条
                setShowProgress(false);
            },
        });
    }, [generateReport, navigate]);

    /**
     * ✅ rerender-functional-setstate: 使用 useCallback 稳定回调引用
     * 处理导出 Excel - 需要当前周报 ID 和周范围
     */
    const handleExport = useCallback(() => {
        if (!reportId || !weekRange) {
            return;
        }
        exportReport({reportId, weekRange});
    }, [reportId, weekRange, exportReport]);

    /**
     * ✅ rerender-move-effect-to-event: 进度条完成回调
     */
    const handleProgressComplete = useCallback(() => {
        // 进度条完成回调（已在 handleGenerate 中处理跳转）
    }, []);

    return (
        <>
            <Space size="middle">
                {/* 生成周报按钮 */}
                <Tooltip title="生成新的周报">
                    <Button
                        type="primary"
                        icon={<PlusOutlined/>}
                        loading={isGenerating}
                        onClick={handleGenerate}
                    >
                        生成周报
                    </Button>
                </Tooltip>

                {/* 导出 Excel 按钮 */}
                <Tooltip title={!reportId ? '请先选择或生成周报' : '导出当前周报为 Excel'}>
                    <Button
                        icon={<DownloadOutlined/>}
                        loading={isExporting}
                        disabled={!reportId || !weekRange}
                        onClick={handleExport}
                    >
                        导出 Excel
                    </Button>
                </Tooltip>

                {/* 切换侧边栏按钮 */}
                <Tooltip title="显示/隐藏会议待办">
                    <Button
                        icon={<MenuOutlined/>}
                        onClick={toggleSidebar}
                    >
                        会议待办
                    </Button>
                </Tooltip>
            </Space>

            {/* 周报生成进度条 */}
            <GenerateProgress
                visible={showProgress}
                onComplete={handleProgressComplete}
            />
        </>
    );
});
