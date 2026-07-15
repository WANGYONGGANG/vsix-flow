import { useMemo } from 'react';
import type { IntradayPoint, SectorMeta } from '@/types';

interface Props {
  data: IntradayPoint[];
  sectors: SectorMeta[];
  hoverIndex: number | null;
}

export default function SectorRankList({ data, sectors, hoverIndex }: Props) {
  const ranks = useMemo(() => {
    if (!data.length) return [];
    const idx = hoverIndex !== null ? hoverIndex : data.length - 1;
    const point = data[idx];
    if (!point) return [];
    const entries = sectors
      .map((s) => ({
        ...s,
        value: point.sectors[s.name] ?? 0,
      }))
      .sort((a, b) => b.value - a.value);
    return entries;
  }, [data, sectors, hoverIndex]);

  if (!ranks.length) return null;

  const lastInIdx = ranks.findIndex((r) => r.value < 0);

  return (
    <div className="w-44 border-l border-fund-border bg-fund-bg overflow-y-auto hidden sm:block">
      <div className="sticky top-0 bg-fund-bg px-3 py-2 text-xs font-bold border-b border-fund-border">
        板块排名（亿）
      </div>
      <div className="px-2 py-1">
        {ranks.map((s, i) => (
          <div key={s.id}>
            {/* Divider between inflow and outflow */}
            {i === lastInIdx && i > 0 && (
              <div className="my-1 border-t border-fund-border/50" />
            )}
            <div
              className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-fund-card transition-colors"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="truncate text-fund-fg/80 text-xs">
                  {s.name}
                </span>
              </div>
              <span
                className={`ml-2 text-xs font-mono whitespace-nowrap ${
                  s.value >= 0 ? 'text-fund-up' : 'text-fund-down'
                }`}
              >
                {s.value >= 0 ? '+' : ''}
                {s.value.toFixed(1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}