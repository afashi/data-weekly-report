import axios, {AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig} from 'axios';

/**
 * HTTP 客户端配置
 * 封装 axios 实例，提供统一的请求/响应处理
 */

// 从环境变量获取 API 基础 URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/**
 * 创建 axios 实例
 */
const httpClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 秒超时
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * 请求拦截器
 * 在请求发送前添加通用配置
 */
httpClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // 可以在这里添加认证 token
        // const token = localStorage.getItem('auth_token');
        // if (token) {
        //   config.headers.Authorization = `Bearer ${token}`;
        // }

        console.log(`[HTTP] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
    },
    (error: AxiosError) => {
        console.error('[HTTP] 请求错误:', error);
        return Promise.reject(error);
    }
);

/**
 * 响应拦截器
 * 统一处理响应和错误
 */
httpClient.interceptors.response.use(
    (response: AxiosResponse) => {
        console.log(`[HTTP] 响应成功: ${response.config.url}`, response.status);
        return response;
    },
    (error: AxiosError) => {
        // 统一错误处理
        if (error.response) {
            // 服务器返回错误状态码
            const status = error.response.status;
            const message = (error.response.data as any)?.message || error.message;

            console.error(`[HTTP] 响应错误 ${status}:`, message);

            switch (status) {
                case 400:
                    throw new Error(`请求参数错误: ${message}`);
                case 401:
                    throw new Error('未授权，请重新登录');
                case 403:
                    throw new Error('没有权限访问该资源');
                case 404:
                    throw new Error('请求的资源不存在');
                case 500:
                    throw new Error(`服务器内部错误: ${message}`);
                case 503:
                    throw new Error('服务暂时不可用，请稍后重试');
                default:
                    throw new Error(`请求失败: ${message}`);
            }
        } else if (error.request) {
            // 请求已发送但没有收到响应
            console.error('[HTTP] 网络错误:', error.message);
            throw new Error('网络连接失败，请检查网络设置');
        } else {
            // 请求配置错误
            console.error('[HTTP] 配置错误:', error.message);
            throw new Error(`请求配置错误: ${error.message}`);
        }
    }
);

export { httpClient };
export default httpClient;
