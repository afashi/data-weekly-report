import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {QueryClientProvider} from '@tanstack/react-query';
import {ConfigProvider} from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import {queryClient} from './lib/queryClient';
import App from './App';
import './index.css';

// 配置 dayjs 中文环境
dayjs.locale('zh-cn');

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <QueryClientProvider client={queryClient}>
                <ConfigProvider
                    locale={zhCN}
                    theme={{
                        token: {
                            colorPrimary: '#1677ff',
                            borderRadius: 8,
                            fontSize: 14,
                            fontFamily:
                                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
                        },
                        components: {
                            Table: {
                                headerBg: '#fafafa',
                                headerSplitColor: '#f0f0f0',
                                rowHoverBg: '#f5f7fa',
                            },
                            Card: {
                                headerBg: 'transparent',
                            },
                        },
                    }}
                >
                    <App/>
                </ConfigProvider>
            </QueryClientProvider>
        </BrowserRouter>
    </StrictMode>,
);
