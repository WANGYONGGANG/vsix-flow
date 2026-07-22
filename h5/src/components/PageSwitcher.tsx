import { BarChart3, Zap, TrendingUp, Landmark } from 'lucide-react';

export type PageId = 'fundFlow' | 'em_kuaixun' | 'em_gushi' | 'em_caijing';

interface Props {
  current: PageId;
  onChange: (p: PageId) => void;
}

const PAGES: { id: PageId; icon: typeof BarChart3; label: string; title: string }[] = [
  { id: 'fundFlow', icon: BarChart3, label: '资金', title: '主力资金流向' },
  { id: 'em_kuaixun', icon: Zap, label: '快讯', title: '东财7x24快讯' },
  { id: 'em_gushi', icon: TrendingUp, label: '股市', title: '东财股市新闻' },
  { id: 'em_caijing', icon: Landmark, label: '财经', title: '东财财经新闻' },
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
          <p.icon size={14} />
          <span className="hidden sm:inline">{p.label}</span>
        </button>
      ))}
    </div>
  );
}