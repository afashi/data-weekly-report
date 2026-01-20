import React from 'react';
import { useParams } from 'react-router-dom';
import {Space, Spin, Card, Result} from 'antd';
import {useReportDetail} from '@/hooks';
import {ActionBar} from '@/components/business/ActionBar';
import {VersionSelector} from '@/components/business/VersionSelector';
import MetricDashboard from './MetricDashboard';
import TabEditor from './TabEditor';
import MeetingSidebar from '@/features/sidebar/MeetingSidebar';
import {useUIStore} from '@/store/uiStore';

/**
 * 周报详情页组件
 * 展示完整的周报内容，包括版本选择、指标看板、Tab 编辑器和会议待办
 */
const ReportPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();

    // 获取周报详情数据
    const {data: report, isLoading, error} = useReportDetail(reportId || '');

    // 获取侧边栏状态
    const {isSidebarOpen, closeSidebar} = useUIStore();

  // 加载中状态
    if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  // 错误状态
    if (error) {
    return (
        <Result
            status="error"
            title="加载失败"
            subTitle={`加载周报失败：${error.message}`}
            style={{marginTop: 100}}
        />
    );
    }

    // 周报不存在
    if (!report) {
        return (
            <Result
                status="404"
                title="周报不存在"
                subTitle="未找到指定的周报，请检查 URL 或返回首页"
                style={{marginTop: 100}}
      />
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 顶部操作栏 */}
      <Card style={{ marginBottom: 24 }}>
          <Space split={<span style={{margin: '0 8px', color: '#d9d9d9'}}>|</span>}>
              {/* 版本选择器 */}
              <VersionSelector
                  currentReportId={report.id}
                  currentWeekRange={report.weekRange}
              />

              {/* 操作按钮 */}
              <ActionBar
                  reportId={report.id}
                  weekRange={report.weekRange}
              />
        </Space>
      </Card>

      {/* 指标看板 */}
        {report.metrics && (
        <MetricDashboard metrics={report.metrics} />
      )}

      {/* Tab 编辑器 */}
        {report.items && (
        <TabEditor
          items={report.items}
          reportId={report.id}
        />
      )}

      {/* 会议待办侧边栏 */}
      <MeetingSidebar
          visible={isSidebarOpen}
          onClose={closeSidebar}
          content={report.notes || ''}
          reportId={report.id}
      />
    </div>
  );
};

export default ReportPage;
