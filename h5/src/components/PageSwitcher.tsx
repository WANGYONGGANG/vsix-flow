import { BarChart3, Zap, Layers, Sword, Flame } from 'lucide-react';

export type PageId = 'fundFlow' | 'em_news' | 'sector_limit' | 'dragon_tiger' | 'yesterday_limit';

interface Props {
  current: PageId;
  onChange: (p: PageId) => void;
}

const PAGES: { id: PageId; icon: typeof BarChart3; label: string; title: string }[] = [
  { id: 'fundFlow', icon: BarChart3, label: '资金', title: '主力资金流向' },
  { id: 'em_news', icon: Zap, label: '新闻', title: '东财7x24快讯' },
  { id: 'sector_limit', icon: Layers, label: '板块', title: '涨跌停板块排行' },
  { id: 'dragon_tiger', icon: Sword, label: '龙虎', title: '昨日龙虎榜' },
  { id: 'yesterday_limit', icon: Flame, label: '涨停', title: '昨日涨停今日表现' },
];

export default function PageSwitcher({ current, onChange }: Props) {
  return (
    <div className="flex items-center bg-fund-card rounded-md border border-fund-border overflow-hidden">
      {PAGES.map(p => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          title={p.title}
          className={`flex items-center gap-1 px-2 py-1 text-xs transition-colors ${
            current === p.id
              ? 'bg-fund-up text-white'
              : 'text-fund-fg/60 hover:bg-fund-hover hover:text-fund-fg'
          }`}
        >
          <p.icon size={13} />
          <span>{p.label}</span>
        </button>
      ))}
    </div>
  );
}
