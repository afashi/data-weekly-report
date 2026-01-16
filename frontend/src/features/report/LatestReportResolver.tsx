import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Spin } from 'antd';
import { ReportAPI } from '@/services/report-api';

/**
 * 最新周报解析器
 * 自动跳转到最新的周报详情页
 */
export default function LatestReportResolver() {
  const navigate = useNavigate();

  // 查询历史周报列表
  const { data } = useQuery({
    queryKey: ['reports', 'list'],
    queryFn: () => ReportAPI.getReports({ page: 1, pageSize: 1 }),
  });

  useEffect(() => {
    if (data && data.items.length > 0) {
      // 跳转到最新的周报
      navigate(`/reports/${data.items[0].id}`, { replace: true });
    }
  }, [data, navigate]);

  return (
    <div style={{ textAlign: 'center', padding: '100px 0' }}>
      <Spin size="large" tip="正在加载最新周报..." />
    </div>
  );
}
