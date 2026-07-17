import { X } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface Config { interval: number; playbackSpeed: number; autoFetch: boolean; stopAfterClose: boolean; bgOpacity: number }
interface Props { config: Config; onConfigChange: (c: Config) => void; isOpen: boolean; onClose: () => void }

const SPEEDS = [1, 3, 10, 30, 60, 120, 240];
const INTERVALS = [{ v: 3000, l: '3s' }, { v: 6000, l: '6s' }, { v: 10000, l: '10s' }, { v: 60000, l: '1min' }, { v: 300000, l: '5min' }];
const THEMES = [{ v: 'light', l: '亮色' }, { v: 'dark', l: '暗色' }, { v: 'vscode-bg', l: 'VS Code' }];

export default function ConfigPanel({ config, onConfigChange, isOpen, onClose }: Props) {
  const { theme, setTheme } = useTheme();
  const set = <K extends keyof Config>(k: K, v: Config[K]) => {
    const c = { ...config, [k]: v }; onConfigChange(c);
    if ((window as any).FUND_FLOW_VSCODE) window.postMessage({ type: 'config', config: c });
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-80 rounded-lg bg-fund-card border border-fund-border p-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold">设置</h2>
          <button onClick={onClose} className="rounded p-0.5 hover:bg-fund-bg"><X size={15} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium mb-1.5 block">主题</label>
            <div className="grid grid-cols-3 gap-1">{THEMES.map(t => (
              <button key={t.v} onClick={() => setTheme(t.v as any)} className={`rounded px-2 py-1 text-xs ${theme === t.v ? 'bg-fund-up text-white' : 'bg-fund-bg hover:bg-fund-border/30'}`}>{t.l}</button>
            ))}</div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block">回放速度 {config.playbackSpeed}x</label>
            <div className="grid grid-cols-7 gap-1">{SPEEDS.map(s => (
              <button key={s} onClick={() => set('playbackSpeed', s)} className={`rounded px-1 py-1 text-xs ${config.playbackSpeed === s ? 'bg-fund-up text-white' : 'bg-fund-bg hover:bg-fund-border/30'}`}>{s}x</button>
            ))}</div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block">刷新间隔</label>
            <div className="grid grid-cols-5 gap-1">{INTERVALS.map(i => (
              <button key={i.v} onClick={() => set('interval', i.v)} className={`rounded px-1 py-1 text-xs ${config.interval === i.v ? 'bg-fund-up text-white' : 'bg-fund-bg hover:bg-fund-border/30'}`}>{i.l}</button>
            ))}</div>
          </div>
          <div className="space-y-2">
            {[['autoFetch', '自动刷新'], ['stopAfterClose', '收盘后停止']].map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer text-xs">
                <input type="checkbox" checked={config[k as keyof Config] as boolean} onChange={e => set(k as keyof Config, e.target.checked)} className="accent-fund-up" />{l}
              </label>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">透明度 {(config.bgOpacity * 100).toFixed(0)}%</label>
            <input type="range" min="0.1" max="1" step="0.05" value={config.bgOpacity} onChange={e => set('bgOpacity', +e.target.value)} className="w-full h-1.5 rounded-full bg-fund-border appearance-none cursor-pointer" />
          </div>
        </div>
      </div>
    </div>
  );
}