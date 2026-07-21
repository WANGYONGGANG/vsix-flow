import { X, Globe } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface Config {
  interval: number;
  playbackSpeed: number;
  autoFetch: boolean;
  stopAfterClose: boolean;
  bgOpacity: number;
  barrageEnabled: boolean;
  xueqiuCookie: string;
  taogubaCookie: string;
  proxyWorkerUrl: string;
}

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
      <div className="w-80 rounded-lg bg-fund-card border border-fund-border p-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold">设置</h2>
          <button onClick={onClose} className="rounded p-0.5 hover:bg-fund-bg"><X size={15} /></button>
        </div>
        <div className="space-y-4">
          {/* 主题 */}
          <div>
            <label className="text-xs font-medium mb-1.5 block">主题</label>
            <div className="grid grid-cols-3 gap-1">{THEMES.map(t => (
              <button key={t.v} onClick={() => setTheme(t.v as any)} className={`rounded px-2 py-1 text-xs ${theme === t.v ? 'bg-fund-up text-white' : 'bg-fund-bg hover:bg-fund-border/30'}`}>{t.l}</button>
            ))}</div>
          </div>
          {/* 回放速度 */}
          <div>
            <label className="text-xs font-medium mb-1.5 block">回放速度 {config.playbackSpeed}x</label>
            <div className="grid grid-cols-7 gap-1">{SPEEDS.map(s => (
              <button key={s} onClick={() => set('playbackSpeed', s)} className={`rounded px-1 py-1 text-xs ${config.playbackSpeed === s ? 'bg-fund-up text-white' : 'bg-fund-bg hover:bg-fund-border/30'}`}>{s}x</button>
            ))}</div>
          </div>
          {/* 刷新间隔 */}
          <div>
            <label className="text-xs font-medium mb-1.5 block">刷新间隔</label>
            <div className="grid grid-cols-5 gap-1">{INTERVALS.map(i => (
              <button key={i.v} onClick={() => set('interval', i.v)} className={`rounded px-1 py-1 text-xs ${config.interval === i.v ? 'bg-fund-up text-white' : 'bg-fund-bg hover:bg-fund-border/30'}`}>{i.l}</button>
            ))}</div>
          </div>
          {/* 开关 */}
          <div className="space-y-2">
            {[['autoFetch', '自动刷新'], ['stopAfterClose', '收盘后停止'], ['barrageEnabled', '弹幕']].map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer text-xs">
                <input type="checkbox" checked={config[k as keyof Config] as boolean} onChange={e => set(k as keyof Config, e.target.checked)} className="accent-fund-up" />{l}
              </label>
            ))}
          </div>
          {/* 透明度 */}
          <div>
            <label className="text-xs font-medium mb-1 block">透明度 {(config.bgOpacity * 100).toFixed(0)}%</label>
            <input type="range" min="0.1" max="1" step="0.05" value={config.bgOpacity} onChange={e => set('bgOpacity', +e.target.value)} className="w-full h-1.5 rounded-full bg-fund-border appearance-none cursor-pointer" />
          </div>

          {/* 分隔线 - 社交数据 */}
          <div className="border-t border-fund-border" />
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <Globe size={13} /> 社交数据源
          </div>

          {/* CORS 代理 Worker */}
          <div>
            <label className="text-xs font-medium mb-1.5 flex items-center gap-1">
              CORS 代理
              <span className="text-[10px] text-fund-fg/40 font-normal">（推荐）</span>
            </label>
            <input
              type="text"
              value={config.proxyWorkerUrl}
              onChange={e => set('proxyWorkerUrl', e.target.value.replace(/\/+$/, ''))}
              placeholder="https://your-worker.xxx.workers.dev"
              className="w-full bg-fund-bg border border-fund-border rounded px-2 py-1.5 text-xs text-fund-fg placeholder:text-fund-fg/30"
            />
            <p className="text-[10px] text-fund-fg/40 mt-1 leading-relaxed">
              部署 Cloudflare Worker 后填入地址，详见 worker.js。留空则使用免费代理（国内不稳定）。
            </p>
          </div>

          {/* 雪球 Cookie */}
          <div>
            <label className="text-xs font-medium mb-1.5 block">雪球 Cookie</label>
            <textarea
              value={config.xueqiuCookie}
              onChange={e => set('xueqiuCookie', e.target.value)}
              placeholder="粘贴雪球 xq_a_token（登录后 F12 → Application → Cookies）"
              className="w-full bg-fund-bg border border-fund-border rounded px-2 py-1.5 text-xs text-fund-fg placeholder:text-fund-fg/30 resize-none h-16"
            />
          </div>

          {/* 淘股吧 Cookie */}
          <div>
            <label className="text-xs font-medium mb-1.5 block">淘股吧 Cookie</label>
            <textarea
              value={config.taogubaCookie}
              onChange={e => set('taogubaCookie', e.target.value)}
              placeholder="粘贴淘股吧 Cookie（登录后 F12 → Application → Cookies → 复制全部）"
              className="w-full bg-fund-bg border border-fund-border rounded px-2 py-1.5 text-xs text-fund-fg placeholder:text-fund-fg/30 resize-none h-16"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
