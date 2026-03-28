// src/api/chat.ts
import apiClient from './axios';
import type {HistoryItem, TranslateParams, TranslateResult} from '../types/chat';

/**
 * 调用 AI 翻译接口
 */
export const translateText = async (params: TranslateParams): Promise<TranslateResult> => {
    // 这里的 '/chat/translate' 会自动和 baseURL 拼接
    const response = await apiClient.post<TranslateResult>('/chat/translate', params);
    return response.data;
};

// 🚀 新增获取历史记录的 API
export const getHistoryAPI = async () => {
    const response = await apiClient.get<{ code: number, message: string, data: HistoryItem[] }>('/chat/history');
    return response.data;
};
