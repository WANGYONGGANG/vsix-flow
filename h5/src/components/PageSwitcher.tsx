import { BarChart3, Newspaper, MessageSquare } from 'lucide-react';

export type PageId = 'fundFlow' | 'xueqiu' | 'taoguba';

interface Props {
  current: PageId;
  onChange: (p: PageId) => void;
}

const PAGES: { id: PageId; icon: typeof BarChart3; label: string; title: string }[] = [
  { id: 'fundFlow', icon: BarChart3, label: '资金', title: '主力资金流向' },
  { id: 'xueqiu', icon: Newspaper, label: '雪球', title: '雪球热帖' },
  { id: 'taoguba', icon: MessageSquare, label: '淘股吧', title: '淘股吧讨论' },
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