import React, {useCallback, useMemo} from 'react';
import type {MenuProps} from 'antd';
import {Button, Dropdown, Modal, Space, Tag} from 'antd';
import {CheckOutlined, DeleteOutlined, DownOutlined, ExclamationCircleOutlined,} from '@ant-design/icons';
// ✅ bundle-barrel-imports: 直接导入避免桶文件
import {useDeleteReport, useReports} from '@/hooks/useReports';
import {useNavigate} from 'react-router-dom';
import {useUIStore} from '@/store/uiStore';
import dayjs from 'dayjs';

/**
 * VersionSelector 版本选择器组件
 *
 * 功能需求：
 * 1. 下拉菜单展示历史版本列表（Ant Design Dropdown）
 * 2. 版本切换逻辑（路由跳转到 /reports/:reportId）
 * 3. 删除版本功能（调用 DELETE /api/reports/:id）
 * 4. 删除确认对话框（Modal.confirm）
 * 5. 当前版本高亮显示
 *
 * ✅ 性能优化：
 * - 使用 useMemo 缓存菜单项和显示文本
 * - 使用 useCallback 稳定回调函数引用
 * - 使用 React.memo 避免不必要的重渲染
 */

// ✅ js-cache-function-results: 缓存日期格式化结果
const formatDateCache = new Map<string, string>();
const formatDate = (dateString: string): string => {
    if (formatDateCache.has(dateString)) {
        return formatDateCache.get(dateString)!;
    }
    const formatted = dayjs(dateString).format('YYYY-MM-DD HH:mm');
    formatDateCache.set(dateString, formatted);
    return formatted;
};

export const VersionSelector: React.FC = React.memo(() => {
    const navigate = useNavigate();

    // 从 store 获取当前选中的周报 ID
    const currentReportId = useUIStore((state) => state.currentReportId);

    // 获取历史周报列表
    const {data: reportsData, isLoading} = useReports({page: 1, pageSize: 50});

    // 删除周报 Hook
    const {mutate: deleteReport, isPending: isDeleting} = useDeleteReport();

    /**
     * ✅ rerender-functional-setstate: 使用 useCallback 稳定回调引用
     * 处理版本切换 - 跳转到指定周报详情页
     */
    const handleVersionChange = useCallback((reportId: string) => {
        if (reportId === currentReportId) {
            return; // 已经是当前版本，不需要跳转
        }
        navigate(`/reports/${reportId}`);
    }, [currentReportId, navigate]);

    /**
     * ✅ rerender-functional-setstate: 使用 useCallback 稳定回调引用
     * 处理删除版本 - 显示确认对话框，确认后删除
     */
    const handleDeleteVersion = useCallback((reportId: string, weekRange: string) => {
        Modal.confirm({
            title: '确认删除周报',
            icon: <ExclamationCircleOutlined/>,
            content: `确定要删除周报「${weekRange}」吗?此操作不可恢复!`,
            okText: '确认删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: () => {
                deleteReport(reportId, {
                    onSuccess: () => {
                        // 如果删除的是当前查看的周报，跳转到最新周报
                        if (reportId === currentReportId) {
                            navigate('/latest');
                        }
                    },
                });
            },
        });
    }, [deleteReport, currentReportId, navigate]);

    /**
     * ✅ rerender-derived-state-no-effect: 使用 useMemo 派生状态
     * 获取当前选中周报的显示文本
     */
    const currentDisplayText = useMemo((): string => {
        if (!currentReportId || !reportsData?.items) {
            return '选择版本';
        }
        const currentReport = reportsData.items.find(r => r.id === currentReportId);
        if (!currentReport) {
            return '选择版本';
        }
        return `${currentReport.weekRange} (第${currentReport.weekNumber}周) - ${formatDate(currentReport.createdAt)}`;
    }, [currentReportId, reportsData?.items]);

    /**
     * ✅ rerender-memo-with-default-value: 使用 useMemo 缓存菜单项
     * 构建下拉菜单项
     */
    const menuItems: MenuProps['items'] = useMemo(() => {
        return reportsData?.items.map((report) => {
            const isCurrent = report.id === currentReportId;

            return {
                key: `report-${report.id}`, // 添加前缀确保key始终是string，避免React将大数字转换为Number导致精度丢失
                label: (
                    <Space style={{width: '100%', justifyContent: 'space-between'}}>
                        <Space>
                            {isCurrent && <CheckOutlined style={{color: '#1677ff'}}/>}
                            <span>{report.weekRange} (第{report.weekNumber}周) - {formatDate(report.createdAt)}</span>
                            {isCurrent && <Tag color="blue">当前</Tag>}
                        </Space>
                        <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined/>}
                            onClick={(e) => {
                                e.stopPropagation(); // 阻止事件冒泡，避免触发版本切换
                                handleDeleteVersion(report.id, report.weekRange);
                            }}
                        />
                    </Space>
                ),
                onClick: () => handleVersionChange(report.id),
            };
        }) || [];
    }, [reportsData?.items, currentReportId, handleVersionChange, handleDeleteVersion]);

    return (
        <Dropdown
            menu={{items: menuItems}}
            trigger={['click']}
            disabled={isLoading || isDeleting}
        >
            <Button>
                <Space>
                    {currentDisplayText}
                    <DownOutlined/>
                </Space>
            </Button>
        </Dropdown>
    );
});
