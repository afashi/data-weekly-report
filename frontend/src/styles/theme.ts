/**
 * 全局主题配置
 * 统一管理颜色、间距、圆角、阴影等设计token
 */
export const theme = {
  colors: {
    primary: '#1677ff',
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f',
    info: '#1677ff',
    background: '#f5f5f5',
    cardBg: '#ffffff',
    border: '#f0f0f0',
    textPrimary: 'rgba(0, 0, 0, 0.88)',
    textSecondary: 'rgba(0, 0, 0, 0.65)',
    textDisabled: 'rgba(0, 0, 0, 0.25)',
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
  shadows: {
    card: '0 2px 8px rgba(0, 0, 0, 0.08)',
    cardHover: '0 4px 12px rgba(0, 0, 0, 0.12)',
    header: '0 1px 2px rgba(0, 0, 0, 0.06)',
    elevated: '0 6px 16px rgba(0, 0, 0, 0.12)',
  },
} as const;
