import { useEffect, useState, useCallback } from 'react';
import { ExternalLink, RefreshCw, MessageCircle, Eye, Heart, AlertCircle } from 'lucide-react';
import type { PostEntry } from '@/lib/socialData';

interface Props {
  source: 'xueqiu' | 'taoguba';
  cookie: string;
  fetchFn: (cookie: string) => Promise<PostEntry[]>;
  tabs: { key: string; label: string }[];
}

export default function PostList({ source, cookie, fetchFn, tabs }: Props) {
  const [posts, setPosts] = useState<PostEntry[]>([]);
  const [filtered, setFiltered] = useState<PostEntry[]>([]);
  const [activeTab, setActiveTab] = useState(tabs[0]?.key || 'all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');

  const load = useCallback(async () => {
    if (!cookie) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchFn(cookie);
      setPosts(data);
      setLastUpdate(new Date().toLocaleTimeString());
      if (data.length === 0) {
        setError('未获取到数据，请检查 Cookie 是否有效，或打开控制台查看详细日志');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '加载失败';
      setError(msg);
      console.error('[PostList] 加载失败:', msg);
    } finally {
      setLoading(false);
    }
  }, [cookie, fetchFn]);

  useEffect(() => { load(); }, [load]);

  // 自动刷新
  useEffect(() => {
    if (!cookie) return;
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [cookie, load]);

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

  if (!cookie) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-fund-fg/60 px-6">
        <AlertCircle size={36} />
        <p className="text-sm">请先在设置中填入 {source === 'xueqiu' ? '雪球' : '淘股吧'} Cookie</p>
        <p className="text-xs text-fund-fg/40 text-center">
          {source === 'xueqiu'
            ? '获取方式：登录雪球 → F12 → Application → Cookies → 复制 xq_a_token'
            : '获取方式：登录淘股吧 → F12 → Application → Cookies → 复制全部 Cookie'}
        </p>
        <a
          href={source === 'xueqiu' ? 'https://xueqiu.com/S/CSI000001' : 'https://www.taoguba.com.cn/'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-fund-up hover:underline mt-2"
        >
          <ExternalLink size={14} /> 在浏览器中打开{source === 'xueqiu' ? '雪球' : '淘股吧'}
        </a>
      </div>
    );
  }

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
                    {post.source === 'xueqiu' ? '雪球' : '淘股吧'}
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
