import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Space, Button, Spin, Alert, Card } from 'antd';
import { FileExcelOutlined, TeamOutlined } from '@ant-design/icons';
import MetricDashboard from './MetricDashboard';
import TabEditor from './TabEditor';
import MeetingSidebar from '@/features/sidebar/MeetingSidebar';

/**
 * 周报详情页组件
 * 展示完整的周报内容，包括版本选择、指标看板、Tab 编辑器和会议待办
 */
const ReportPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();

  // 状态管理
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // TODO: 从 API 获取数据
  const [report] = useState<any>(null);

  /**
   * 处理保存会议待办
   */
  const handleSaveNotes = async (reportId: string, content: string) => {
    // TODO: 调用保存 API
    console.log('Save notes:', reportId, content);
  };

  /**
   * 处理导出 Excel
   */
  const handleExport = async () => {
    try {
      setLoading(true);
      // TODO: 调用导出 API
      console.log('Export report:', reportId);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载中状态
  if (loading && !report) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  // 错误状态
  if (!report && !loading) {
    return (
      <Alert
        message="周报不存在"
        description="未找到指定的周报，请检查 URL 或返回首页"
        type="error"
        showIcon
        style={{ margin: '50px auto', maxWidth: 600 }}
      />
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* 顶部操作栏 */}
      <Card style={{ marginBottom: 24 }}>
        <Space>
          <Button
            icon={<TeamOutlined />}
            onClick={() => setSidebarVisible(true)}
          >
            会议待办
          </Button>
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            onClick={handleExport}
            loading={loading}
          >
            导出 Excel
          </Button>
        </Space>
      </Card>

      {/* 指标看板 */}
      {report?.metrics && (
        <MetricDashboard metrics={report.metrics} />
      )}

      {/* Tab 编辑器 */}
      {report?.items && (
        <TabEditor
          items={report.items}
          onUpdate={() => {
            // TODO: 重新加载数据
            console.log('Reload data');
          }}
        />
      )}

      {/* 会议待办侧边栏 */}
      <MeetingSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        content={report?.notes || ''}
        reportId={reportId || ''}
        onSave={handleSaveNotes}
        loading={loading}
      />
    </div>
  );
};

export default ReportPage;
