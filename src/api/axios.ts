// src/api/axios.ts
import axios from 'axios';
import toast from 'react-hot-toast';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 300000, // 5分钟超时，留给 AI 慢慢思考
});

// 请求拦截器：自动注入 Token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('translator_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 响应拦截器：处理 Token 过期 & 狙击 iOS 僵尸连接
// 响应拦截器：处理 Token 过期 & 狙击 iOS 僵尸连接
apiClient.interceptors.response.use(
    (response) => response,
    async (error: any) => {
        const config = error?.config;

        if (error?.code === 'ERR_NETWORK' && !error?.response) {
            if (config && !config._retry) {
                config._retry = true;
                console.warn("🔄 iOS 拦截：准备打破 WebKit 死链接池，挂载时间戳强制重试...");

                // 等待 500 毫秒（再稍微给长一点点时间让底层清醒）
                await new Promise(resolve => setTimeout(resolve, 500));

                // 🚀 核心破冰绝杀：骗过 iOS 的 Socket 连接池
                // 如果是 GET 请求，强行塞入一个随机时间戳参数，强制系统认为是全新请求！
                if (config.method?.toUpperCase() === 'GET') {
                    config.params = {
                        ...config.params,
                        _t: Date.now() // 例如 /chat/history?_t=1712850000000
                    };
                }

                // 拿着全新的 URL，强制发起一次绝对干净的三次握手
                return apiClient(config);
            }
        }

        console.error('API 请求出错了:', error);

        if (error?.response && error.response.status === 401) {
            localStorage.removeItem('translator_token');
            localStorage.removeItem('translator_username');
            toast.error('登录已过期，请重新登录');
            setTimeout(() => window.location.reload(), 1500);
        }

        return Promise.reject(error);
    }
);

export default apiClient;