import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Settings } from 'lucide-react';
import { ThemeProvider } from '@/hooks/useTheme';
import { api } from '@/lib/api';
import type { FundData } from '@/types';
import FundFlowChart from '@/components/FundFlowChart';
import LivePlayer from '@/components/LivePlayer';
import ConfigPanel from '@/components/ConfigPanel';
import Barrage from '@/components/Barrage';
import PageSwitcher, { PageId } from '@/components/PageSwitcher';
import PostList from '@/components/PostList';
import SectorLimitList from '@/components/SectorLimitList';
import DragonTigerList from '@/components/DragonTigerList';
import YesterdayLimitUp from '@/components/YesterdayLimitUp';
import { fetchEastmoneyPostsCached } from '@/lib/socialData';

interface Config {
  interval: number;
  playbackSpeed: number;
  autoFetch: boolean;
  stopAfterClose: boolean;
  bgOpacity: number;
  barrageEnabled: boolean;
}

const DEF: Config = {
  interval: 6000, playbackSpeed: 60, autoFetch: true, stopAfterClose: true,
  bgOpacity: 0.3, barrageEnabled: false,
};

export default function App() {
  const [data, setData] = useState<FundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cfgOpen, setCfgOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [page, setPage] = useState<PageId>('fundFlow');
  const [config, setConfig] = useState<Config>(() => {
    try {
      const s = localStorage.getItem('fundFlowConfig');
      return s ? { ...DEF, ...JSON.parse(s) } : DEF;
    } catch { return DEF; }
  });

  const pRef = useRef(0);
  useEffect(() => { pRef.current = progress; }, [progress]);
  useEffect(() => { localStorage.setItem('fundFlowConfig', JSON.stringify(config)); }, [config]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'config') setConfig(prev => ({ ...prev, ...e.data.config }));
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(''); }
    try {
      const d = await api.getAll();
      setData(prev => (prev && JSON.stringify(prev) === JSON.stringify(d)) ? prev : d);
    } catch (e) { setError(e instanceof Error ? e.message : '加载失败'); }
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!config.autoFetch) return;
    const trading = () => {
      const n = new Date(), d = n.getDay(), h = n.getHours(), m = n.getMinutes();
      return d >= 1 && d <= 5 && ((h >= 9 && h < 11) || (h === 11 && m <= 30) || (h >= 13 && h < 15));
    };
    if (config.stopAfterClose && !trading()) return;
    const id = setInterval(() => load(true), config.interval);
    return () => clearInterval(id);
  }, [config.interval, config.autoFetch, config.stopAfterClose, load]);

  const realData = data?.intraday ?? [];
  const currentIndex = Math.min(Math.floor((realData.length - 1) * progress), realData.length - 1);

  const currentPoint = useMemo(() => {
    if (!realData.length) return null;
    if (playing || progress > 0) return realData[currentIndex];
    return realData[realData.length - 1];
  }, [realData, playing, progress, currentIndex]);

  const maxVal = useMemo(() => {
    if (!data) return 10;
    let mx = 0;
    for (const p of realData) for (const s of data.sectors) { const v = Math.abs(p.sectors[s.name] ?? 0); if (v > mx) mx = v; }
    return Math.max(10, mx);
  }, [realData, data]);

  const summary = useMemo(() => {
    if (!currentPoint || !data) return null;
    const all = data.sectors.map(s => ({ name: s.name, value: currentPoint.sectors[s.name] ?? 0 }));
    const topIn = all.filter(d => d.value >= 0).sort((a, b) => b.value - a.value).slice(0, 3);
    const topOut = all.filter(d => d.value < 0).sort((a, b) => a.value - b.value).slice(0, 3);
    return { topIn, topOut };
  }, [currentPoint, data]);

  useEffect(() => {
    if (!playing || !realData.length) return;
    let raf: number, last = performance.now();
    const total = realData.length, spd = config.playbackSpeed;
    const step = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      const next = Math.min(pRef.current + (spd * dt) / total, 1);
      pRef.current = next; setProgress(next);
      if (next >= 1) { setPlaying(false); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, realData, config.playbackSpeed]);

  const emFetchFn = useMemo(() => () => fetchEastmoneyPostsCached(), []);

  const pageTitleMap: Record<PageId, string> = {
    fundFlow: '主力资金流向',
    em_news: '东财7x24快讯',
    sector_limit: '涨跌停板块排行',
    dragon_tiger: '昨日龙虎榜',
    yesterday_limit: '昨日涨停今日表现',
  };

  const pageTitle = pageTitleMap[page];
  const isFundFlowPage = page === 'fundFlow';

  // 只有资金页面需要等待 fund data
  const showFundFlowLoading = isFundFlowPage && loading;
  const showFundFlowError = isFundFlowPage && (error || !data);

  const renderContent = () => {
    if (showFundFlowLoading) {
      return <div className="flex h-full items-center justify-center text-fund-fg"><div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-fund-fg border-t-transparent" />加载中...</div>;
    }
    if (showFundFlowError) {
      return <div className="flex h-full flex-col items-center justify-center text-fund-fg gap-3"><p>{error || '暂无数据'}</p><button onClick={() => load()} className="rounded bg-fund-up px-3 py-1.5 text-white text-sm">重试</button></div>;
    }

    switch (page) {
      case 'fundFlow':
        return (
          <>
            <FundFlowChart currentPoint={currentPoint} sectors={data!.sectors} maxAbsValue={maxVal} />
            {config.barrageEnabled && (
              <Barrage data={data} currentIndex={playing || progress > 0 ? currentIndex : realData.length - 1} />
            )}
          </>
        );
      case 'em_news':
        return <PostList fetchFn={emFetchFn} tabs={[{ key: 'all', label: '全部' }]} />;
      case 'sector_limit':
        return <SectorLimitList />;
      case 'dragon_tiger':
        return <DragonTigerList />;
      case 'yesterday_limit':
        return <YesterdayLimitUp />;
      default:
        return null;
    }
  };

  const time = currentPoint?.time;

  return (
    <ThemeProvider>
      <div className="flex h-screen flex-col bg-fund-bg text-fund-fg" style={{ opacity: config.bgOpacity }}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-fund-border">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold">{pageTitle}</span>
            {isFundFlowPage && time && (
              <>
                <span className="text-fund-fg/50 font-mono">{playing ? '回放 ' : ''}{time}</span>
                {summary?.topIn[0] && <span className="text-fund-up">{summary.topIn[0].name} +{summary.topIn[0].value.toFixed(1)}亿</span>}
                {summary?.topOut[0] && <span className="text-fund-down">{summary.topOut[0].name} -{Math.abs(summary.topOut[0].value).toFixed(1)}亿</span>}
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <PageSwitcher current={page} onChange={setPage} />
            {isFundFlowPage && (
              <LivePlayer isPlaying={playing} progress={progress} currentTime={time}
                onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
                onReplay={() => { setProgress(0); setPlaying(true); }} onSeek={v => { setProgress(v); setPlaying(false); }} />
            )}
            <button onClick={() => setCfgOpen(true)} className="rounded p-1 hover:bg-fund-card"><Settings size={15} /></button>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative">
          {renderContent()}
        </div>

        <div className="px-3 py-1 text-[10px] text-fund-fg/40 border-t border-fund-border">
          {isFundFlowPage ? '单位：亿 | 东方财富 | 不作为投资依据' : '东方财富网 | 不作为投资依据'}
        </div>

        <ConfigPanel config={config} onConfigChange={setConfig} isOpen={cfgOpen} onClose={() => setCfgOpen(false)} />
      </div>
    </ThemeProvider>
  );
}
