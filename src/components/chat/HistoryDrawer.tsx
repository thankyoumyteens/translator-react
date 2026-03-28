// src/components/chat/HistoryDrawer.tsx
import {useEffect, useState} from 'react';
import {X, Clock, Loader2, Inbox} from 'lucide-react';
import {getHistoryAPI} from '../../api/chat';
import type {HistoryItem} from '../../types/chat';
import toast from 'react-hot-toast';

interface HistoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectItem: (item: HistoryItem) => void; // 🚀 新增：当选择某一项时的回调函数
}

export default function HistoryDrawer({isOpen, onClose, onSelectItem}: HistoryDrawerProps) {
    const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(false);

    // 当抽屉打开时，去后端拉取数据
    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await getHistoryAPI();
            if (res.code === 200) {
                setHistoryList(res.data);
            } else {
                toast.error('获取历史记录失败');
            }
        } catch (error) {
            toast.error('网络请求失败');
        } finally {
            setLoading(false);
        }
    };

    // 格式化时间显示
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <>
            {/* 背景遮罩 */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* 侧边抽屉 */}
            <div
                className={`fixed inset-y-0 right-0 w-full sm:w-[400px] bg-gray-50 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* 头部 */}
                <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Clock className="text-blue-500" size={20}/>
                        翻译历史
                    </h2>
                    <button onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
                        <X size={20}/>
                    </button>
                </div>

                {/* 内容列表区 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-3">
                            <Loader2 className="animate-spin" size={24}/>
                            <span className="text-sm">加载中...</span>
                        </div>
                    ) : historyList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
                            <Inbox size={40} className="text-gray-300"/>
                            <span className="text-sm">暂无翻译记录</span>
                        </div>
                    ) : (
                        historyList.map((item) => (
                            // 🚀 核心修改点：
                            // 1. 增加 onClick 事件，调用 onSelectItem
                            // 2. 增加 cursor-pointer（手型光标）
                            // 3. 增加 hover:border-blue-200（悬停时边框高亮）
                            // 4. 增加 hover:shadow-md（悬停时阴影加深）
                            <div
                                key={item.id}
                                onClick={() => onSelectItem(item)} // 🚀 点击调用回调
                                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-blue-200 hover:shadow-md transition-all group"
                            >
                                <div className="text-xs text-gray-400 mb-2 flex justify-between">
                                    <span>{formatDate(item.created_at)}</span>
                                    {/* 可选：加个“回填”小图标提示用户 */}
                                    <span
                                        className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium">点击回填</span>
                                </div>
                                <div className="mb-2">
                                    <span className="text-sm font-semibold text-gray-500 mr-2">原</span>
                                    <span className="text-gray-800">{item.original_text}</span>
                                </div>
                                <div className="pt-2 border-t border-gray-50">
                                    <span className="text-sm font-semibold text-blue-500 mr-2">译</span>
                                    <span className="text-blue-900 font-medium">
                    {/* 只展示第一句翻译，保持列表清爽 */}
                                        {item.translated_text.split(';')[0]}
                  </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}