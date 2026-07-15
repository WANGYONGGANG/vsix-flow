import { useState, useEffect, useCallback, useRef } from 'react';
import { Settings } from 'lucide-react';
import { ThemeProvider } from '@/hooks/useTheme';
import { api } from '@/lib/api';
import type { FundData, TimeRange, HistoricalPoint, IntradayPoint } from '@/types';
import FundFlowChart from '@/components/FundFlowChart';
import SectorRankList from '@/components/SectorRankList';
import TimeRangeTabs from '@/components/TimeRangeTabs';
import SectorManager from '@/components/SectorManager';
import LivePlayer from '@/components/LivePlayer';
import ConfigPanel from '@/components/ConfigPanel';

interface Config {
  interval: number;
  granularity: number;
  autoFetch: boolean;
  stopAfterClose: boolean;
  showRankList: boolean;
  bgOpacity: number;
  dataSource: 'mock' | 'real';
}

function AppInner() {
  const [data, setData] = useState<FundData | null>(null);
  const [range, setRange] = useState<TimeRange>('intraday');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showManager, setShowManager] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const [config, setConfig] = useState<Config>(() => {
    const defaults: Config = {
      interval: 6000,
      granularity: 5,
      autoFetch: true,
      stopAfterClose: true,
      showRankList: true,
      bgOpacity: 0.3,
      dataSource: 'mock',
    };
    if (typeof window !== 'undefined' && (window as any).FUND_FLOW_CONFIG) {
      return { ...defaults, ...(window as any).FUND_FLOW_CONFIG };
    }
    const saved = localStorage.getItem('fundFlowConfig');
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });

  const playRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem('fundFlowConfig', JSON.stringify(config));
  }, [config]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api.getAll();
      setData(d);
      if (d.historical.length > 0) {
        setSelectedDate(d.historical[d.historical.length - 1].date);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!config.autoFetch) return;

    const isTradingTime = () => {
      const now = new Date();
      const day = now.getDay();
      const h = now.getHours();
      const m = now.getMinutes();
      // 周一到周五为交易日，早上9:00开始拉取，15:00后停止
      const isWeekday = day >= 1 && day <= 5;
      const inMorningSession = h >= 9 && (h < 11 || (h === 11 && m <= 30));
      const inAfternoonSession = h >= 13 && h < 15;
      const inSession = inMorningSession || inAfternoonSession;
      return isWeekday && inSession;
    };

    if (config.stopAfterClose && !isTradingTime()) return;

    intervalRef.current = window.setInterval(load, config.interval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [config.interval, config.autoFetch, config.stopAfterClose, load]);

  const handleAddSector = async (name: string) => {
    await api.addSector(name);
    await load();
  };

  const handleRemoveSector = async (id: string) => {
    await api.removeSector(id);
    await load();
  };

  const filteredHistorical = useCallback(() => {
    if (!data?.historical || !selectedDate) return [];
    return data.historical.filter((p: HistoricalPoint) => p.date <= selectedDate);
  }, [data?.historical, selectedDate]);

  const padIntradayToClose = useCallback((intraday: IntradayPoint[] | undefined): IntradayPoint[] => {
    if (!intraday || intraday.length === 0) return [];
    const last = intraday[intraday.length - 1];
    const [lastH, lastM] = last.time.split(':').map(Number);
    const lastMinutes = lastH * 60 + lastM;
    const endMinutes = 15 * 60; // 15:00
    if (lastMinutes >= endMinutes) return intraday;

    // 推断间隔
    let interval = 5;
    if (intraday.length >= 2) {
      const t1 = intraday[intraday.length - 2].time.split(':').map(Number);
      const t2 = last.time.split(':').map(Number);
      interval = (t2[0] * 60 + t2[1]) - (t1[0] * 60 + t1[1]);
      if (interval <= 0) interval = 5;
    }

    const padded = [...intraday];
    let currentMinutes = lastMinutes;
    const lastValues = { ...last.sectors };

    while (currentMinutes < endMinutes) {
      currentMinutes += interval;
      if (currentMinutes > 11 * 60 + 30 && currentMinutes < 13 * 60) {
        currentMinutes = 13 * 60;
      }
      if (currentMinutes > endMinutes) break;

      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      padded.push({ time: timeStr, sectors: { ...lastValues } });
    }
    return padded;
  }, []);

  const currentData = range === 'intraday'
    ? padIntradayToClose(data?.intraday)
    : filteredHistorical();
  const activeData = currentData?.slice(0, range === 'intraday' && progress > 0 ? Math.max(1, Math.floor(currentData.length * progress)) : undefined);

  useEffect(() => {
    if (range !== 'intraday') {
      setIsPlaying(false);
      setProgress(0);
    }
  }, [range]);

  useEffect(() => {
    if (isPlaying && range === 'intraday' && currentData) {
      const step = () => {
        setProgress((prev) => {
          const next = prev + 0.005;
          if (next >= 1) {
            setIsPlaying(false);
            return 1;
          }
          return next;
        });
        playRef.current = requestAnimationFrame(step);
      };
      playRef.current = requestAnimationFrame(step);
    } else if (playRef.current) {
      cancelAnimationFrame(playRef.current);
      playRef.current = null;
    }
    return () => {
      if (playRef.current) cancelAnimationFrame(playRef.current);
    };
  }, [isPlaying, range, currentData]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-fund-fg">
        <div className="mr-3 h-6 w-6 animate-spin rounded-full border-2 border-fund-fg border-t-transparent" />
        加载中...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center text-fund-fg">
        <p className="mb-4">{error || '暂无数据'}</p>
        <button onClick={load} className="rounded bg-fund-up px-4 py-2 text-white">重试</button>
      </div>
    );
  }

  const isVsCode = typeof window !== 'undefined' && (window as any).FUND_FLOW_VSCODE;

  return (
    <div 
      className="flex h-screen flex-col bg-fund-bg text-fund-fg"
      style={isVsCode ? { opacity: config.bgOpacity } : {}}
    >
      <header className="flex items-center justify-between border-b border-fund-border px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">主力资金流向</h1>
          <button onClick={() => setShowManager(!showManager)} className="rounded bg-fund-card px-2 py-1 text-xs border border-fund-border">
            板块管理
          </button>
        </div>
        <button onClick={() => setShowConfig(true)} className="rounded p-2 hover:bg-fund-card transition-colors">
          <Settings size={18} />
        </button>
      </header>

      <div className="flex items-center justify-between border-b border-fund-border px-4 py-2">
        <TimeRangeTabs value={range} onChange={setRange} />
        {range === 'intraday' && (
          <LivePlayer
            isPlaying={isPlaying}
            progress={progress}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onReplay={() => { setProgress(0); setIsPlaying(true); }}
            onSeek={(v) => setProgress(v)}
          />
        )}
        {range === 'history' && data.historical.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-fund-fg/60">选择日期：</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={data.historical[0]?.date}
              max={data.historical[data.historical.length - 1]?.date}
              className="rounded bg-fund-card border border-fund-border px-2 py-1 text-sm outline-none focus:border-fund-up"
            />
          </div>
        )}
      </div>

      {showManager && (
        <SectorManager
          sectors={data.sectors}
          onAdd={handleAddSector}
          onRemove={handleRemoveSector}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 min-w-0">
          <FundFlowChart
            data={activeData || []}
            sectors={data.sectors}
            range={range}
            hoverIndex={hoverIndex}
            onHoverIndex={setHoverIndex}
          />
        </div>
        {config.showRankList && (
          <SectorRankList
            data={activeData || []}
            sectors={data.sectors}
            hoverIndex={hoverIndex}
          />
        )}
      </div>

      <div className="border-t border-fund-border px-4 py-2 text-xs text-fund-fg/60">
        单位：亿 | 公开数据整理，不作为投资依据；投资有风险，理财需谨慎。
      </div>

      <ConfigPanel
        config={config}
        onConfigChange={setConfig}
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}