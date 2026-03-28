// src/types/chat.ts

// 请求参数
export interface TranslateParams {
    text: string;
}

// AI 翻译结果明细
export interface AITranslateResult {
    translated_text: string; // 翻译结果，多个版本用分号分隔
    pronounce: string;       // 美式音标
    comment: string;         // 翻译解析
    pronounce_tips: string;  // 发音与连读技巧
}

// 接口完整响应结构
export interface TranslateResult {
    code: number;
    message: string;
    translated_text: AITranslateResult | null;
}

// 🚀 新增历史记录的类型
export interface HistoryItem {
    id: number;
    original_text: string;
    translated_text: string;
    pronounce?: string;
    pronounce_tips?: string;
    comment?: string;
    created_at: string;
}
