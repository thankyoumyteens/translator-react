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

// 🚀 新增：定义分页返回的数据结构类型
export interface PaginatedHistoryData {
    items: HistoryItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

export interface HistoryResponse {
    code: number;
    message: string;
    data: PaginatedHistoryData;
}

/**
 * 🚀 更新：获取历史记录接口 (支持分页)
 * @param page 当前页码，默认 1
 * @param pageSize 每页条数，默认 20
 */
export const getHistoryAPI = async (page: number = 1, pageSize: number = 20) => {
    const response = await apiClient.get<HistoryResponse>('/chat/history', {
        params: {
            page: page,
            page_size: pageSize
        }
    });
    return response.data;
};