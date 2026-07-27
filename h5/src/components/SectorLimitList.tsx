import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Layers, Factory } from 'lucide-react';
import { fetchSectorLimitStats, type SectorStat } from '@/lib/socialData';

type TabKey = 'all' | 'concept' | 'industry';
type SortKey = 'upCount' | 'changeRate' | 'changeAmount';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'concept', label: '概念板块' },
  { key: 'industry', label: '行业板块' },
];

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'upCount', label: '按涨停数' },
  { key: 'changeRate', label: '按涨跌幅' },
  { key: 'changeAmount', label: '按涨跌额' },
];

export default function SectorLimitList() {
  const [sectors, setSectors] = useState<SectorStat[]>([]);
  const [filtered, setFiltered] = useState<SectorStat[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [sortBy, setSortBy] = useState<SortKey>('upCount');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSectorLimitStats();
      setSectors(data);
      setLastUpdate(new Date().toLocaleTimeString());
      if (data.length === 0) {
        setError('未获取到板块数据');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '加载失败';
      setError(msg);
      console.error('[SectorLimitList] 加载失败:', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // 自动刷新
  useEffect(() => {
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  // 筛选 + 排序
  useEffect(() => {
    let list = activeTab === 'all' ? sectors : sectors.filter(s => s.type === activeTab);
    list = [...list].sort((a, b) => {
      if (sortBy === 'upCount') return b.upCount - a.upCount;
      if (sortBy === 'changeRate') return b.changeRate - a.changeRate;
      return b.changeAmount - a.changeAmount;
    });
    setFiltered(list);
  }, [activeTab, sortBy, sectors]);

  const formatNum = (n: number): string => {
    if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  };

  const formatRate = (n: number): string => (n > 0 ? '+' : '') + n.toFixed(2) + '%';

  return (
    <div className="flex flex-col h-full">
      {/* Tabs + Sort + Refresh */}
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

      {/* Sort options */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-fund-border bg-fund-bg/50">
        {sortOptions.map(opt => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
              sortBy === opt.key
                ? 'bg-fund-card text-fund-fg'
                : 'text-fund-fg/50 hover:text-fund-fg/80 hover:bg-fund-card/50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 text-xs text-fund-down bg-fund-down/10 border-b border-fund-border">
          {error}
        </div>
      )}

      {/* Header row */}
      <div className="grid grid-cols-[32px_1fr_70px_50px_50px_60px_60px] gap-1 px-3 py-1.5 text-[10px] text-fund-fg/40 border-b border-fund-border bg-fund-bg/30">
        <span>排名</span>
        <span>板块名称</span>
        <span className="text-right">涨跌幅</span>
        <span className="text-right">上涨</span>
        <span className="text-right">下跌</span>
        <span className="text-right">最新价</span>
        <span className="text-right">成交量</span>
      </div>

      {/* Data rows */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-fund-fg/40 text-sm">
            {loading ? '加载中...' : '暂无数据'}
          </div>
        ) : (
          <div className="divide-y divide-fund-border">
            {filtered.map((sector, index) => (
              <div
                key={Number(sector.code) || index}
                className="grid grid-cols-[32px_1fr_70px_50px_50px_60px_60px] gap-1 px-3 py-2 hover:bg-fund-card/50 transition-colors items-center"
              >
                {/* Rank */}
                <span className={`text-xs font-medium ${
                  index < 3 ? 'text-fund-up' : 'text-fund-fg/60'
                }`}>
                  {index + 1}
                </span>

                {/* Name + type badge */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs text-fund-fg/80 truncate">{sector.name}</span>
                  {sector.type === 'concept' ? (
                    <span title="概念板块"><Layers size={10} className="text-fund-fg/30 shrink-0" /></span>
                  ) : (
                    <span title="行业板块"><Factory size={10} className="text-fund-fg/30 shrink-0" /></span>
                  )}
                </div>

                {/* Change rate */}
                <span className={`text-xs text-right font-medium ${
                  sector.changeRate > 0
                    ? 'text-fund-up'
                    : sector.changeRate < 0
                    ? 'text-fund-down'
                    : 'text-fund-fg/60'
                }`}>
                  {sector.changeRate > 0 && <TrendingUp size={10} className="inline mr-0.5" />}
                  {sector.changeRate < 0 && <TrendingDown size={10} className="inline mr-0.5" />}
                  {formatRate(sector.changeRate)}
                </span>

                {/* Up count */}
                <span className="text-xs text-right text-fund-up font-medium">
                  {sector.upCount}
                </span>

                {/* Down count */}
                <span className="text-xs text-right text-fund-down font-medium">
                  {sector.downCount}
                </span>

                {/* Price */}
                <span className="text-xs text-right text-fund-fg/70">
                  {sector.price.toFixed(2)}
                </span>

                {/* Volume */}
                <span className="text-xs text-right text-fund-fg/50">
                  {formatNum(sector.volume)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
