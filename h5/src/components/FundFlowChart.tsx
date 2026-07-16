import { memo, useMemo } from 'react';
import { scaleLinear, scaleBand } from '@visx/scale';
import { ParentSize } from '@visx/responsive';
import type { IntradayPoint, SectorMeta } from '@/types';

interface Props { currentPoint: IntradayPoint | null; sectors: SectorMeta[]; maxAbsValue: number }

export default memo(function FundFlowChart({ currentPoint, sectors, maxAbsValue }: Props) {
  return (
    <ParentSize>
      {({ width, height }) => width > 0 && height > 0 ? (
        <Inner w={width} h={height} currentPoint={currentPoint} sectors={sectors} maxAbsValue={maxAbsValue} />
      ) : null}
    </ParentSize>
  );
});

function Inner({ w, h, currentPoint, sectors, maxAbsValue }: Props & { w: number; h: number }) {
  const ml = 70, mr = 55, mt = 6, mb = 24;
  const iw = w - ml - mr, ih = h - mt - mb;

  // Split: top 10 inflow (positive), bottom 10 outflow (negative)
  const { inflow, outflow } = useMemo(() => {
    if (!currentPoint) return { inflow: [], outflow: [] };
    const all = sectors.map(s => ({ ...s, v: currentPoint.sectors[s.name] ?? 0 }));
    return {
      inflow: all.filter(d => d.v >= 0).sort((a, b) => b.v - a.v).slice(0, 10),
      outflow: all.filter(d => d.v < 0).sort((a, b) => a.v - b.v).slice(0, 10), // most negative first
    };
  }, [currentPoint, sectors]);

  const all = [...inflow, ...outflow];
  const xMax = Math.max(5, maxAbsValue * 1.05);
  const x = useMemo(() => scaleLinear({ domain: [0, xMax], range: [0, iw] }), [xMax, iw]);
  const y = useMemo(() => scaleBand({ domain: all.map((_, i) => i), range: [0, ih], padding: 0.1 }), [all, ih]);
  const bh = Math.max(12, y.bandwidth() || 16);

  const step = Math.ceil(xMax / 5 / 5) * 5 || 5;
  const ticks: number[] = [];
  for (let v = 0; v <= xMax; v += step) ticks.push(v);

  const sepY = inflow.length > 0 && outflow.length > 0
    ? (y(inflow.length) || 0)
    : -1;

  return (
    <svg width={w} height={h}>
      <g transform={`translate(${ml},${mt})`}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={0} y2={ih} stroke="var(--fund-grid)" strokeOpacity={0.25} strokeDasharray={t === 0 ? undefined : '2 2'} />
            <text x={x(t)} y={ih + 14} textAnchor="middle" fill="var(--fund-fg)" fontSize={9} opacity={0.4}>{t}亿</text>
          </g>
        ))}
        {sepY > 0 && (
          <line x1={0} x2={iw} y1={sepY} y2={sepY} stroke="var(--fund-fg)" strokeOpacity={0.15} strokeWidth={1} />
        )}
        {all.map((d, i) => {
          const by = (y(i) || 0) + (y.bandwidth() - bh) / 2;
          const bw = x(Math.abs(d.v));
          const isIn = d.v >= 0;
          return (
            <g key={d.id + '-' + i}>
              <rect x={0} y={by} width={bw} height={bh} fill={isIn ? 'var(--fund-up)' : 'var(--fund-down)'} rx={1.5} opacity={0.8} />
              <text x={-4} y={by + bh / 2 + 3.5} textAnchor="end" fill="var(--fund-fg)" fontSize={10} opacity={0.85}>{d.name}</text>
              <text x={bw + 3} y={by + bh / 2 + 3.5} textAnchor="start" fill={isIn ? 'var(--fund-up)' : 'var(--fund-down)'} fontSize={9} fontWeight={500}>{Math.abs(d.v).toFixed(1)}亿</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
