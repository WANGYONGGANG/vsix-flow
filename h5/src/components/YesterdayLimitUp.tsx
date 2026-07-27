import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  Flame,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  AlertTriangle,
  Meh,
  Frown,
} from 'lucide-react';
import { fetchYesterdayLimitUp, type LimitUpStock } from '@/lib/socialData';

type SortKey = 'limitUpDays' | 'todayChangeRate' | 'amount';
type FilterKey = 'all' | 'continuous' | 'broken';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'limitUpDays', label: '按连板数' },
  { key: 'todayChangeRate', label: '按今日涨幅' },
  { key: 'amount', label: '按成交额' },
];

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'continuous', label: '连板中' },
  { key: 'broken', label: '已断板' },
];

const SENTIMENT_CONFIG: Record<
  LimitUpStock['marketSentiment'],
  { icon: typeof Zap; bg: string; text: string; label: string }
> = {
  极度乐观: { icon: Zap, bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: '极度乐观' },
  乐观: { icon: TrendingUp, bg: 'bg-green-500/15', text: 'text-green-400', label: '乐观' },
  中性: { icon: Meh, bg: 'bg-gray-500/15', text: 'text-gray-400', label: '中性' },
  谨慎: { icon: AlertTriangle, bg: 'bg-yellow-500/15', text: 'text-yellow-400', label: '谨慎' },
  恐慌: { icon: Frown, bg: 'bg-orange-500/15', text: 'text-orange-400', label: '恐慌' },
  极度恐慌: { icon: AlertTriangle, bg: 'bg-red-500/15', text: 'text-red-400', label: '极度恐慌' },
};

function formatAmount(n: number): string {
  if (n >= 1e8) return (n / 1e8).toFixed(1) + '亿';
  if (n >= 1e4) return (n / 1e4).toFixed(1) + '万';
  return n.toFixed(0);
}

export default function YesterdayLimitUp() {
  const [stocks, setStocks] = useState<LimitUpStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('limitUpDays');
  const [filterBy, setFilterBy] = useState<FilterKey>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchYesterdayLimitUp();
      setStocks(data);
      setLastUpdate(new Date().toLocaleTimeString());
      if (data.length === 0) {
        setError('未获取到数据');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '加载失败';
      setError(msg);
      console.error('[YesterdayLimitUp] 加载失败:', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const sentiment = stocks[0]?.marketSentiment ?? '中性';
  const sentimentCfg = SENTIMENT_CONFIG[sentiment];
  const SentimentIcon = sentimentCfg.icon;

  const filtered = useMemo(() => {
    if (filterBy === 'all') return stocks;
    if (filterBy === 'continuous') return stocks.filter(s => s.todayChangeRate > 9.5);
    if (filterBy === 'broken') return stocks.filter(s => s.todayChangeRate <= 9.5);
    return stocks;
  }, [stocks, filterBy]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (sortBy === 'limitUpDays') {
      arr.sort((a, b) => b.limitUpDays - a.limitUpDays || b.todayChangeRate - a.todayChangeRate);
    } else if (sortBy === 'todayChangeRate') {
      arr.sort((a, b) => b.todayChangeRate - a.todayChangeRate);
    } else if (sortBy === 'amount') {
      arr.sort((a, b) => b.amount - a.amount);
    }
    return arr;
  }, [filtered, sortBy]);

  return (
    <div className="flex flex-col h-full bg-fund-bg text-fund-fg">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-fund-border">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-fund-up" />
            <h2 className="text-sm font-bold">昨日涨停今日表现</h2>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${sentimentCfg.bg} ${sentimentCfg.text}`}
            >
              <SentimentIcon size={10} />
              {sentimentCfg.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="text-[10px] text-fund-fg/40">更新于 {lastUpdate}</span>
            )}
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

        {/* Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setFilterBy(opt.key)}
                className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                  filterBy === opt.key
                    ? 'bg-fund-up text-white'
                    : 'bg-fund-card text-fund-fg/60 hover:bg-fund-border/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                  sortBy === opt.key
                    ? 'bg-fund-up/20 text-fund-up'
                    : 'text-fund-fg/50 hover:bg-fund-card'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 text-xs text-fund-down bg-fund-down/10 border-b border-fund-border">
          {error}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-full text-fund-fg/40 text-sm">
            {loading ? '加载中...' : '暂无数据'}
          </div>
        ) : (
          <div className="divide-y divide-fund-border">
            {sorted.map(stock => (
              <StockRow key={stock.code} stock={stock} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StockRow({ stock }: { stock: LimitUpStock }) {
  const isUp = stock.todayChangeRate >= 0;
  const isLimitUp = stock.todayChangeRate > 9.5;
  const changeColor = isUp ? 'text-fund-up' : 'text-fund-down';

  return (
    <div className="px-3 py-2.5 hover:bg-fund-card/40 transition-colors">
      {/* Row 1: code + name + tags */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-fund-fg/70">{stock.code}</span>
          <span className="text-xs font-medium text-fund-fg">{stock.name}</span>
          {stock.limitUpDays > 1 && (
            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-orange-500/15 text-orange-400 text-[10px] font-medium">
              <Flame size={9} />
              {stock.limitUpDays}连板
            </span>
          )}
          {isLimitUp && stock.limitUpDays <= 1 && (
            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-fund-up/15 text-fund-up text-[10px] font-medium">
              <Flame size={9} />
              涨停
            </span>
          )}
        </div>
        {stock.sector && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-fund-border/30 text-fund-fg/50">
            {stock.sector}
          </span>
        )}
      </div>

      {/* Row 2: data columns */}
      <div className="flex items-center justify-between">
        {/* Yesterday */}
        <div className="flex flex-col gap-0.5 min-w-[80px]">
          <span className="text-[10px] text-fund-fg/40">昨收</span>
          <div className="flex items-center gap-1">
            <span className="text-xs text-fund-fg/80">{stock.yesterdayClose.toFixed(2)}</span>
            <span className="text-[10px] text-fund-up">+{stock.yesterdayChangeRate.toFixed(2)}%</span>
          </div>
        </div>

        {/* Today price */}
        <div className="flex flex-col gap-0.5 min-w-[70px]">
          <span className="text-[10px] text-fund-fg/40">现价</span>
          <span className={`text-sm font-bold font-mono ${changeColor}`}>
            {stock.todayPrice.toFixed(2)}
          </span>
        </div>

        {/* Today change */}
        <div className="flex flex-col gap-0.5 min-w-[60px]">
          <span className="text-[10px] text-fund-fg/40">涨跌</span>
          <span className={`text-xs font-medium font-mono flex items-center gap-0.5 ${changeColor}`}>
            {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {isUp ? '+' : ''}
            {stock.todayChangeRate.toFixed(2)}%
          </span>
        </div>

        {/* High / Low */}
        <div className="flex flex-col gap-0.5 min-w-[70px]">
          <span className="text-[10px] text-fund-fg/40">最高/最低</span>
          <div className="flex items-center gap-1 text-[10px] font-mono">
            <span className="text-fund-up">{stock.todayHigh.toFixed(2)}</span>
            <span className="text-fund-fg/20">/</span>
            <span className="text-fund-down">{stock.todayLow.toFixed(2)}</span>
          </div>
        </div>

        {/* Volume */}
        <div className="flex flex-col gap-0.5 min-w-[60px] text-right">
          <span className="text-[10px] text-fund-fg/40">成交额</span>
          <span className="text-xs text-fund-fg/70 font-mono">{formatAmount(stock.amount)}</span>
        </div>
      </div>
    </div>
  );
}
