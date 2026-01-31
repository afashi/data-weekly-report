import React, {useState} from 'react';
import {Button, Space, Tooltip} from 'antd';
import {DownloadOutlined, MenuOutlined, PlusOutlined,} from '@ant-design/icons';
import {useExportReport, useGenerateReport} from '@/hooks';
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
 */

interface ActionBarProps {
    /** 当前周报 ID */
    reportId?: string;
    /** 当前周报的周范围（用于导出文件名） */
    weekRange?: string;
}

export const ActionBar: React.FC<ActionBarProps> = ({reportId, weekRange}) => {
    const navigate = useNavigate();
    const {toggleSidebar} = useUIStore();
    const [showProgress, setShowProgress] = useState(false);

    // 生成周报 Hook
    const {mutate: generateReport, isPending: isGenerating} = useGenerateReport();

    // 导出 Excel Hook
    const {mutate: exportReport, isPending: isExporting} = useExportReport();

    /**
     * 处理生成周报
     * 生成成功后自动跳转到新周报详情页
     */
    const handleGenerate = () => {
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
    };

    /**
     * 处理导出 Excel
     * 需要当前周报 ID 和周范围
     */
    const handleExport = () => {
        if (!reportId || !weekRange) {
            return;
        }
        exportReport({reportId, weekRange});
    };

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
                onComplete={() => {
                    // 进度条完成回调（已在 handleGenerate 中处理跳转）
                }}
            />
        </>
    );
};
