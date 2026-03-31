// src/App.tsx
import {useState, useEffect, useRef} from 'react';
import {SendHorizontal, LogOut, User, Clock, Trash2, BrainCircuit, Square} from 'lucide-react';
import HistoryDrawer from './components/chat/HistoryDrawer';
import type {AITranslateResult, HistoryItem} from './types/chat';
import AuthModal from './components/auth/AuthModal';
import toast, {Toaster} from 'react-hot-toast';
import {fetchEventSource} from '@microsoft/fetch-event-source';

function App() {
    // --- 翻译业务状态 ---
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AITranslateResult | null>(null);

    // --- 流式输出专属状态 ---
    const [thinkingContent, setThinkingContent] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [rawJsonContent, setRawJsonContent] = useState('');

    // 🚀 1. 新增：用于在后台静默接收数据的内存蓄水池
    const thinkingBufferRef = useRef('');
    const jsonBufferRef = useRef('');

    // 🚀 1. 新增：用于获取“思考框” DOM 节点，以实现自动滚动
    const thinkingScrollRef = useRef<HTMLDivElement>(null);

    // 🚀 2. 新增：网络请求中断控制器
    const abortControllerRef = useRef<AbortController | null>(null);

    // --- 用户鉴权状态 ---
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // 🚀 1. 新增：存储唤醒锁的引用
    const wakeLockRef = useRef<any>(null);

    // 🚀 2. 新增：申请保持屏幕常亮的函数
    // Wake Lock API 是现代浏览器的高级安全特性，
    // 它有一个硬性前置条件：你的网站必须运行在 HTTPS 环境下
    // （本地开发时的 http://localhost 是唯一的例外豁免权）。
    const requestWakeLock = async () => {
        try {
            // 检查浏览器是否支持 Wake Lock API
            if ('wakeLock' in navigator) {
                wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
                console.log('💡 屏幕唤醒锁已激活，将保持常亮');
            }
        } catch (err) {
            console.warn('⚠️ 屏幕唤醒锁申请失败:', err);
        }
    };

    // 🚀 3. 新增：释放屏幕唤醒锁的函数
    const releaseWakeLock = () => {
        if (wakeLockRef.current !== null) {
            wakeLockRef.current.release()
                .then(() => {
                    console.log('🌙 屏幕唤醒锁已释放，恢复系统默认息屏策略');
                    wakeLockRef.current = null;
                });
        }
    };

    useEffect(() => {
        const savedUser = localStorage.getItem('translator_username');
        if (savedUser) {
            setCurrentUser(savedUser);
        }
    }, []);

    // 🚀 2. 新增：监听思考内容的变化，自动将滚动条推到底部
    useEffect(() => {
        if (thinkingScrollRef.current) {
            // 使用 scrollTop = scrollHeight 实现极其跟手的无延迟滚动
            thinkingScrollRef.current.scrollTop = thinkingScrollRef.current.scrollHeight;
        }
    }, [thinkingContent]);

    // 🚀 2. 新增：监听浏览器标签页切换事件
    // 🚀 4. 升级：监听浏览器标签页切换事件
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                // 恢复内存蓄水池的数据
                setThinkingContent(thinkingBufferRef.current);
                setRawJsonContent(jsonBufferRef.current);

                // 💡 极其关键：如果切回来时还在 loading，必须重新申请唤醒锁
                if (loading && wakeLockRef.current === null) {
                    requestWakeLock();
                }
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        // 组件卸载时也要记得释放锁
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            releaseWakeLock();
        };
    }, [loading]); // 注意这里把 loading 加入了依赖项

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

    // 🚀 3. 新增：手动停止生成的逻辑
    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort(); // 发送中断信号
            abortControllerRef.current = null;
        }
        setLoading(false);
        setIsThinking(false);
        setThinkingContent('');
        setRawJsonContent('');
        releaseWakeLock();
        toast('已取消生成', {icon: '🛑'});
    };

    const handleTranslate = async () => {
        if (!inputText.trim() || loading) return;

        setLoading(true);
        setResult(null);
        setThinkingContent('');
        setRawJsonContent('');
        setIsThinking(true);

        // 🚀 每次新请求前，清空内存蓄水池
        thinkingBufferRef.current = '';
        jsonBufferRef.current = '';

        // 🚀 4. 每次发请求前，实例化一个新的中断控制器
        abortControllerRef.current = new AbortController();

        // 🚀 5. 发起请求前，立刻申请屏幕常亮！
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
                body: JSON.stringify({text: inputText.trim()}),
                signal: abortControllerRef.current.signal, // 🚀 5. 将中断信号与请求绑定
                onmessage(ev) {
                    try {
                        const data = JSON.parse(ev.data);

                        if (data.type === 'thinking') {
                            // 🚀 先将数据悄悄存入蓄水池
                            thinkingBufferRef.current += data.content;
                            // 🚀 只有在页面可见时，才打扰 React 触发昂贵的 UI 渲染
                            if (!document.hidden) {
                                setThinkingContent(thinkingBufferRef.current);
                            }
                        } else if (data.type === 'content') {
                            setIsThinking(false);
                            // 🚀 同理，存入 JSON 蓄水池
                            jsonBufferRef.current += data.content;
                            if (!document.hidden) {
                                setRawJsonContent(jsonBufferRef.current);
                            }
                        } else if (data.type === 'finish') {
                            setResult(data.result);
                            setLoading(false);
                            releaseWakeLock(); // 🚀 成功收到最终结果，释放唤醒锁
                        } else if (data.type === 'error') {
                            toast.error(data.message || "流式解析中断");
                            setLoading(false);
                            releaseWakeLock(); // 🚀 报错中断，释放唤醒锁
                            throw new Error(data.message);
                        }
                    } catch (e) {
                        console.error("解析流数据失败:", e);
                    }
                },
                onerror(err) {
                    // 🚀 防止中止时触发底层的错误重试机制
                    if (abortControllerRef.current?.signal.aborted) {
                        throw err;
                    }
                    toast.error("网络连接断开，请检查后端服务");
                    setLoading(false);
                    releaseWakeLock(); // 🚀 网络断开，释放唤醒锁
                    throw err;
                },
                onclose() {
                    setLoading(false);
                    releaseWakeLock(); // 🚀 流正常关闭，兜底释放唤醒锁
                }
            });
        } catch (error) {
            // 🚀 6. 捕获中断异常，使用 instanceof Error 进行安全的类型收窄
            if (error instanceof Error && error.name === 'AbortError') {
                console.log('用户手动终止了请求');
            } else {
                // 可选：如果是其他未知报错，可以在这里打印排查
                console.error('流式请求发生未知错误:', error);
            }
            setLoading(false);
            releaseWakeLock(); // 🚀 外层 try-catch 兜底释放
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
                        <div className="flex justify-between items-center mt-2">
                            <div className="flex-1">
                                {inputText.length > 0 && (
                                    <button onClick={handleClear} disabled={loading}
                                            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all ${loading ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                                            title="清空内容">
                                        <Trash2 size={16}/>
                                        <span>清空</span>
                                    </button>
                                )}
                            </div>
                            {/* 🚀 7. 动态渲染的 发送 / 停止 按钮 */}
                            <button
                                onClick={loading ? handleStop : handleTranslate}
                                disabled={!inputText.trim() && !loading}
                                className={`p-3 rounded-xl flex items-center justify-center shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${
                                    loading
                                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                                title={loading ? "停止生成" : "发送翻译"}
                            >
                                {loading ? (
                                    <Square size={18} fill="currentColor" className="animate-in zoom-in duration-200"/>
                                ) : (
                                    <SendHorizontal size={20} className="animate-in zoom-in duration-200"/>
                                )}
                            </button>
                        </div>
                    </section>

                    {/* 🚀 优化 1：定高 + 内部自动滚动的思考框 */}
                    {loading && isThinking && thinkingContent && (
                        <section
                            className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-4 animate-in fade-in duration-300 flex flex-col">
                            <h2 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1.5 shrink-0">
                                <BrainCircuit size={14} className="animate-pulse text-blue-400"/>
                                AI 正在深度思考...
                            </h2>
                            {/* 设置固定最大高度 max-h-40，超出自动显示滚动条 */}
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

                    {/* 🚀 优化 2：优雅的骨架屏（Skeleton），彻底隐藏底层 JSON 数据 */}
                    {loading && !isThinking && rawJsonContent && !result && (
                        <section
                            className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm animate-in fade-in duration-300">
                            <div className="flex items-center gap-3 text-blue-500 mb-4">
                                <div
                                    className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-sm font-medium">正在生成精美排版...</span>
                            </div>

                            {/* 骨架动画：模拟文本生成的占位符 */}
                            <div className="space-y-3">
                                <div className="h-4 bg-gray-100 rounded-md w-3/4 animate-pulse"></div>
                                <div className="h-4 bg-gray-100 rounded-md w-1/2 animate-pulse"></div>
                                <div className="h-4 bg-gray-100 rounded-md w-5/6 animate-pulse"></div>
                            </div>
                        </section>
                    )}

                    {result && !loading && (
                        <section className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-500">
                            <div
                                className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100 shadow-sm hover:shadow transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <h2 className="text-sm font-semibold text-blue-600 flex items-center gap-1">
                                        🗣️ 地道表达
                                    </h2>
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