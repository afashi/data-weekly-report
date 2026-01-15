import {QueryClient} from '@tanstack/react-query';

/**
 * React Query 配置
 * 管理服务端状态
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分钟内数据视为新鲜
      gcTime: 10 * 60 * 1000, // 缓存保留 10 分钟
      refetchOnWindowFocus: false, // 单人使用，避免编辑时刷新
      retry: 1, // 失败重试 1 次
    },
    mutations: {
      retry: 0, // 变更操作不重试
    },
  },
});
