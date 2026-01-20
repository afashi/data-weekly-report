import React from 'react';
import {Dropdown, Button, Modal, Space, Tag} from 'antd';
import type {MenuProps} from 'antd';
import {
    DownOutlined,
    CheckOutlined,
    DeleteOutlined,
    ExclamationCircleOutlined,
} from '@ant-design/icons';
import {useReports, useDeleteReport} from '@/hooks';
import {useNavigate} from 'react-router-dom';

/**
 * VersionSelector 版本选择器组件
 *
 * 功能需求：
 * 1. 下拉菜单展示历史版本列表（Ant Design Dropdown）
 * 2. 版本切换逻辑（路由跳转到 /reports/:reportId）
 * 3. 删除版本功能（调用 DELETE /api/reports/:id）
 * 4. 删除确认对话框（Modal.confirm）
 * 5. 当前版本高亮显示
 */

interface VersionSelectorProps {
    /** 当前选中的周报 ID */
    currentReportId?: string;
    /** 当前周报的周范围 */
    currentWeekRange?: string;
}

export const VersionSelector: React.FC<VersionSelectorProps> = ({
                                                                    currentReportId,
                                                                    currentWeekRange,
                                                                }) => {
    const navigate = useNavigate();

    // 获取历史周报列表
    const {data: reportsData, isLoading} = useReports({page: 1, pageSize: 50});

    // 删除周报 Hook
    const {mutate: deleteReport, isPending: isDeleting} = useDeleteReport();

    /**
     * 处理版本切换
     * 跳转到指定周报详情页
     */
    const handleVersionChange = (reportId: string) => {
        if (reportId === currentReportId) {
            return; // 已经是当前版本，不需要跳转
        }
        navigate(`/reports/${reportId}`);
    };

    /**
     * 处理删除版本
     * 显示确认对话框，确认后删除
     */
    const handleDeleteVersion = (reportId: string, weekRange: string) => {
        Modal.confirm({
            title: '确认删除周报',
            icon: <ExclamationCircleOutlined/>,
            content: `确定要删除周报「${weekRange}」吗？此操作不可恢复！`,
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
    };

    /**
     * 构建下拉菜单项
     */
    const menuItems: MenuProps['items'] = reportsData?.items.map((report) => {
        const isCurrent = report.id === currentReportId;

        return {
            key: report.id,
            label: (
                <Space style={{width: '100%', justifyContent: 'space-between'}}>
                    <Space>
                        {isCurrent && <CheckOutlined style={{color: '#1677ff'}}/>}
                        <span>{report.weekRange}</span>
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

    return (
        <Dropdown
            menu={{items: menuItems}}
            trigger={['click']}
            disabled={isLoading || isDeleting}
        >
            <Button>
                <Space>
                    {currentWeekRange || '选择版本'}
                    <DownOutlined/>
                </Space>
            </Button>
        </Dropdown>
    );
};
