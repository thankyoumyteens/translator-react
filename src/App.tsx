// src/App.tsx
import {useState, useEffect} from 'react';
import {SendHorizontal, LogOut, User, Clock, Trash2} from 'lucide-react';
import HistoryDrawer from './components/chat/HistoryDrawer';
import type {AITranslateResult, HistoryItem} from './types/chat';
import {translateText} from './api/chat';
import AuthModal from './components/auth/AuthModal'; // 引入刚刚写的鉴权组件
// 🚀 1. 引入 toast 和 Toaster
import toast, {Toaster} from 'react-hot-toast';

function App() {
    // --- 翻译业务状态 ---
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AITranslateResult | null>(null);

    // --- 用户鉴权状态 ---
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<string | null>(null);

    const [isHistoryOpen, setIsHistoryOpen] = useState(false); // 🚀 新增控制抽屉的状态

    // 页面加载时，检查本地是否已经有登录状态
    useEffect(() => {
        const savedUser = localStorage.getItem('translator_username');
        if (savedUser) {
            setCurrentUser(savedUser);
        }
    }, []);

    // 退出登录逻辑
    const handleLogout = () => {
        localStorage.removeItem('translator_token');
        localStorage.removeItem('translator_username');
        setCurrentUser(null);
    };

    // 🚀 新增：处理历史记录项的点击回填逻辑
    const handleSelectHistoryItem = (item: HistoryItem) => {
        // 1. 将原文填入输入框
        setInputText(item.original_text);

        // 2. 将之前完整的翻译结果填入结果卡片状态
        // 我们不需要在这个阶段调用后端，直接把历史数据里的翻译展示出来即可
        setResult({
            translated_text: item.translated_text,
            pronounce: item.pronounce || '', // 处理后端可能为空的情况
            pronounce_tips: item.pronounce_tips || '',
            comment: item.comment || ''
        });

        // 3. 自动关闭历史抽屉
        setIsHistoryOpen(false);
    };

    // 🚀 新增：一键清空逻辑
    const handleClear = () => {
        setInputText('');
        setResult(null); // 同时清空下面的翻译结果卡片
    };

    // 发送翻译请求
    const handleTranslate = async () => {
        if (!inputText.trim() || loading) return;

        setLoading(true);
        setResult(null);

        try {
            const res = await translateText({text: inputText.trim()});
            if (res.code === 200 && res.translated_text) {
                setResult(res.translated_text);
            } else {
                // 🚀 2. 替换丑陋的 alert
                toast.error(res.message || "翻译失败了，请稍后再试");
            }
        } catch (error) {
            // 🚀 3. 替换丑陋的 alert
            toast.error("网络请求失败！请检查后端服务是否正常。");
        } finally {
            setLoading(false);
        }
    };

    // 复制结果到剪贴板
    const handleCopy = () => {
        if (result) {
            const textToCopy = `${result.translated_text}\n\n[发音]: ${result.pronounce}`;
            navigator.clipboard.writeText(textToCopy);
            // 🚀 4. 替换丑陋的 alert
            toast.success('已复制到剪贴板');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
            {/* 🚀 5. 在最外层挂载 Toaster 组件 */}
            <Toaster
                position="top-center"
                toastOptions={{
                    style: {
                        borderRadius: '12px',
                        background: '#333',
                        color: '#fff',
                        fontSize: '14px',
                    },
                }}
            />
            <main className="max-w-md mx-auto min-h-screen bg-white shadow-sm flex flex-col relative">

                {/* 🌟 1. 顶部标题栏 & 个人中心入口 */}
                <header
                    className="px-5 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        地道口语翻译
                    </h1>

                    <div>
                        {currentUser ? (
                            // 已登录状态
                            <div
                                className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                    <User size={14} className="text-blue-500"/>
                                    <span className="max-w-[80px] truncate">{currentUser}</span>
                                </div>
                                <div className="w-px h-4 bg-gray-200"></div>
                                {/* 🚀 新增：历史记录按钮 */}
                                <button
                                    onClick={() => setIsHistoryOpen(true)}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                                    title="历史记录"
                                >
                                    <Clock size={16}/>
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                    title="退出登录"
                                >
                                    <LogOut size={16}/>
                                </button>
                            </div>
                        ) : (
                            // 未登录状态
                            <button
                                onClick={() => setIsAuthModalOpen(true)}
                                className="text-sm font-medium text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full hover:bg-blue-100 active:scale-95 transition-all"
                            >
                                登录 / 注册
                            </button>
                        )}
                    </div>
                </header>

                <div className="flex-1 p-5 flex flex-col gap-6 overflow-y-auto pb-32">
                    {/* --- 输入区域 --- */}
                    <section
                        className="bg-gray-50 rounded-2xl p-4 border border-gray-100 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="输入你想翻译的英文，比如：Hello, I am a student."
                className="w-full bg-transparent resize-none outline-none text-lg min-h-[100px] placeholder-gray-400"
            />
                        {/* 🚀 核心修改：调整按钮区域布局 */}
                        <div className="flex justify-between items-center mt-2">
                            {/* 左侧：清空按钮 (仅在有输入内容时显示) */}
                            <div className="flex-1">
                                {inputText.length > 0 && (
                                    <button
                                        onClick={handleClear}
                                        disabled={loading} // 🚀 核心逻辑：loading 时禁用点击
                                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all ${
                                            loading
                                                ? 'text-gray-300 cursor-not-allowed' // 禁用状态的 UI：文字变浅且鼠标变红圈
                                                : 'text-gray-400 hover:text-red-500 hover:bg-red-50' // 正常状态的 UI
                                        }`}
                                        title="清空内容"
                                    >
                                        <Trash2 size={16}/>
                                        <span>清空</span>
                                    </button>
                                )}
                            </div>
                            {/* 右侧：原有的发送按钮 */}
                            <button
                                onClick={handleTranslate}
                                disabled={!inputText.trim() || loading}
                                className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center shadow-sm"
                            >
                                {loading ? (
                                    <div
                                        className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <SendHorizontal size={20}/>
                                )}
                            </button>
                        </div>
                    </section>

                    {/* --- 结果展示区域 --- */}
                    {result && (
                        <section className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* 卡片A：地道表达 */}
                            <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100">
                                <div className="flex justify-between items-start mb-3">
                                    <h2 className="text-sm font-semibold text-blue-600 flex items-center gap-1">
                                        🗣️ 地道表达
                                    </h2>
                                    {/*<div className="flex gap-2 text-gray-400">*/}
                                    {/*    /!* 发音按钮预留了位置，后续可以接入浏览器的 Web Speech API *!/*/}
                                    {/*    <button className="hover:text-blue-600 transition-colors p-1"><Volume2*/}
                                    {/*        size={18}/></button>*/}
                                    {/*    <button onClick={handleCopy}*/}
                                    {/*            className="hover:text-blue-600 transition-colors p-1"><Copy size={18}/>*/}
                                    {/*    </button>*/}
                                    {/*</div>*/}
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

                            {/* 卡片B：发音教练 */}
                            <div className="bg-amber-50/50 rounded-2xl p-5 border border-amber-100">
                                <h2 className="text-sm font-semibold text-amber-600 mb-3 flex items-center gap-1">
                                    🎙️ 发音与连读
                                </h2>
                                <div
                                    className="bg-white rounded-lg p-3 mb-3 font-mono text-sm text-gray-700 border border-amber-50">
                                    {result.pronounce}
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                    {result.pronounce_tips}
                                </p>
                            </div>

                        </section>
                    )}
                </div>

                {/* 🌟 2. 挂载鉴权弹窗 */}
                <AuthModal
                    isOpen={isAuthModalOpen}
                    onClose={() => setIsAuthModalOpen(false)}
                    onSuccess={(username) => {
                        setCurrentUser(username);
                        setIsAuthModalOpen(false); // 登录成功后自动关闭弹窗
                    }}
                />

                {/* 🚀 新增：挂载历史记录抽屉 */}
                <HistoryDrawer
                    isOpen={isHistoryOpen}
                    onClose={() => setIsHistoryOpen(false)}
                    onSelectItem={handleSelectHistoryItem} // 🚀 关键修改：传递回调函数
                />

            </main>
        </div>
    );
}

export default App;