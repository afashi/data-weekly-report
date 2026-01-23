import {Card, Col, Row, Statistic} from 'antd';
import {CheckCircleOutlined, FileTextOutlined, SyncOutlined} from '@ant-design/icons';
import type {MetricDto} from '@/types/api';
import StackedProgress from '@/components/business/StackedProgress';

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

  return (
    <Row gutter={[16, 16]}>
      {/* 业务量卡片 */}
        <Col xs={24} sm={24} md={12}>
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
              <StackedProgress
                  total={totalCount}
                  items={[
                      {label: '流程数据', value: processCount, color: '#52c41a'},
                      {label: '自采数据', value: manualCount, color: '#1677ff'}
                  ]}
                  height={24}
                  showPercent={true}
                  showLegend={true}
              />
          </div>
        </Card>
      </Col>

      {/* 验证环境 ETL 卡片 */}
        <Col xs={24} sm={12} md={6}>
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
        <Col xs={24} sm={12} md={6}>
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
