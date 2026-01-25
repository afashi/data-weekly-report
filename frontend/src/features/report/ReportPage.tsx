import React from 'react';
import {useParams} from 'react-router-dom';
import {Button, Result, Space, Spin} from 'antd';
import {DownloadOutlined, MenuOutlined, PlusOutlined} from '@ant-design/icons';
import {useExportReport, useGenerateReport, useReportDetail} from '@/hooks';
import {VersionSelector} from '@/components/business/VersionSelector';
import MetricDashboard from './MetricDashboard';
import TabEditor from './TabEditor';
import MeetingSidebar from '@/features/sidebar/MeetingSidebar';
import {useUIStore} from '@/store/uiStore';
import {theme} from '@/styles/theme';

/**
 * 周报详情页组件
 * 展示完整的周报内容，包括版本选择、指标看板、Tab 编辑器和会议待办
 */
const ReportPage: React.FC = () => {
    const {reportId} = useParams<{ reportId: string }>();

    // 获取周报详情数据
    const {data: report, isLoading, error} = useReportDetail(reportId || '');

    // 获取侧边栏状态
    const {isSidebarOpen, closeSidebar, toggleSidebar, setCurrentReportId} = useUIStore();

    // 生成和导出 Hooks
    const {mutate: generateReport, isPending: isGenerating} = useGenerateReport();
    const {mutate: exportReport, isPending: isExporting} = useExportReport();

    // 同步当前 reportId 到 store
    React.useEffect(() => {
        if (reportId) {
            setCurrentReportId(reportId);
        }
    }, [reportId, setCurrentReportId]);

    /**
     * 处理生成周报
     */
    const handleGenerate = () => {
        generateReport(undefined, {
            onSuccess: (data) => {
                // 跳转逻辑由 useGenerateReport Hook 处理
            },
        });
    };

    /**
     * 处理导出 Excel
     */
    const handleExport = () => {
        if (!reportId || !report?.weekRange) {
            return;
        }
        exportReport({reportId, weekRange: report.weekRange});
    };

    return (
        <div className="report-page" style={{
            background: theme.colors.background,
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* 全局独立操作区 - 始终显示，不依赖 report 数据 */}
            <div
                className="page-header"
                style={{
                    padding: `${theme.spacing.md}px ${theme.spacing.lg}px`,
                    background: theme.colors.cardBg,
                    boxShadow: theme.shadows.header,
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    flexShrink: 0,
                }}
            >
                <Space size="large">
                    {/* 版本选择器 - 独立组件,不接收 currentReportId */}
                    <VersionSelector/>

                    {/* 操作按钮 - 直接在此定义,不依赖 ActionBar 组件 */}
                    <Space>
                        <Button type="primary" icon={<PlusOutlined/>} loading={isGenerating} onClick={handleGenerate}>
                            生成本周周报
                        </Button>
                        <Button
                            icon={<DownloadOutlined/>}
                            loading={isExporting}
                            disabled={!reportId}
                            onClick={handleExport}
                        >
                            导出 Excel
                        </Button>
                        <Button icon={<MenuOutlined/>} onClick={toggleSidebar}>
                            会议待办
                        </Button>
                    </Space>
                </Space>
            </div>

            {/* 数据展示区域 - 独立渲染 */}
            <div className="page-content"
                 style={{padding: `${theme.spacing.md}px ${theme.spacing.lg}px`, flex: 1, overflow: 'auto'}}>
                {/* 加载中状态 */}
                {isLoading && (
                    <div style={{textAlign: 'center', padding: '100px 0'}}>
                        <Spin size="large" tip="加载中..."/>
                    </div>
                )}

                {/* 错误状态 */}
                {error && (
                    <Result
                        status="error"
                        title="加载失败"
                        subTitle={`加载周报失败：${error.message}`}
                        style={{marginTop: 100}}
                    />
                )}

                {/* 周报不存在 */}
                {!isLoading && !error && !report && (
                    <Result
                        status="404"
                        title="周报不存在"
                        subTitle="未找到指定的周报，请检查 URL 或返回首页"
                        style={{marginTop: 100}}
                    />
                )}

                {/* 周报数据展示 */}
                {report && (
                    <>
                        {/* 指标看板 */}
                        {report.metrics && (
                            <MetricDashboard metrics={report.metrics}/>
                        )}

                        {/* Tab 编辑器 */}
                        {report.items && (
                            <TabEditor
                                items={report.items}
                                reportId={report.id}
                            />
                        )}
                    </>
                )}
            </div>

            {/* 会议待办侧边栏 */}
            {report && (
                <MeetingSidebar
                    visible={isSidebarOpen}
                    onClose={closeSidebar}
                    content={report.notes || ''}
                    reportId={report.id}
                />
            )}
        </div>
  );
};

export default ReportPage;
