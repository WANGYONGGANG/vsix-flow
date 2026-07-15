import { useMemo, useCallback } from 'react';
import { scaleLinear, scaleBand } from '@visx/scale';
import { LinePath } from '@visx/shape';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { useTooltip } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { ParentSize } from '@visx/responsive';
import type { IntradayPoint, HistoricalPoint, SectorMeta, TimeRange } from '@/types';

interface Props {
  data: (IntradayPoint | HistoricalPoint)[];
  sectors: SectorMeta[];
  range: TimeRange;
  hoverIndex: number | null;
  onHoverIndex: (idx: number | null) => void;
}

function ChartInner({
  width,
  height,
  data,
  sectors,
  range,
  hoverIndex,
  onHoverIndex,
}: Props & { width: number; height: number }) {
  const margin = { top: 20, right: 10, bottom: 40, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const xDomain = useMemo(() => data.map((_, i) => i), [data]);
  const allValues = useMemo(
    () => data.flatMap((d) => sectors.map((s) => d.sectors[s.name] ?? 0)),
    [data, sectors]
  );
  const yMin = useMemo(() => Math.min(0, ...allValues), [allValues]);
  const yMax = useMemo(() => Math.max(0, ...allValues), [allValues]);
  const yPad = (yMax - yMin) * 0.1 || 1;

  const xScale = useMemo(
    () =>
      scaleBand<number>({
        domain: xDomain,
        range: [0, innerWidth],
        padding: 0,
      }),
    [xDomain, innerWidth]
  );

  const yScale = useMemo(
    () =>
      scaleLinear({
        domain: [yMin - yPad, yMax + yPad],
        range: [innerHeight, 0],
        nice: true,
      }),
    [yMin, yMax, yPad, innerHeight]
  );

  const { showTooltip, hideTooltip } = useTooltip<{
    index: number;
    values: { name: string; value: number; color: string }[];
  }>();

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGRectElement>) => {
      const point = localPoint(event);
      if (!point) return;
      const x = point.x - margin.left;
      const bandWidth = xScale.bandwidth();
      const index = Math.min(
        data.length - 1,
        Math.max(0, Math.floor(x / (bandWidth || 1)))
      );
      onHoverIndex(index);
      const d = data[index];
      if (d) {
        showTooltip({
          tooltipData: {
            index,
            values: sectors
              .map((s) => ({
                name: s.name,
                value: d.sectors[s.name] ?? 0,
                color: s.color,
              }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 8),
          },
          tooltipLeft: point.x,
          tooltipTop: point.y,
        });
      }
    },
    [data, sectors, xScale, margin.left, onHoverIndex, showTooltip]
  );

  const handlePointerLeave = useCallback(() => {
    onHoverIndex(null);
    hideTooltip();
  }, [onHoverIndex, hideTooltip]);

  const xTickFormat = useCallback(
    (i: number) => {
      const d = data[i];
      if (!d) return '';
      if (range === 'intraday') {
        return (d as IntradayPoint).time;
      }
      const date = (d as HistoricalPoint).date;
      return date.slice(5);
    },
    [data, range]
  );

  const xTickValues = useMemo(() => {
    if (range !== 'intraday' || data.length === 0) return undefined;
    const values = new Set<number>();
    const total = data.length;
    // 均匀分布约8个刻度，但确保首尾都有
    const count = Math.min(total, 8);
    const step = (total - 1) / (count - 1);
    for (let i = 0; i < count; i++) {
      values.add(Math.round(i * step));
    }
    // 强制包含最后一个点（15:00）
    values.add(total - 1);
    return Array.from(values).sort((a, b) => a - b);
  }, [data.length, range]);

  return (
    <svg width={width} height={height}>
      <g transform={`translate(${margin.left},${margin.top})`}>
        <GridRows
          scale={yScale}
          width={innerWidth}
          stroke="var(--fund-grid)"
          strokeOpacity={0.5}
        />

        <AxisLeft
          scale={yScale}
          numTicks={5}
          tickStroke="var(--fund-fg)"
          tickLabelProps={() => ({
            fill: 'var(--fund-fg)',
            fontSize: 10,
            textAnchor: 'end',
            opacity: 0.6,
          })}
          stroke="var(--fund-grid)"
        />

        <AxisBottom
          scale={xScale}
          top={innerHeight}
          tickFormat={xTickFormat}
          tickValues={xTickValues}
          numTicks={range === 'intraday' ? undefined : Math.min(data.length, 6)}
          tickStroke="var(--fund-fg)"
          tickLabelProps={() => ({
            fill: 'var(--fund-fg)',
            fontSize: 10,
            textAnchor: 'middle',
            opacity: 0.6,
          })}
          stroke="var(--fund-grid)"
        />

        {sectors.map((s) => {
          const points = data.map((d, i) => ({
            x: (xScale(i) || 0) + xScale.bandwidth() / 2,
            y: yScale(d.sectors[s.name] ?? 0),
          }));
          return (
            <LinePath
              key={s.id}
              data={points}
              x={(d) => d.x}
              y={(d) => d.y}
              stroke={s.color}
              strokeWidth={2}
              strokeOpacity={0.9}
            />
          );
        })}

        {hoverIndex !== null && data[hoverIndex] && (
          <line
            x1={(xScale(hoverIndex) || 0) + xScale.bandwidth() / 2}
            x2={(xScale(hoverIndex) || 0) + xScale.bandwidth() / 2}
            y1={0}
            y2={innerHeight}
            stroke="var(--fund-fg)"
            strokeOpacity={0.3}
            strokeDasharray="4 4"
          />
        )}

        <rect
          width={innerWidth}
          height={innerHeight}
          fill="transparent"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        />
      </g>
    </svg>
  );
}

export default function FundFlowChart(props: Props) {
  return (
    <ParentSize>
      {({ width, height }) =>
        width > 0 && height > 0 ? (
          <ChartInner {...props} width={width} height={height} />
        ) : null
      }
    </ParentSize>
  );
}