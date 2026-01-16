import React from 'react';
import { Space, Typography } from 'antd';

const { Text } = Typography;

/**
 * 堆叠进度条数据项
 */
interface ProgressItem {
  /** 标签名称 */
  label: string;
  /** 数值 */
  value: number;
  /** 进度条颜色 */
  color: string;
}

/**
 * 堆叠进度条组件属性
 */
interface StackedProgressProps {
  /** 进度条数据数组 */
  items: ProgressItem[];
  /** 总数 */
  total: number;
  /** 高度（默认 24px） */
  height?: number;
  /** 是否显示百分比（默认 true） */
  showPercent?: boolean;
  /** 是否显示图例（默认 true） */
  showLegend?: boolean;
}

/**
 * 堆叠进度条组件
 * 用于展示多个数据项的占比关系，支持双色或多色堆叠
 *
 * @example
 * ```tsx
 * <StackedProgress
 *   total={100}
 *   items={[
 *     { label: '已完成', value: 60, color: '#52c41a' },
 *     { label: '进行中', value: 40, color: '#1677ff' }
 *   ]}
 * />
 * ```
 */
const StackedProgress: React.FC<StackedProgressProps> = ({
  items,
  total,
  height = 24,
  showPercent = true,
  showLegend = true,
}) => {
  /**
   * 计算百分比
   */
  const calculatePercent = (value: number): number => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  /**
   * 渲染堆叠进度条
   */
  const renderStackedBar = () => {
    let accumulatedPercent = 0;

    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: `${height}px`,
          backgroundColor: '#f0f0f0',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        {items.map((item, index) => {
          const percent = calculatePercent(item.value);
          const left = accumulatedPercent;
          accumulatedPercent += percent;

          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: `${left}%`,
                width: `${percent}%`,
                height: '100%',
                backgroundColor: item.color,
                transition: 'all 0.3s ease',
              }}
              title={`${item.label}: ${item.value} (${percent}%)`}
            />
          );
        })}
      </div>
    );
  };

  /**
   * 渲染图例
   */
  const renderLegend = () => {
    return (
      <Space size="large" style={{ marginTop: 12 }}>
        {items.map((item, index) => {
          const percent = calculatePercent(item.value);
          return (
            <Space key={index} size={4}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: item.color,
                  borderRadius: '2px',
                }}
              />
              <Text style={{ fontSize: 14 }}>
                {item.label}: {item.value}
                {showPercent && ` (${percent}%)`}
              </Text>
            </Space>
          );
        })}
        <Text type="secondary" style={{ fontSize: 14 }}>
          总计: {total}
        </Text>
      </Space>
    );
  };

  return (
    <div style={{ width: '100%' }}>
      {renderStackedBar()}
      {showLegend && renderLegend()}
    </div>
  );
};

export default StackedProgress;
