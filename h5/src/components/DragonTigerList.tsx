import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronDown, ChevronUp, Building2, User, Landmark } from 'lucide-react';
import { fetchDragonTiger, type DragonTigerEntry, type DragonTigerSeat } from '@/lib/socialData';

export default function DragonTigerList() {
  const [entries, setEntries] = useState<DragonTigerEntry[]>([]);
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');
  const [tradeDate, setTradeDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchDragonTiger();
      setEntries(data);
      if (data.length > 0) {
        setTradeDate(data[0].tradeDate);
      }
      setLastUpdate(new Date().toLocaleTimeString());
      if (data.length === 0) {
        setError('未获取到昨日龙虎榜数据');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '加载失败';
      setError(msg);
      console.error('[DragonTigerList] 加载失败:', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // 自动刷新每120秒
  useEffect(() => {
    const id = setInterval(load, 120000);
    return () => clearInterval(id);
  }, [load]);

  const toggleExpand = useCallback((code: string) => {
    setExpandedCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }, []);

  const formatWan = (v: number) => `${(v).toFixed(0)}万`;
  const formatRate = (v: number) => `${(v * 100).toFixed(2)}%`;

  return (
    <div className="flex flex-col h-full bg-fund-bg text-fund-fg">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-fund-border">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">昨日龙虎榜</h2>
          {tradeDate && (
            <span className="text-[10px] text-fund-fg/50 bg-fund-card px-1.5 py-0.5 rounded">
              {tradeDate}
            </span>
          )}
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

      {/* Error */}
      {error && (
        <div className="px-3 py-2 text-xs text-fund-down bg-fund-down/10 border-b border-fund-border">
          {error}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-fund-fg/40 text-sm">
            {loading ? '加载中...' : '暂无数据'}
          </div>
        ) : (
          <div className="divide-y divide-fund-border">
            {entries.map((entry, index) => {
              const isExpanded = expandedCodes.has(entry.code);
              return (
                <div key={`${entry.code}-${index}`} className="bg-fund-bg">
                  {/* Collapsed Row */}
                  <button
                    onClick={() => toggleExpand(entry.code)}
                    className="w-full text-left px-3 py-2.5 hover:bg-fund-card/40 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {/* Rank */}
                      <span className="w-5 text-[10px] text-fund-fg/40 text-center shrink-0">
                        {index + 1}
                      </span>

                      {/* Code + Name */}
                      <div className="min-w-0 shrink-0 w-[72px]">
                        <div className="text-xs font-medium truncate">{entry.name}</div>
                        <div className="text-[10px] text-fund-fg/40">{entry.code}</div>
                      </div>

                      {/* Close + Change */}
                      <div className="shrink-0 w-[70px] text-right">
                        <div className="text-xs">{entry.closePrice.toFixed(2)}</div>
                        <div className={`text-[10px] ${entry.changeRate >= 0 ? 'text-fund-up' : 'text-fund-down'}`}>
                          {entry.changeRate >= 0 ? '+' : ''}{formatRate(entry.changeRate)}
                        </div>
                      </div>

                      {/* Net Buy */}
                      <div className="shrink-0 w-[72px] text-right">
                        <div className={`text-xs font-medium ${entry.netBuyAmt >= 0 ? 'text-fund-up' : 'text-fund-down'}`}>
                          {entry.netBuyAmt >= 0 ? '+' : ''}{formatWan(entry.netBuyAmt)}
                        </div>
                      </div>

                      {/* Institution counts */}
                      <div className="shrink-0 flex items-center gap-1.5 ml-auto">
                        {entry.buyTimes > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-fund-up bg-fund-up/10 px-1 py-0.5 rounded">
                            <Building2 size={9} />
                            买{entry.buyTimes}
                          </span>
                        )}
                        {entry.sellTimes > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-fund-down bg-fund-down/10 px-1 py-0.5 rounded">
                            <Building2 size={9} />
                            卖{entry.sellTimes}
                          </span>
                        )}
                      </div>

                      {/* Expand icon */}
                      <span className="shrink-0 text-fund-fg/30 ml-1">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    </div>

                    {/* Reason tag */}
                    {entry.reason && (
                      <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                        {entry.reason.split(/[,;，；]/).filter(Boolean).map((r, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-fund-card text-fund-fg/50 border border-fund-border/50"
                          >
                            {r.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>

                  {/* Expanded Seat Details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-fund-border/50 bg-fund-card/20">
                      <div className="text-[11px] font-medium text-fund-fg/60 py-2 flex items-center gap-1">
                        <Landmark size={12} />
                        席位明细
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="text-fund-fg/40 border-b border-fund-border/50">
                              <th className="text-left py-1.5 pr-2 font-normal">席位名称</th>
                              <th className="text-center py-1.5 px-1 font-normal w-12">类型</th>
                              <th className="text-right py-1.5 px-1 font-normal w-16">买入额</th>
                              <th className="text-right py-1.5 px-1 font-normal w-16">卖出额</th>
                              <th className="text-right py-1.5 pl-1 font-normal w-16">净额</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-fund-border/30">
                            {entry.seats.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-3 text-center text-fund-fg/30">
                                  无席位数据
                                </td>
                              </tr>
                            ) : (
                              entry.seats.map((seat, si) => (
                                <SeatRow key={si} seat={seat} />
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SeatRow({ seat }: { seat: DragonTigerSeat }) {
  const typeConfig: Record<string, { bg: string; text: string; icon: typeof Building2 }> = {
    '机构': { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: Building2 },
    '游资': { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: User },
    '量化': { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Landmark },
    '敢死队': { bg: 'bg-red-500/20', text: 'text-red-400', icon: User },
    '其他': { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: Landmark },
  };
  const cfg = typeConfig[seat.type] || typeConfig['其他'];
  const Icon = cfg.icon;

  return (
    <tr className="hover:bg-fund-card/30 transition-colors">
      <td className="py-1.5 pr-2 text-fund-fg/80 truncate max-w-[140px]" title={seat.seatName}>
        {seat.seatName}
      </td>
      <td className="py-1.5 px-1">
        <div className="flex items-center gap-1">
          <span className={`inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
            <Icon size={9} />
            {seat.type}
          </span>
          {seat.tag && seat.tag !== seat.type && seat.tag !== '其他' && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-fund-card text-fund-fg/50 border border-fund-border/50">
              {seat.tag}
            </span>
          )}
        </div>
      </td>
      <td className="py-1.5 px-1 text-right text-fund-up">{seat.buyAmt > 0 ? `${seat.buyAmt.toFixed(0)}万` : '-'}</td>
      <td className="py-1.5 px-1 text-right text-fund-down">{seat.sellAmt > 0 ? `${seat.sellAmt.toFixed(0)}万` : '-'}</td>
      <td className={`py-1.5 pl-1 text-right font-medium ${seat.netAmt >= 0 ? 'text-fund-up' : 'text-fund-down'}`}>
        {seat.netAmt >= 0 ? '+' : ''}{seat.netAmt.toFixed(0)}万
      </td>
    </tr>
  );
}
