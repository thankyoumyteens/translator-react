// src/components/chat/HistoryDrawer.tsx
import {useEffect, useState} from 'react';
import {X, Clock, Loader2, Inbox, ChevronDown} from 'lucide-react';
import {getHistoryAPI} from '../../api/chat';
import type {HistoryItem} from '../../types/chat';
import toast from 'react-hot-toast';

interface HistoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectItem: (item: HistoryItem) => void;
}

export default function HistoryDrawer({isOpen, onClose, onSelectItem}: HistoryDrawerProps) {
    const [historyList, setHistoryList] = useState<HistoryItem[]>([]);

    // 🚀 分页与加载状态
    const [loading, setLoading] = useState(false);         // 首次加载或刷新
    const [loadingMore, setLoadingMore] = useState(false); // 加载更多中
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // 当抽屉打开时，重置并拉取第一页数据
    useEffect(() => {
        if (isOpen) {
            setPage(1);
            setHasMore(true);
            fetchHistory(1, false);
        } else {
            // 抽屉关闭时清空数据，保证下次打开是干净的
            setHistoryList([]);
        }
    }, [isOpen]);

    // 🚀 核心逻辑：获取数据并处理分页
    const fetchHistory = async (targetPage: number, isLoadMore: boolean) => {
        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const res = await getHistoryAPI(targetPage, 1); // 每页查 20 条

            if (res.code === 200) {
                // ⚠️ 注意这里解构的是后端的嵌套数据
                const {items, total_pages} = res.data;

                if (isLoadMore) {
                    // 如果是加载更多，把新数据追加到旧数据后面
                    setHistoryList(prev => [...prev, ...items]);
                } else {
                    // 如果是首次加载，直接替换
                    setHistoryList(items);
                }

                // 判断是否还有下一页
                setHasMore(targetPage < total_pages);
                setPage(targetPage);
            } else {
                toast.error('获取历史记录失败');
            }
        } catch (error) {
            toast.error('网络请求失败');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            fetchHistory(page + 1, true);
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
                <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-gray-100 shrink-0">
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
                        <>
                            {/* 遍历渲染历史记录 */}
                            {historyList.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => onSelectItem(item)}
                                    className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-blue-200 hover:shadow-md transition-all group"
                                >
                                    <div className="text-xs text-gray-400 mb-2 flex justify-between items-center">
                                        <span>{formatDate(item.created_at)}</span>
                                        <span
                                            className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium">点击回填</span>
                                    </div>
                                    <div className="mb-2">
                                        <span className="text-sm font-semibold text-gray-500 mr-2">原</span>
                                        <span className="text-gray-800 line-clamp-2">{item.original_text}</span>
                                    </div>
                                    <div className="pt-2 border-t border-gray-50">
                                        <span className="text-sm font-semibold text-blue-500 mr-2">译</span>
                                        <span className="text-blue-900 font-medium line-clamp-2">
                                            {item.translated_text.split(';')[0]}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {/* 🚀 加载更多按钮 */}
                            {hasMore ? (
                                <button
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    className="w-full py-3 mt-4 flex items-center justify-center gap-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loadingMore ? (
                                        <>
                                            <Loader2 className="animate-spin" size={16}/>
                                            加载中...
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown size={16}/>
                                            加载更多
                                        </>
                                    )}
                                </button>
                            ) : (
                                <div className="text-center text-xs text-gray-400 py-4">
                                    — 没有更多记录了 —
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}