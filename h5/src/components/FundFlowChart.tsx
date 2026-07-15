import { memo, useMemo, useCallback } from 'react';
import { scaleLinear } from '@visx/scale';
import { LinePath } from '@visx/shape';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { useTooltip } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { ParentSize } from '@visx/responsive';
import type { IntradayPoint, SectorMeta } from '@/types';

interface Props {
  fullData: IntradayPoint[];
  visibleData: IntradayPoint[];
  sectors: SectorMeta[];
  hoverIndex: number | null;
  onHoverIndex: (idx: number | null) => void;
  progress?: number;
}

function timeToSeconds(time: string): number {
  const [h, m, s] = time.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

function ChartInner({
  width,
  height,
  fullData,
  visibleData,
  sectors,
  hoverIndex,
  onHoverIndex,
  progress,
}: Props & { width: number; height: number }) {
  const margin = { top: 16, right: 60, bottom: 36, left: 52 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // X scale: linear from 0 to total seconds in trading day
  const xDomain = useMemo(() => {
    if (fullData.length === 0) return [0, 1];
    const first = timeToSeconds(fullData[0].time);
    const last = timeToSeconds(fullData[fullData.length - 1].time);
    return [first, last] as [number, number];
  }, [fullData]);

  const xScale = useMemo(
    () =>
      scaleLinear({
        domain: xDomain,
        range: [0, innerWidth],
      }),
    [xDomain, innerWidth]
  );

  // Y scale based on VISIBLE data range (dynamic extension)
  const visibleValues = useMemo(
    () => visibleData.flatMap((d) => sectors.map((s) => d.sectors[s.name] ?? 0)),
    [visibleData, sectors]
  );
  const yMin = useMemo(() => Math.min(0, ...visibleValues), [visibleValues]);
  const yMax = useMemo(() => Math.max(0, ...visibleValues), [visibleValues]);
  const yPad = (yMax - yMin) * 0.1 || 1;

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
      const xValue = xScale.invert(x);
      // Find closest data point by time
      let closestIdx = 0;
      let closestDist = Infinity;
      for (let i = 0; i < fullData.length; i++) {
        const dist = Math.abs(timeToSeconds(fullData[i].time) - xValue);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      }
      onHoverIndex(closestIdx);
      const d = fullData[closestIdx];
      if (d) {
        showTooltip({
          tooltipData: {
            index: closestIdx,
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
    [fullData, sectors, xScale, margin.left, onHoverIndex, showTooltip]
  );

  const handlePointerLeave = useCallback(() => {
    onHoverIndex(null);
    hideTooltip();
  }, [onHoverIndex, hideTooltip]);

  // X tick values: every 30 minutes (09:30, 10:00, 10:30, 11:00, 11:30, 13:00, 13:30, 14:00, 14:30, 15:00)
  const xTickValues = useMemo(() => {
    const ticks: number[] = [];
    for (let h = 9; h <= 15; h++) {
      for (let m = 0; m < 60; m += 30) {
        if (h === 9 && m < 30) continue;
        if (h === 11 && m > 30) continue;
        if (h === 12) continue;
        if (h === 15 && m > 0) break;
        ticks.push(h * 3600 + m * 60);
      }
    }
    return ticks;
  }, []);

  const zeroY = yScale(0);
  const lastVisibleIndex = visibleData.length - 1;

  const endPoints = useMemo(() => {
    if (!visibleData[lastVisibleIndex]) return [];
    const lastD = visibleData[lastVisibleIndex];
    return sectors
      .map((s) => ({
        ...s,
        value: lastD.sectors[s.name] ?? 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [visibleData, lastVisibleIndex, sectors]);

  const minLabelSpacing = 14;

  const isPlaying = progress !== undefined && progress > 0 && progress < 1;
  const cursorIdx = isPlaying && fullData.length > 1
    ? Math.min(fullData.length - 1, Math.floor((fullData.length - 1) * progress))
    : -1;
  const cursorX = cursorIdx >= 0
    ? xScale(timeToSeconds(fullData[cursorIdx].time))
    : -1;

  return (
    <svg width={width} height={height}>
      <g transform={`translate(${margin.left},${margin.top})`}>
        <GridRows
          scale={yScale}
          width={innerWidth}
          stroke="var(--fund-grid)"
          strokeOpacity={0.5}
        />

        {zeroY !== undefined && (
          <line
            x1={0}
            x2={innerWidth}
            y1={zeroY}
            y2={zeroY}
            stroke="var(--fund-fg)"
            strokeOpacity={0.25}
            strokeWidth={1}
          />
        )}

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
          tickFormat={(v) => {
            const n = Number(v);
            const h = Math.floor(n / 3600);
            const m = Math.floor((n % 3600) / 60);
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          }}
          tickValues={xTickValues}
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
          const points = visibleData.map((d) => ({
            x: xScale(timeToSeconds(d.time)),
            y: yScale(d.sectors[s.name] ?? 0),
          }));
          return (
            <LinePath
              key={s.id}
              data={points}
              x={(d) => d.x}
              y={(d) => d.y}
              stroke={s.color}
              strokeWidth={1.5}
              strokeOpacity={0.85}
            />
          );
        })}

        {endPoints.map((ep, i) => {
          const lastD = visibleData[lastVisibleIndex];
          const x = xScale(timeToSeconds(lastD.time));
          const y = yScale(ep.value);
          const prevY = i > 0 ? yScale(endPoints[i - 1].value) : -Infinity;
          const adjustedY =
            i > 0 && Math.abs(y - prevY) < minLabelSpacing
              ? prevY - minLabelSpacing
              : y;
          return (
            <g key={ep.id}>
              <circle cx={x} cy={y} r={2.5} fill={ep.color} />
              <text
                x={x + 6}
                y={adjustedY + 3.5}
                fill={ep.color}
                fontSize={10}
                fontWeight={500}
              >
                {ep.value >= 0 ? '+' : ''}{ep.value.toFixed(1)}
              </text>
            </g>
          );
        })}

        {isPlaying && cursorX >= 0 && (() => {
          const cursorPoint = fullData[cursorIdx];
          const sortedSectors = sectors
            .map((s) => ({
              ...s,
              value: cursorPoint?.sectors[s.name] ?? 0,
            }))
            .sort((a, b) => b.value - a.value);
          const cursorSectors = [
            ...sortedSectors.slice(0, 3),
            ...sortedSectors.slice(-3),
          ];
          return (
            <>
              <line
                x1={cursorX}
                x2={cursorX}
                y1={0}
                y2={innerHeight}
                stroke="var(--fund-fg)"
                strokeOpacity={0.5}
                strokeWidth={1}
                strokeDasharray="4 3"
              />
              {cursorSectors.map((s) => {
                const y = yScale(s.value);
                return (
                  <circle
                    key={s.id}
                    cx={cursorX}
                    cy={y}
                    r={3}
                    fill={s.color}
                    stroke="var(--fund-bg)"
                    strokeWidth={1.5}
                  />
                );
              })}
            </>
          );
        })()}

        {hoverIndex !== null && fullData[hoverIndex] && (
          <line
            x1={xScale(timeToSeconds(fullData[hoverIndex].time))}
            x2={xScale(timeToSeconds(fullData[hoverIndex].time))}
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

const MemoChartInner = memo(ChartInner);

export default function FundFlowChart(props: Props) {
  return (
    <ParentSize>
      {({ width, height }) =>
        width > 0 && height > 0 ? (
          <MemoChartInner {...props} width={width} height={height} />
        ) : null
      }
    </ParentSize>
  );
}
