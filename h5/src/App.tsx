import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Settings } from 'lucide-react';
import { ThemeProvider } from '@/hooks/useTheme';
import { api } from '@/lib/api';
import type { FundData, IntradayPoint } from '@/types';
import FundFlowChart from '@/components/FundFlowChart';
import SectorRankList from '@/components/SectorRankList';
import LivePlayer from '@/components/LivePlayer';
import ConfigPanel from '@/components/ConfigPanel';

interface Config {
  interval: number;
  playbackSpeed: number;
  autoFetch: boolean;
  stopAfterClose: boolean;
  showRankList: boolean;
  bgOpacity: number;
}

const DEFAULT_CONFIG: Config = {
  interval: 6000,
  playbackSpeed: 60,
  autoFetch: true,
  stopAfterClose: true,
  showRankList: true,
  bgOpacity: 0.3,
};

function AppInner() {
  const [data, setData] = useState<FundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [config, setConfig] = useState<Config>(() => {
    if (typeof window !== 'undefined' && (window as any).FUND_FLOW_CONFIG) {
      return { ...DEFAULT_CONFIG, ...(window as any).FUND_FLOW_CONFIG };
    }
    const saved = localStorage.getItem('fundFlowConfig');
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
  });

  const intervalRef = useRef<number | null>(null);
  const progressRef = useRef(0);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    localStorage.setItem('fundFlowConfig', JSON.stringify(config));
  }, [config]);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const d = await api.getAll();
      setData((prev) => {
        if (prev && JSON.stringify(prev) === JSON.stringify(d)) {
          return prev;
        }
        return d;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      if (!silent) setLoading(false);
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
      const isWeekday = day >= 1 && day <= 5;
      const inMorningSession = h >= 9 && (h < 11 || (h === 11 && m <= 30));
      const inAfternoonSession = h >= 13 && h < 15;
      return isWeekday && (inMorningSession || inAfternoonSession);
    };

    if (config.stopAfterClose && !isTradingTime()) return;

    intervalRef.current = window.setInterval(() => load(true), config.interval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [config.interval, config.autoFetch, config.stopAfterClose, load]);

  const padIntradayToClose = useCallback((intraday: IntradayPoint[] | undefined): IntradayPoint[] => {
    if (!intraday || intraday.length === 0) return [];
    const last = intraday[intraday.length - 1];
    const [lastH, lastM, lastS = 0] = last.time.split(':').map(Number);
    const lastSec = lastH * 3600 + lastM * 60 + lastS;
    const endSec = 15 * 3600; // 15:00:00
    if (lastSec >= endSec) return intraday;

    const padded = [...intraday];
    let currentSec = lastSec;
    const lastValues = { ...last.sectors };

    while (currentSec < endSec) {
      currentSec += 1;
      if (currentSec > 11 * 3600 + 30 * 60 && currentSec < 13 * 3600) {
        currentSec = 13 * 3600;
      }
      if (currentSec > endSec) break;

      const h = Math.floor(currentSec / 3600);
      const m = Math.floor((currentSec % 3600) / 60);
      const s = currentSec % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      padded.push({ time: timeStr, sectors: { ...lastValues } });
    }
    return padded;
  }, []);

  const currentData = padIntradayToClose(data?.intraday);

  const activeData = currentData?.slice(
    0,
    progress > 0 ? Math.max(1, Math.floor(currentData.length * progress)) : undefined
  );

  const playbackTime = useMemo(() => {
    if (!currentData || currentData.length === 0) return undefined;
    const idx = progress > 0
      ? Math.min(Math.floor((currentData.length - 1) * progress), currentData.length - 1)
      : currentData.length - 1;
    return currentData[idx]?.time;
  }, [currentData, progress]);

  useEffect(() => {
    if (isPlaying && currentData && currentData.length > 0) {
      let rafId: number;
      let lastTime = performance.now();
      const totalPoints = currentData.length;
      const speed = config.playbackSpeed;

      const animate = (now: number) => {
        const dt = (now - lastTime) / 1000;
        lastTime = now;

        const pointDelta = speed * dt;
        const progressDelta = pointDelta / totalPoints;
        const next = Math.min(progressRef.current + progressDelta, 1);
        progressRef.current = next;
        setProgress(next);

        if (next >= 1) {
          setIsPlaying(false);
          return;
        }
        rafId = requestAnimationFrame(animate);
      };

      rafId = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(rafId);
      };
    }
  }, [isPlaying, currentData, config.playbackSpeed]);

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
        <button onClick={() => load()} className="rounded bg-fund-up px-4 py-2 text-white">重试</button>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen flex-col bg-fund-bg text-fund-fg"
      style={{ opacity: config.bgOpacity }}
    >
      <header className="flex items-center justify-between border-b border-fund-border px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">主力资金流向</h1>
          <span className="text-xs text-fund-fg/40 px-1.5 py-0.5 rounded bg-fund-card border border-fund-border/30">
            东方财富
          </span>
        </div>
        <button onClick={() => setShowConfig(true)} className="rounded p-2 hover:bg-fund-card transition-colors">
          <Settings size={18} />
        </button>
      </header>

      {/* Summary + controls */}
      <div className="border-b border-fund-border px-4 py-2 space-y-2">
        {activeData && activeData.length > 0 && (() => {
          const lastPoint = activeData[activeData.length - 1];
          const sectorValues = data.sectors
            .map((s) => ({ name: s.name, value: lastPoint.sectors[s.name] ?? 0 }))
            .sort((a, b) => b.value - a.value);
          const maxIn = sectorValues.find((v) => v.value > 0);
          const maxOut = [...sectorValues].reverse().find((v) => v.value < 0);
          const dateLabel = `07月${String(new Date().getDate()).padStart(2, '0')}日`;
          const timeLabel = progress > 0 && activeData.length > 1
            ? `时间${activeData[Math.floor((activeData.length - 1) * progress)]?.time || ''}`
            : `时间${activeData[activeData.length - 1]?.time || ''}`;
          return (
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className="font-bold text-sm">{dateLabel} 主力资金流向</span>
              {timeLabel && (
                <span className="px-1.5 py-0.5 rounded bg-fund-card border border-fund-border text-fund-fg/70">{timeLabel}</span>
              )}
              {maxIn && (
                <span className="text-fund-up">净流入最多: {maxIn.name} +{maxIn.value.toFixed(1)}亿</span>
              )}
              {maxOut && (
                <span className="text-fund-down">净流出最多: {maxOut.name} {maxOut.value.toFixed(1)}亿</span>
              )}
            </div>
          );
        })()}
        <div className="flex items-center justify-between">
          <div />
          <LivePlayer
            isPlaying={isPlaying}
            progress={progress}
            currentTime={playbackTime}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onReplay={() => { setProgress(0); setIsPlaying(true); }}
            onSeek={(v) => setProgress(v)}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 min-w-0">
          <FundFlowChart
            fullData={currentData || []}
            visibleData={activeData || []}
            sectors={data.sectors}
            hoverIndex={hoverIndex}
            onHoverIndex={setHoverIndex}
            progress={progress}
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
        单位：亿 | 数据来源：东方财富 | 公开数据整理，不作为投资依据
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
