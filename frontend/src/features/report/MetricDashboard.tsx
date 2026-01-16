import { Card, Row, Col, Statistic, Progress } from 'antd';
import { CheckCircleOutlined, SyncOutlined, FileTextOutlined } from '@ant-design/icons';
import type { MetricDto } from '@/types/api';

interface MetricDashboardProps {
  metrics: MetricDto[];
}

/**
 * 指标看板组件
 * 展示3个核心业务指标：业务量、验证ETL、复盘ETL
 */
export default function MetricDashboard({ metrics }: MetricDashboardProps) {
  // 解析指标数据
  const getMetricValue = (key: string): string => {
    const metric = metrics.find((m) => m.metricKey === key);
    return metric?.metricValue || '0';
  };

  const getMetricStatus = (key: string): 'loading' | 'success' | 'normal' => {
    const metric = metrics.find((m) => m.metricKey === key);
    return (metric?.statusCode as any) || 'normal';
  };

  // 业务量指标
  const totalCount = parseInt(getMetricValue('TOTAL_COUNT')) || 0;
  const processCount = parseInt(getMetricValue('PROCESS_COUNT')) || 0;
  const manualCount = parseInt(getMetricValue('MANUAL_COUNT')) || 0;

  // ETL 指标
  const verifyEtl = getMetricValue('VERIFY_ETL');
  const reviewEtl = getMetricValue('REVIEW_ETL');

  // 计算业务量百分比
  const processPercent = totalCount > 0 ? Math.round((processCount / totalCount) * 100) : 0;
  const manualPercent = totalCount > 0 ? Math.round((manualCount / totalCount) * 100) : 0;

  return (
    <Row gutter={[16, 16]}>
      {/* 业务量卡片 */}
      <Col xs={24} sm={24} md={8}>
        <Card
          title={
            <span>
              <FileTextOutlined style={{ marginRight: 8 }} />
              业务量统计
            </span>
          }
          bordered={false}
          style={{ height: '100%' }}
        >
          <Statistic
            title="总计"
            value={totalCount}
            suffix="条"
            valueStyle={{ color: '#1677ff', fontSize: 32, fontWeight: 600 }}
          />
          <div style={{ marginTop: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#666' }}>流程数据</span>
                <span style={{ fontWeight: 600 }}>{processCount} 条</span>
              </div>
              <Progress
                percent={processPercent}
                strokeColor="#52c41a"
                showInfo={false}
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#666' }}>自采数据</span>
                <span style={{ fontWeight: 600 }}>{manualCount} 条</span>
              </div>
              <Progress
                percent={manualPercent}
                strokeColor="#1677ff"
                showInfo={false}
              />
            </div>
          </div>
        </Card>
      </Col>

      {/* 验证环境 ETL 卡片 */}
      <Col xs={24} sm={12} md={8}>
        <Card
          title={
            <span>
              <SyncOutlined style={{ marginRight: 8 }} />
              验证环境 ETL
            </span>
          }
          bordered={false}
          style={{ height: '100%' }}
        >
          <Statistic
            title="最新加载时间"
            value={verifyEtl}
            valueStyle={{
              color: getMetricStatus('VERIFY_ETL') === 'success' ? '#52c41a' : '#666',
              fontSize: 20,
            }}
            prefix={
              getMetricStatus('VERIFY_ETL') === 'success' ? (
                <CheckCircleOutlined />
              ) : null
            }
          />
          <div style={{ marginTop: 16, color: '#999', fontSize: 12 }}>
            {getMetricStatus('VERIFY_ETL') === 'loading' && '⏳ 加载中...'}
            {getMetricStatus('VERIFY_ETL') === 'success' && '✅ 数据已更新'}
            {getMetricStatus('VERIFY_ETL') === 'normal' && '📊 正常运行'}
          </div>
        </Card>
      </Col>

      {/* 复盘环境 ETL 卡片 */}
      <Col xs={24} sm={12} md={8}>
        <Card
          title={
            <span>
              <SyncOutlined style={{ marginRight: 8 }} />
              复盘环境 ETL
            </span>
          }
          bordered={false}
          style={{ height: '100%' }}
        >
          <Statistic
            title="最新加载时间"
            value={reviewEtl}
            valueStyle={{
              color: getMetricStatus('REVIEW_ETL') === 'success' ? '#52c41a' : '#666',
              fontSize: 20,
            }}
            prefix={
              getMetricStatus('REVIEW_ETL') === 'success' ? (
                <CheckCircleOutlined />
              ) : null
            }
          />
          <div style={{ marginTop: 16, color: '#999', fontSize: 12 }}>
            {getMetricStatus('REVIEW_ETL') === 'loading' && '⏳ 加载中...'}
            {getMetricStatus('REVIEW_ETL') === 'success' && '✅ 数据已更新'}
            {getMetricStatus('REVIEW_ETL') === 'normal' && '📊 正常运行'}
          </div>
        </Card>
      </Col>
    </Row>
  );
}
