import type { TimeRange } from '@/types';

interface Props {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
}

export default function TimeRangeTabs({ value, onChange }: Props) {
  const tabs: { key: TimeRange; label: string }[] = [
    { key: 'intraday', label: '当日实时' },
    { key: 'history', label: '近45天' },
  ];
  return (
    <div className="inline-flex rounded bg-fund-card p-0.5">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`rounded px-3 py-1 text-sm transition-colors ${
            value === t.key
              ? 'bg-fund-up text-white'
              : 'text-fund-fg/70 hover:text-fund-fg'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}