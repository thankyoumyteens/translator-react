// src/components/auth/AuthModal.tsx
import {useState} from 'react';
import {X, UserCircle2, KeyRound, Loader2} from 'lucide-react';
import {loginAPI, registerAPI} from '../../api/auth';
// 🚀 1. 引入 toast
import toast from 'react-hot-toast';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (username: string) => void; // 登录/注册成功后的回调
}

export default function AuthModal({isOpen, onClose, onSuccess}: AuthModalProps) {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setErrorMsg('用户名和密码不能为空');
            return;
        }

        setLoading(true);
        setErrorMsg('');

        try {
            if (isLoginMode) {
                // 执行登录
                const res = await loginAPI({username, password});
                if (res.code === 200 && res.access_token) {
                    localStorage.setItem('translator_token', res.access_token);
                    localStorage.setItem('translator_username', username);
                    onSuccess(username);
                } else {
                    setErrorMsg(res.message || '登录失败');
                }
            } else {
                // 执行注册
                const res = await registerAPI({username, password});
                if (res.code === 200) {
                    // 注册成功后，直接帮用户切换到登录模式并提示
                    // 🚀 2. 替换这里的 alert
                    toast.success('注册成功！请登录');
                    setIsLoginMode(true);
                    setPassword(''); // 清空密码让用户重输一遍更安全
                } else {
                    setErrorMsg(res.message || '注册失败');
                }
            }
        } catch (error: any) {
            // 捕获 Axios 拦截器抛出的 400/401 等错误
            const msg = error.response?.data?.detail || '网络请求失败，请检查后端服务';
            setErrorMsg(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        // 遮罩层
        <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-end sm:items-center animate-in fade-in duration-200">

            {/* 弹窗主体 */}
            <div
                className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">

                {/* 头部 */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">
                        {isLoginMode ? '欢迎回来' : '创建新账号'}
                    </h2>
                    <button onClick={onClose}
                            className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 active:scale-95 transition-all">
                        <X size={20}/>
                    </button>
                </div>

                {/* 错误提示 */}
                {errorMsg && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                        {errorMsg}
                    </div>
                )}

                {/* 表单 */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <UserCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                        <input
                            type="text"
                            placeholder="请输入用户名"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                    </div>

                    <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                        <input
                            type="password"
                            placeholder="请输入密码"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 mt-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-95 transition-all flex justify-center items-center disabled:opacity-70 disabled:active:scale-100"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20}/> : (isLoginMode ? '登 录' : '注 册')}
                    </button>
                </form>

                {/* 模式切换 */}
                <div className="mt-6 text-center text-sm text-gray-500">
                    {isLoginMode ? "还没有账号？" : "已有账号？"}
                    <button
                        type="button"
                        onClick={() => {
                            setIsLoginMode(!isLoginMode);
                            setErrorMsg('');
                        }}
                        className="ml-1 text-blue-600 font-semibold hover:underline"
                    >
                        {isLoginMode ? '立即注册' : '直接登录'}
                    </button>
                </div>

            </div>
        </div>
    );
}