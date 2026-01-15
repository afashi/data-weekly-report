import axios from 'axios';

/**
 * Axios 实例配置
 * 统一处理 API 请求
 */
const api = axios.create({
    baseURL: '/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 请求拦截器
api.interceptors.request.use(
    (config) => {
        // 可在此添加 Token
        // const token = localStorage.getItem('token');
        // if (token) {
        //   config.headers.Authorization = `Bearer ${token}`;
        // }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

// 响应拦截器
api.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        // 统一错误处理
        if (error.response) {
            const {status, data} = error.response;

            switch (status) {
                case 400:
                    console.error('请求参数错误:', data.message);
                    break;
                case 401:
                    console.error('未授权，请登录');
                    break;
                case 404:
                    console.error('请求资源不存在');
                    break;
                case 500:
                    console.error('服务器错误');
                    break;
                default:
                    console.error('请求失败:', data.message);
            }
        } else {
            console.error('网络错误或请求超时');
        }

        return Promise.reject(error);
    },
);

export default api;
