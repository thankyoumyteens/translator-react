// src/api/auth.ts
import apiClient from './axios';
import type { AuthResponse } from '../types/auth';

// 登录和注册的参数结构一样，我们可以复用 Record<string, string> 或者明确写出
interface AuthParams {
    username: string;
    password: string;
}

export const loginAPI = async (params: AuthParams): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', params);
    return response.data;
};

export const registerAPI = async (params: AuthParams): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', params);
    return response.data;
};