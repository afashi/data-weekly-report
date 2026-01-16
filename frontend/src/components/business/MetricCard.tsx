import React from 'react';
import { Card, Statistic, Spin } from 'antd';
import { LoadingOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { Metric } from '@/types';

/**
 * 指标卡片组件属性
 */
interface MetricCardProps {
  /** 指标数据 */
  metric: Metric;
  /** 卡片标题 */
  title: string;
  /** 自定义渲染内容（可选） */
  children?: React.ReactNode;
  /** 卡片样式类名 */
  className?: string;
}

/**
 * 指标卡片组件
 * 用于展示单个系统指标，支持加载、成功、普通三种状态
 *
 * @example
 * ```tsx
 * <MetricCard
 *   title="业务量统计"
 *   metric={{
 *     id: '1',
 *     key: 'TOTAL_COUNT',
 *     label: '总数',
 *     value: '100',
 *     status: 'success'
 *   }}
 * />
 * ```
 */
const MetricCard: React.FC<MetricCardProps> = ({
  metric,
  title,
  children,
  className = '',
}) => {
  /**
   * 根据状态渲染不同的图标
   */
  const renderStatusIcon = () => {
    switch (metric.status) {
      case 'loading':
        return <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />;
      case 'success':
        return <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />;
      default:
        return null;
    }
  };

  /**
   * 根据状态决定是否显示数值
   */
  const renderValue = () => {
    if (metric.status === 'loading') {
      return '加载中...';
    }
    return metric.value;
  };

  return (
    <Card
      title={title}
      extra={renderStatusIcon()}
      className={className}
      bordered={false}
      style={{
        height: '100%',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      }}
    >
      {children || (
        <Statistic
          title={metric.label}
          value={renderValue()}
          valueStyle={{
            fontSize: 32,
            fontWeight: 600,
            color: metric.status === 'success' ? '#1677ff' : '#000',
          }}
        />
      )}
    </Card>
  );
};

export default MetricCard;
