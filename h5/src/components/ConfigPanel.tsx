import { Settings, X } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface Config {
  interval: number;
  playbackSpeed: number;
  autoFetch: boolean;
  stopAfterClose: boolean;
  showRankList: boolean;
  bgOpacity: number;
}

interface Props {
  config: Config;
  onConfigChange: (config: Config) => void;
  isOpen: boolean;
  onClose: () => void;
}

const INTERVALS = [
  { value: 3000, label: '3秒' },
  { value: 6000, label: '6秒' },
  { value: 10000, label: '10秒' },
  { value: 60000, label: '1分钟' },
  { value: 300000, label: '5分钟' },
];

const SPEEDS = [
  { value: 1, label: '1x' },
  { value: 3, label: '3x' },
  { value: 10, label: '10x' },
  { value: 30, label: '30x' },
  { value: 60, label: '60x' },
  { value: 120, label: '120x' },
  { value: 240, label: '240x' },
];

const THEMES = [
  { value: 'light', label: '亮色主题' },
  { value: 'dark', label: '暗色主题' },
  { value: 'vscode-bg', label: 'VS Code背景' },
];

export default function ConfigPanel({ config, onConfigChange, isOpen, onClose }: Props) {
  const { theme, setTheme } = useTheme();

  const handleChange = <K extends keyof Config>(key: K, value: Config[K]) => {
    const newConfig = { ...config, [key]: value };
    onConfigChange(newConfig);
    if (typeof window !== 'undefined' && (window as any).FUND_FLOW_VSCODE) {
      window.postMessage({ type: 'config', config: newConfig });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-fund-card border border-fund-border p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings size={18} />
            <h2 className="text-lg font-bold">设置</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-fund-bg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">主题模式</label>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value as any)}
                  className={`rounded px-3 py-2 text-sm transition-colors ${
                    theme === t.value
                      ? 'bg-fund-up text-white'
                      : 'bg-fund-bg hover:bg-fund-border/30'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              回放速度
              <span className="ml-2 text-xs text-fund-fg/40 font-normal">
                {SPEEDS.find(s => s.value === config.playbackSpeed)?.label || `${config.playbackSpeed}x`}
              </span>
            </label>
            <div className="grid grid-cols-7 gap-1">
              {SPEEDS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => handleChange('playbackSpeed', s.value)}
                  className={`rounded px-1 py-1.5 text-xs transition-colors ${
                    config.playbackSpeed === s.value
                      ? 'bg-fund-up text-white'
                      : 'bg-fund-bg hover:bg-fund-border/30'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-fund-fg/40 mt-1">1x = 1数据点/秒，240x ≈ 1秒播完全天</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">数据刷新间隔</label>
            <div className="grid grid-cols-5 gap-2">
              {INTERVALS.map((i) => (
                <button
                  key={i.value}
                  onClick={() => handleChange('interval', i.value)}
                  className={`rounded px-2 py-1.5 text-xs transition-colors ${
                    config.interval === i.value
                      ? 'bg-fund-up text-white'
                      : 'bg-fund-bg hover:bg-fund-border/30'
                  }`}
                >
                  {i.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoFetch}
                onChange={(e) => handleChange('autoFetch', e.target.checked)}
                className="rounded accent-fund-up"
              />
              <span className="text-sm">开盘自动拉取数据</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.stopAfterClose}
                onChange={(e) => handleChange('stopAfterClose', e.target.checked)}
                className="rounded accent-fund-up"
              />
              <span className="text-sm">收盘后停止拉取</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showRankList}
                onChange={(e) => handleChange('showRankList', e.target.checked)}
                className="rounded accent-fund-up"
              />
              <span className="text-sm">显示右侧排名列表</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              页面透明度: {(config.bgOpacity * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={config.bgOpacity}
              onChange={(e) => handleChange('bgOpacity', parseFloat(e.target.value))}
              className="w-full h-2 rounded-full bg-fund-border appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-fund-fg/60 mt-1">
              <span>10%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
