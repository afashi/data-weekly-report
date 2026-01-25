import {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {Button, Result, Space, Spin} from 'antd';
import {PlusOutlined} from '@ant-design/icons';
import {ReportAPI} from '@/services/report-api';
import {VersionSelector} from '@/components/business/VersionSelector';
import {useGenerateReport} from '@/hooks';
import {theme} from '@/styles/theme';

/**
 * 最新周报解析器
 * 自动跳转到最新的周报详情页
 * 如果没有周报，显示带操作按钮的空状态页面
 */
export default function LatestReportResolver() {
    const navigate = useNavigate();
    const {mutate: generateReport, isPending: isGenerating} = useGenerateReport();

  // 查询历史周报列表
    const {data, isLoading} = useQuery({
        queryKey: ['reports', 'list'],
        queryFn: () => ReportAPI.getReports({page: 1, pageSize: 1}),
    });

    useEffect(() => {
        if (data && data.items.length > 0) {
            // 跳转到最新的周报
            navigate(`/reports/${data.items[0].id}`, {replace: true});
        }
    }, [data, navigate]);

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

    // 加载中
    if (isLoading) {
        return (
            <div style={{textAlign: 'center', padding: '100px 0'}}>
                <Spin size="large" tip="正在加载最新周报..."/>
            </div>
        );
    }

    // 没有周报数据，显示空状态页面
    if (data && data.items.length === 0) {
        return (
            <div style={{
                background: theme.colors.background,
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* 全局独立操作区 - 始终显示 */}
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
                        {/* 版本选择器 */}
                        <VersionSelector/>

                        {/* 操作按钮 */}
                        <Space>
                            <Button type="primary" icon={<PlusOutlined/>} loading={isGenerating}
                                    onClick={handleGenerate}>
                                生成本周周报
                            </Button>
                        </Space>
                    </Space>
                </div>

                {/* 空状态提示 */}
                <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <Result
                        status="info"
                        title="还没有周报数据"
                        subTitle="点击上方「生成本周周报」按钮创建第一个周报吧～"
                        extra={
                            <Button type="primary" size="large" icon={<PlusOutlined/>} loading={isGenerating}
                                    onClick={handleGenerate}>
                                生成本周周报
                            </Button>
                        }
                    />
                </div>
            </div>
        );
    }

    // 默认加载状态
    return (
        <div style={{textAlign: 'center', padding: '100px 0'}}>
            <Spin size="large" tip="正在加载最新周报..."/>
        </div>
    );
}
