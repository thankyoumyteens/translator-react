// src/App.tsx
import {useState, useEffect, useRef} from 'react';
import {SendHorizontal, LogOut, User, Clock, Trash2, BrainCircuit, Square, Sparkles, RefreshCw} from 'lucide-react';import HistoryDrawer from './components/chat/HistoryDrawer';
import type {AITranslateResult, HistoryItem} from './types/chat';
import AuthModal from './components/auth/AuthModal';
import toast, {Toaster} from 'react-hot-toast';
import {fetchEventSource} from '@microsoft/fetch-event-source';

// 🚀 新增：定义模型的数据类型
type AIModel = {
    id: string;
    name: string;
    is_default?: boolean;
};

function App() {
    // --- 翻译业务状态 ---
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AITranslateResult | null>(null);

    // 🚀 新增：模型选择相关的状态
    const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('');

    // --- 流式输出专属状态 ---
    const [thinkingContent, setThinkingContent] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [rawJsonContent, setRawJsonContent] = useState('');

    const thinkingBufferRef = useRef('');
    const jsonBufferRef = useRef('');
    const thinkingScrollRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // --- 用户鉴权状态 ---
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const wakeLockRef = useRef<any>(null);

    const requestWakeLock = async () => {
        try {
            if ('wakeLock' in navigator) {
                wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
                console.log('💡 屏幕唤醒锁已激活，将保持常亮');
            }
        } catch (err) {
            console.warn('⚠️ 屏幕唤醒锁申请失败:', err);
        }
    };

    const releaseWakeLock = () => {
        if (wakeLockRef.current !== null) {
            wakeLockRef.current.release()
                .then(() => {
                    console.log('🌙 屏幕唤醒锁已释放，恢复系统默认息屏策略');
                    wakeLockRef.current = null;
                });
        }
    };

    // 🚀 新增：组件挂载时，去后端拉取可用的模型列表
    useEffect(() => {
        const fetchModels = async () => {
            try {
                const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
                const response = await fetch(`${baseUrl}/chat/models`);
                const resJson = await response.json();

                if (resJson.code === 200 && resJson.data.length > 0) {
                    setAvailableModels(resJson.data);
                    // 找出后端标记的默认模型，如果没有就用第一个
                    const defaultModel = resJson.data.find((m: AIModel) => m.is_default) || resJson.data[0];
                    setSelectedModel(defaultModel.id);
                }
            } catch (error) {
                console.error('获取模型列表失败:', error);
                toast.error('获取模型列表失败，请检查网络');
            }
        };

        fetchModels();
    }, []);

    useEffect(() => {
        const savedUser = localStorage.getItem('translator_username');
        if (savedUser) {
            setCurrentUser(savedUser);
        }
    }, []);

    useEffect(() => {
        if (thinkingScrollRef.current) {
            thinkingScrollRef.current.scrollTop = thinkingScrollRef.current.scrollHeight;
        }
    }, [thinkingContent]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                setThinkingContent(thinkingBufferRef.current);
                setRawJsonContent(jsonBufferRef.current);

                if (loading && wakeLockRef.current === null) {
                    requestWakeLock();
                }
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            releaseWakeLock();
        };
    }, [loading]);

    const handleLogout = () => {
        localStorage.removeItem('translator_token');
        localStorage.removeItem('translator_username');
        setCurrentUser(null);
    };

    const handleSelectHistoryItem = (item: HistoryItem) => {
        setInputText(item.original_text);
        setResult({
            translated_text: item.translated_text,
            pronounce: item.pronounce || '',
            pronounce_tips: item.pronounce_tips || '',
            comment: item.comment || ''
        });
        setIsHistoryOpen(false);
    };

    const handleClear = () => {
        setInputText('');
        setResult(null);
        setThinkingContent('');
        setRawJsonContent('');
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setLoading(false);
        setIsThinking(false);
        setThinkingContent('');
        setRawJsonContent('');
        releaseWakeLock();
        toast('已取消生成', {icon: '🛑'});
    };

    // 🚀 给函数增加一个默认值为 false 的 isRetry 参数
    const handleTranslate = async (isRetry = false) => {
        if (!inputText.trim() || loading) return;

        // 🚀 确保模型已经加载完毕并被选中
        if (!selectedModel) {
            toast.error("AI 模型列表尚未加载完成");
            return;
        }

        setLoading(true);
        setResult(null);
        setThinkingContent('');
        setRawJsonContent('');
        setIsThinking(true);

        thinkingBufferRef.current = '';
        jsonBufferRef.current = '';

        abortControllerRef.current = new AbortController();
        await requestWakeLock();

        const token = localStorage.getItem('translator_token');
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';

        try {
            await fetchEventSource(`${baseUrl}/chat/translate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? {Authorization: `Bearer ${token}`} : {})
                },
                // 🚀 将 selectedModel 塞入 payload 传给后端
                body: JSON.stringify({
                    text: inputText.trim(),
                    model_id: selectedModel,
                    force_refresh: isRetry // 🚀 把参数传给后端
                }),
                signal: abortControllerRef.current.signal,
                onmessage(ev) {
                    try {
                        const data = JSON.parse(ev.data);

                        if (data.type === 'thinking') {
                            thinkingBufferRef.current += data.content;
                            if (!document.hidden) {
                                setThinkingContent(thinkingBufferRef.current);
                            }
                        } else if (data.type === 'content') {
                            setIsThinking(false);
                            jsonBufferRef.current += data.content;
                            if (!document.hidden) {
                                setRawJsonContent(jsonBufferRef.current);
                            }
                        } else if (data.type === 'finish') {
                            setResult(data.result);
                            setLoading(false);
                            releaseWakeLock();
                        } else if (data.type === 'error') {
                            toast.error(data.message || "流式解析中断");
                            setLoading(false);
                            releaseWakeLock();
                            throw new Error(data.message);
                        }
                    } catch (e) {
                        console.error("解析流数据失败:", e);
                    }
                },
                onerror(err) {
                    if (abortControllerRef.current?.signal.aborted) {
                        throw err;
                    }
                    toast.error("网络连接断开，请检查后端服务");
                    setLoading(false);
                    releaseWakeLock();
                    throw err;
                },
                onclose() {
                    setLoading(false);
                    releaseWakeLock();
                }
            });
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.log('用户手动终止了请求');
            } else {
                console.error('流式请求发生未知错误:', error);
            }
            setLoading(false);
            releaseWakeLock();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
            <Toaster position="top-center" toastOptions={{
                style: {
                    borderRadius: '12px',
                    background: '#333',
                    color: '#fff',
                    fontSize: '14px'
                }
            }}/>
            <main className="max-w-md mx-auto min-h-screen bg-white shadow-sm flex flex-col relative">

                <header
                    className="px-5 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        地道口语翻译
                    </h1>
                    <div>
                        {currentUser ? (
                            <div
                                className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                    <User size={14} className="text-blue-500"/>
                                    <span className="max-w-[80px] truncate">{currentUser}</span>
                                </div>
                                <div className="w-px h-4 bg-gray-200"></div>
                                <button onClick={() => setIsHistoryOpen(true)}
                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                                        title="历史记录">
                                    <Clock size={16}/>
                                </button>
                                <button onClick={handleLogout}
                                        className="text-gray-400 hover:text-red-500 transition-colors" title="退出登录">
                                    <LogOut size={16}/>
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setIsAuthModalOpen(true)}
                                    className="text-sm font-medium text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full hover:bg-blue-100 active:scale-95 transition-all">
                                登录 / 注册
                            </button>
                        )}
                    </div>
                </header>

                <div className="flex-1 p-5 flex flex-col gap-6 overflow-y-auto pb-32">
                    <section
                        className={`bg-gray-50 rounded-2xl p-4 border transition-all ${loading ? 'border-gray-200 opacity-70' : 'border-gray-100 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100'}`}>
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            disabled={loading}
                            placeholder="输入你想翻译的英文，比如：Hello, I am a student."
                            className="w-full bg-transparent resize-none outline-none text-lg min-h-[100px] placeholder-gray-400 disabled:cursor-not-allowed"
                        />

                        {/* 🚀 底部工具栏优化：模型选择器 + 清空按钮 + 发送按钮 */}
                        <div className="flex justify-between items-end mt-3 gap-2">
                            <div className="flex-1 flex flex-col items-start gap-2">
                                {/* 模型选择下拉框 */}
                                <div className="relative flex items-center w-full max-w-[200px]">
                                    <div className="absolute left-2.5 text-blue-500 pointer-events-none">
                                        <Sparkles size={14}/>
                                    </div>
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        disabled={loading || availableModels.length === 0}
                                        className="w-full bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg pl-8 pr-6 py-2 outline-none appearance-none cursor-pointer hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm truncate"
                                        title="选择背后的 AI 模型"
                                    >
                                        {availableModels.length === 0 ? (
                                            <option value="">模型加载中...</option>
                                        ) : (
                                            availableModels.map(model => (
                                                <option key={model.id} value={model.id}>
                                                    {model.name}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                    {/* 下拉箭头遮罩 */}
                                    <div className="absolute right-2 pointer-events-none text-gray-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                  d="M19 9l-7 7-7-7"></path>
                                        </svg>
                                    </div>
                                </div>

                                {/* 清空按钮 (仅在有输入时显示) */}
                                {inputText.length > 0 && (
                                    <button onClick={handleClear} disabled={loading}
                                            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md transition-all ${loading ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                                            title="清空内容">
                                        <Trash2 size={14}/>
                                        <span>清空文本</span>
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={loading ? handleStop : () => handleTranslate(false)}
                                disabled={!inputText.trim() && !loading}
                                className={`p-3.5 rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shrink-0 ${
                                    loading
                                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-red-200'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                                }`}
                                title={loading ? "停止生成" : "发送翻译"}
                            >
                                {loading ? (
                                    <Square size={20} fill="currentColor" className="animate-in zoom-in duration-200"/>
                                ) : (
                                    <SendHorizontal size={20} className="animate-in zoom-in duration-200"/>
                                )}
                            </button>
                        </div>
                    </section>

                    {/* 思考框 */}
                    {loading && isThinking && thinkingContent && (
                        <section
                            className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-4 animate-in fade-in duration-300 flex flex-col">
                            <h2 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1.5 shrink-0">
                                <BrainCircuit size={14} className="animate-pulse text-blue-400"/>
                                AI 正在深度思考...
                            </h2>
                            <div
                                ref={thinkingScrollRef}
                                className="flex-1 max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200"
                            >
                                <p className="text-sm text-gray-500 whitespace-pre-wrap leading-relaxed">
                                    {thinkingContent}
                                    <span className="inline-block w-1.5 h-3.5 bg-gray-400 ml-1 animate-pulse"></span>
                                </p>
                            </div>
                        </section>
                    )}

                    {/* 骨架屏 */}
                    {loading && !isThinking && rawJsonContent && !result && (
                        <section
                            className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm animate-in fade-in duration-300">
                            <div className="flex items-center gap-3 text-blue-500 mb-4">
                                <div
                                    className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-sm font-medium">正在生成精美排版...</span>
                            </div>

                            <div className="space-y-3">
                                <div className="h-4 bg-gray-100 rounded-md w-3/4 animate-pulse"></div>
                                <div className="h-4 bg-gray-100 rounded-md w-1/2 animate-pulse"></div>
                                <div className="h-4 bg-gray-100 rounded-md w-5/6 animate-pulse"></div>
                            </div>
                        </section>
                    )}

                    {/* 结果渲染 */}
                    {result && !loading && (
                        <section className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-500">
                            <div
                                className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100 shadow-sm hover:shadow transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <h2 className="text-sm font-semibold text-blue-600 flex items-center gap-1">
                                        🗣️ 地道表达
                                    </h2>
                                    {/* 🚀 升级版：更显眼、防误触的重新生成按钮 */}
                                    <button
                                        onClick={() => handleTranslate(true)}
                                        disabled={loading}
                                        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 hover:border-blue-200 px-3 py-1.5 rounded-full shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="跳过缓存，使用当前模型重新翻译"
                                    >
                                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                                        {loading ? '生成中...' : '换个说法'}
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {result.translated_text.split(';').map((text, idx) => (
                                        <p key={idx} className="text-lg font-medium text-gray-900">
                                            {text.trim()}
                                        </p>
                                    ))}
                                </div>
                                <div className="mt-4 pt-4 border-t border-blue-100/50">
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        <span className="font-semibold mr-1">💡 解析:</span>
                                        {result.comment}
                                    </p>
                                </div>
                            </div>

                            <div
                                className="bg-amber-50/50 rounded-2xl p-5 border border-amber-100 shadow-sm hover:shadow transition-all">
                                <h2 className="text-sm font-semibold text-amber-600 mb-3 flex items-center gap-1">
                                    🎙️ 发音与连读
                                </h2>
                                <div
                                    className="bg-white rounded-lg p-3 mb-3 font-mono text-sm text-gray-700 border border-amber-50 shadow-inner">
                                    {result.pronounce}
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                    {result.pronounce_tips}
                                </p>
                            </div>
                        </section>
                    )}
                </div>

                <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onSuccess={(username) => {
                    setCurrentUser(username);
                    setIsAuthModalOpen(false);
                }}/>
                <HistoryDrawer isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)}
                               onSelectItem={handleSelectHistoryItem}/>
            </main>
        </div>
    );
}

export default App;