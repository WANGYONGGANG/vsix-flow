import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, MessageCircle, Eye, Heart } from 'lucide-react';
import type { PostEntry } from '@/lib/socialData';

interface Props {
  fetchFn: () => Promise<PostEntry[]>;
  tabs: { key: string; label: string }[];
}

export default function PostList({ fetchFn, tabs }: Props) {
  const [posts, setPosts] = useState<PostEntry[]>([]);
  const [filtered, setFiltered] = useState<PostEntry[]>([]);
  const [activeTab, setActiveTab] = useState(tabs[0]?.key || 'all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchFn();
      setPosts(data);
      setLastUpdate(new Date().toLocaleTimeString());
      if (data.length === 0) {
        setError('未获取到数据');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '加载失败';
      setError(msg);
      console.error('[PostList] 加载失败:', msg);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => { load(); }, [load]);

  // 自动刷新
  useEffect(() => {
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  // 筛选
  useEffect(() => {
    if (activeTab === 'all') {
      setFiltered(posts);
    } else if (activeTab === 'hot') {
      setFiltered([...posts].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)));
    } else if (activeTab === 'latest') {
      setFiltered([...posts].sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0)));
    } else {
      setFiltered(posts);
    }
  }, [activeTab, posts]);

  return (
    <div className="flex flex-col h-full">
      {/* Tabs + Refresh */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-fund-border">
        <div className="flex items-center gap-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                activeTab === tab.key
                  ? 'bg-fund-up text-white'
                  : 'text-fund-fg/60 hover:bg-fund-card'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && <span className="text-[10px] text-fund-fg/40">更新于 {lastUpdate}</span>}
          <button
            onClick={load}
            disabled={loading}
            className="p-1 rounded hover:bg-fund-card text-fund-fg/60 disabled:opacity-50"
            title="刷新"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 text-xs text-fund-down bg-fund-down/10 border-b border-fund-border">
          {error}
        </div>
      )}

      {/* Posts */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-fund-fg/40 text-sm">
            {loading ? '加载中...' : '暂无数据'}
          </div>
        ) : (
          <div className="divide-y divide-fund-border">
            {filtered.map(post => (
              <a
                key={post.id}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-3 hover:bg-fund-card/50 transition-colors group"
              >
                {/* Header: user + time */}
                <div className="flex items-center gap-2 mb-1.5">
                  {post.avatar && (
                    <img src={post.avatar} alt="" className="w-5 h-5 rounded-full" />
                  )}
                  <span className="text-xs font-medium text-fund-fg/80">{post.user}</span>
                  <span className="text-[10px] text-fund-fg/40">{post.time}</span>
                  <span className="text-[10px] px-1 py-0.5 rounded bg-fund-border/50 text-fund-fg/50 ml-auto">
                    {post.source === 'eastmoney' ? '东财' : post.source === 'xueqiu' ? '雪球' : post.source === 'taoguba' ? '淘股吧' : post.source}
                  </span>
                </div>

                {/* Title */}
                {post.title && (
                  <h3 className="text-sm font-medium text-fund-fg mb-1 group-hover:text-fund-up transition-colors line-clamp-1">
                    {post.title}
                  </h3>
                )}

                {/* Content */}
                <p className="text-xs text-fund-fg/70 line-clamp-2 leading-relaxed">
                  {post.text}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-3 mt-2 text-[10px] text-fund-fg/40">
                  {post.viewCount !== undefined && (
                    <span className="flex items-center gap-0.5">
                      <Eye size={10} /> {formatNum(post.viewCount)}
                    </span>
                  )}
                  {post.likeCount !== undefined && (
                    <span className="flex items-center gap-0.5">
                      <Heart size={10} /> {formatNum(post.likeCount)}
                    </span>
                  )}
                  {post.commentCount !== undefined && (
                    <span className="flex items-center gap-0.5">
                      <MessageCircle size={10} /> {formatNum(post.commentCount)}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}
