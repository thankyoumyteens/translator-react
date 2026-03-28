// src/api/axios.ts
import axios from 'axios';
import toast from 'react-hot-toast'; // 🚀 1. 引入 toast

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    timeout: 300000, // 5分钟超时，留给 AI 慢慢思考
});

// 🚀 1. 新增请求拦截器：自动注入 Token
apiClient.interceptors.request.use(
    (config) => {
        // 每次发请求前，都去本地存储拿一下 Token
        const token = localStorage.getItem('translator_token');
        if (token) {
            // 如果存在，就按标准的 Bearer 格式放进 Authorization 请求头中
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 🚀 2. 升级响应拦截器：处理 Token 过期
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API 请求出错了:', error);

        // 如果后端返回 401 (Unauthorized)，说明 Token 过期或无效
        if (error.response && error.response.status === 401) {
            // 清除失效的本地登录状态
            localStorage.removeItem('translator_token');
            localStorage.removeItem('translator_username');

            // 提示用户并刷新页面（或者触发全局事件重置状态）
            // 🚀 2. 替换 alert，并延迟 1.5 秒刷新页面，好让用户能看清 Toast 提示
            toast.error('登录已过期，请重新登录');
            window.location.reload();
        }

        return Promise.reject(error);
    }
);

export default apiClient;