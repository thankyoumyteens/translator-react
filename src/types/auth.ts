// src/types/auth.ts

export interface AuthResponse {
    code: number;
    message: string;
    user_id?: number;        // 注册成功时返回
    access_token?: string;   // 登录成功时返回
    token_type?: string;
}