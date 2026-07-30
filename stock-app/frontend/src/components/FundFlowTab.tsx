'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import { apiGet, fmt } from '@/lib/api'
import type { SectorMeta, IntradayPoint } from '@/lib/types'

// visx imports
import { scaleBand, scaleLinear } from '@visx/scale'
import { AxisLeft, AxisBottom } from '@visx/axis'
import { GridRows, GridColumns } from '@visx/grid'
import { LinePath } from '@visx/shape'
import { ParentSize } from '@visx/responsive'

type PlaybackSpeed = 1 | 3 | 10 | 30 | 60 | 120

const SPEED_OPTIONS: { speed: PlaybackSpeed; label: string }[] = [
  { speed: 1, label: '1x' },
  { speed: 3, label: '3x' },
  { speed: 10, label: '10x' },
  { speed: 30, label: '30x' },
  { speed: 60, label: '60x' },
  { speed: 120, label: '120x' },
]

const SECTOR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b',
]

export default function FundFlowTab() {
  const [sectors, setSectors] = useState<SectorMeta[]>([])
  const [intraday, setIntraday] = useState<IntradayPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null)

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1)
  const [currentIndex, setCurrentIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadSectors = useCallback(async () => {
    try {
      const res = await apiGet<{ sectors: SectorMeta[] }>('/fund-flow/sectors')
      const list = res.sectors || []
      setSectors(list)
    } catch {
      setError('加载板块列表失败')
    }
  }, [])

  const loadIntraday = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiGet<{ intraday: IntradayPoint[] }>('/fund-flow/intraday')
      const list = res.intraday || []
      setIntraday(list)
      // 直接定位到当前时间（最后一个数据点）
      setCurrentIndex(Math.max(0, list.length - 1))
    } catch {
      setError('加载分时数据失败')
    } finally { setLoading(false) }
  }, [])

  const loadedRef = useRef(false)
  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    loadSectors()
    loadIntraday()
  }, [loadSectors, loadIntraday])

  // Playback timer: 1x = 1 second per data point
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (isPlaying && intraday.length > 0) {
      const intervalMs = 1000 / playbackSpeed
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= intraday.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, intervalMs)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isPlaying, playbackSpeed, intraday.length])

  const handleRefresh = useCallback(() => {
    loadSectors()
    loadIntraday()
  }, [loadSectors, loadIntraday])

  // Compute current snapshot data
  const currentPoint = intraday[currentIndex] || null

  // Build bar chart data from current point (for overview mode)
  const barData = useMemo(() => {
    if (!currentPoint || sectors.length === 0) return []
    return sectors
      .map((s, i) => ({
        id: s.id,
        name: s.name,
        value: currentPoint.sectors[s.id] ?? 0,
        color: s.color || SECTOR_COLORS[i % SECTOR_COLORS.length],
      }))
      .sort((a, b) => a.value - b.value)
  }, [currentPoint, sectors])

  // Build line chart data for selected sector (intraday time series)
  const lineData = useMemo(() => {
    if (!selectedSectorId || intraday.length === 0) return []
    return intraday.slice(0, currentIndex + 1).map((p) => ({
      time: p.time,
      value: p.sectors[selectedSectorId] ?? 0,
    }))
  }, [selectedSectorId, intraday, currentIndex])

  const selectedSector = sectors.find((s) => s.id === selectedSectorId)

  if (sectors.length === 0 && intraday.length === 0 && !loading) {
    return (
      <div className="flex items-center justify-center h-full text-fund-fg/40 text-sm">
        暂无数据
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-fund-border flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          资金流向
          {selectedSector && <span className="text-fund-fg/40 ml-1.5">/ {selectedSector.name}</span>}
        </h2>
        <button onClick={handleRefresh} disabled={loading} className="p-1 rounded hover:bg-fund-card">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="px-3 py-1.5 text-xs text-fund-down bg-fund-down/10 border-b border-fund-border">
          {error}
        </div>
      )}

      {/* Main content: sector list + chart */}
      <div className="flex-1 flex min-h-0">
        {/* Left: sector list */}
        <div className="w-[120px] shrink-0 border-r border-fund-border overflow-y-auto">
          <div className="p-1">
            {/* "全部" overview button */}
            <button
              onClick={() => setSelectedSectorId(null)}
              className={`w-full text-left px-2 py-1.5 text-[11px] rounded transition-colors ${
                selectedSectorId === null
                  ? 'bg-fund-up text-white'
                  : 'text-fund-fg/60 hover:bg-fund-card'
              }`}
            >
              全部板块
            </button>
            {sectors.map((s, i) => (
              <button
                key={`sec-${s.id || s.code || s.name}-${i}`}
                onClick={() => setSelectedSectorId(s.id)}
                className={`w-full text-left px-2 py-1.5 text-[11px] rounded transition-colors ${
                  selectedSectorId === s.id
                    ? 'bg-fund-up text-white'
                    : 'text-fund-fg/60 hover:bg-fund-card'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right: chart area */}
        <div className="flex-1 min-w-0">
          {selectedSectorId === null ? (
            /* ===== Overview: Bar chart of all sectors ===== */
            barData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-fund-fg/40 text-sm">
                {loading ? '加载中...' : '暂无数据'}
              </div>
            ) : (
              <ParentSize>
                {({ width, height }) => {
                  const margin = { top: 10, right: 30, bottom: 40, left: 50 }
                  const innerWidth = width - margin.left - margin.right
                  const innerHeight = height - margin.top - margin.bottom

                  if (innerWidth <= 0 || innerHeight <= 0) return null

                  const yScale = scaleBand<string>({
                    domain: barData.map((d) => d.name),
                    range: [0, innerHeight],
                    padding: 0.15,
                  })
                  const xScale = scaleLinear<number>({
                    domain: [Math.min(0, ...barData.map((d) => d.value)), Math.max(...barData.map((d) => d.value))],
                    range: [0, innerWidth],
                  })

                  const xZero = xScale(0)

                  return (
                    <svg width={width} height={height}>
                      <GridRows left={margin.left} scale={yScale} width={innerWidth} stroke="#ffffff10" />
                      <GridColumns top={margin.top} scale={xScale} height={innerHeight} stroke="#ffffff10" />
                      {barData.map((d, i) => {
                        const y = yScale(d.name)
                        const barHeight = yScale.bandwidth()
                        const barX = d.value >= 0 ? xZero : xScale(d.value)
                        const barWidth = d.value >= 0 ? xScale(d.value) - xZero : xZero - xScale(d.value)
                        return (
                          <g key={`bar-${d.id || d.name}-${i}`}>
                            <rect
                              x={margin.left + barX}
                              y={margin.top + (y ?? 0)}
                              width={Math.max(barWidth, 1)}
                              height={barHeight}
                              fill={d.color}
                              opacity={0.85}
                              rx={2}
                            />
                            <text
                              x={margin.left + (d.value >= 0 ? xScale(d.value) + 4 : xScale(d.value) - 4)}
                              y={margin.top + (y ?? 0) + barHeight / 2}
                              fill="#ffffffcc"
                              fontSize={10}
                              dominantBaseline="middle"
                              textAnchor={d.value >= 0 ? 'start' : 'end'}
                            >
                              {fmt.rate(d.value)}
                            </text>
                          </g>
                        )
                      })}
                      <AxisLeft
                        left={margin.left}
                        scale={yScale}
                        tickFormat={(v: string) => v.length > 6 ? v.slice(0, 6) + '..' : v}
                        stroke="#ffffff30"
                        tickStroke="#ffffff30"
                        tickLabelProps={() => ({ fontSize: 10, fill: '#ffffff60', textAnchor: 'end', dy: '0.33em' })}
                      />
                      <AxisBottom
                        top={margin.top + innerHeight}
                        left={margin.left}
                        scale={xScale}
                        stroke="#ffffff30"
                        tickStroke="#ffffff30"
                        tickLabelProps={() => ({ fontSize: 10, fill: '#ffffff60', textAnchor: 'middle', dy: '0.33em' })}
                      />
                    </svg>
                  )
                }}
              </ParentSize>
            )
          ) : (
            /* ===== Single sector: Intraday line chart ===== */
            lineData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-fund-fg/40 text-sm">
                {loading ? '加载中...' : '暂无数据'}
              </div>
            ) : (
              <ParentSize>
                {({ width, height }) => {
                  const margin = { top: 20, right: 40, bottom: 40, left: 50 }
                  const innerWidth = width - margin.left - margin.right
                  const innerHeight = height - margin.top - margin.bottom

                  if (innerWidth <= 0 || innerHeight <= 0) return null

                  const values = lineData.map((d) => d.value)
                  const maxVal = Math.max(...values, 0)
                  const minVal = Math.min(...values, 0)
                  const padding = Math.max((maxVal - minVal) * 0.1, 0.5)

                  const xScale = scaleLinear<number>({
                    domain: [0, Math.max(lineData.length - 1, 1)],
                    range: [0, innerWidth],
                  })
                  const yScale = scaleLinear<number>({
                    domain: [minVal - padding, maxVal + padding],
                    range: [innerHeight, 0],
                  })

                  const yZero = yScale(0)
                  const lineColor = (lineData[lineData.length - 1]?.value ?? 0) >= 0 ? '#ef4444' : '#22c55e'

                  // Time tick labels (show ~6 evenly spaced)
                  const tickStep = Math.max(Math.floor(lineData.length / 6), 1)
                  const timeTicks = lineData.map((_, i) => i).filter((i) => i % tickStep === 0)

                  return (
                    <svg width={width} height={height}>
                      <GridRows left={margin.left} scale={yScale} width={innerWidth} stroke="#ffffff10" />
                      <GridColumns top={margin.top} scale={xScale} height={innerHeight} stroke="#ffffff10" />
                      {/* Zero line */}
                      {yZero >= 0 && yZero <= innerHeight && (
                        <line
                          x1={margin.left} y1={margin.top + yZero}
                          x2={margin.left + innerWidth} y2={margin.top + yZero}
                          stroke="#ffffff30" strokeDasharray="4 4"
                        />
                      )}
                      {/* Area under curve (gradient fill) */}
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
                          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {yZero >= 0 && yZero <= innerHeight && (
                        <path
                          d={`M ${margin.left},${margin.top + yZero} ` +
                            lineData.map((d, i) => `L ${margin.left + xScale(i)},${margin.top + yScale(d.value)}`).join(' ') +
                            ` L ${margin.left + xScale(lineData.length - 1)},${margin.top + yZero} Z`}
                          fill="url(#areaGrad)"
                        />
                      )}
                      {/* Line path */}
                      <LinePath
                        data={lineData}
                        x={(_, i) => margin.left + xScale(i)}
                        y={(d) => margin.top + yScale(d.value)}
                        stroke={lineColor}
                        strokeWidth={2}
                        fill="none"
                      />
                      {/* Current point marker */}
                      {lineData.length > 0 && (
                        <circle
                          cx={margin.left + xScale(lineData.length - 1)}
                          cy={margin.top + yScale(lineData[lineData.length - 1].value)}
                          r={3}
                          fill={lineColor}
                        />
                      )}
                      {/* Y axis */}
                      <AxisLeft
                        left={margin.left}
                        scale={yScale}
                        stroke="#ffffff30"
                        tickStroke="#ffffff30"
                        tickFormat={(v: any) => Number(v).toFixed(1)}
                        tickLabelProps={() => ({ fontSize: 10, fill: '#ffffff60', textAnchor: 'end', dy: '0.33em' })}
                      />
                      {/* X axis with time labels */}
                      <AxisBottom
                        top={margin.top + innerHeight}
                        left={margin.left}
                        scale={xScale}
                        tickValues={timeTicks}
                        tickFormat={(v: any) => lineData[Number(v)]?.time || ''}
                        stroke="#ffffff30"
                        tickStroke="#ffffff30"
                        tickLabelProps={() => ({ fontSize: 9, fill: '#ffffff60', textAnchor: 'middle', dy: '0.33em' })}
                      />
                      {/* Current value label */}
                      {lineData.length > 0 && (
                        <text
                          x={margin.left + innerWidth}
                          y={margin.top + yScale(lineData[lineData.length - 1].value) - 8}
                          fill={lineColor}
                          fontSize={11}
                          fontWeight="bold"
                          textAnchor="end"
                        >
                          {lineData[lineData.length - 1].value.toFixed(2)}亿
                        </text>
                      )}
                    </svg>
                  )
                }}
              </ParentSize>
            )
          )}
        </div>
      </div>

      {/* Playback controls */}
      <div className="shrink-0 border-t border-fund-border bg-fund-card/50 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (currentIndex >= intraday.length - 1) {
                  setCurrentIndex(0)
                }
                setIsPlaying((p) => !p)
              }}
              className="px-2 py-1 text-xs rounded bg-fund-card text-fund-fg/70 hover:bg-fund-card/80"
            >
              {isPlaying ? '暂停' : currentIndex >= intraday.length - 1 ? '重播' : '播放'}
            </button>
            <span className="text-[10px] text-fund-fg/40">
              {currentPoint ? currentPoint.time : '--'}
              {' / '}
              {intraday.length > 0 ? intraday[intraday.length - 1].time : '--'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt.speed}
                onClick={() => setPlaybackSpeed(opt.speed)}
                className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                  playbackSpeed === opt.speed
                    ? 'bg-fund-up text-white'
                    : 'text-fund-fg/50 hover:bg-fund-card'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {/* Progress bar */}
        {intraday.length > 0 && (
          <div className="mt-1.5 relative h-1 bg-fund-border/30 rounded-full">
            <div
              className="absolute left-0 top-0 h-full bg-fund-up/60 rounded-full transition-all"
              style={{ width: `${(currentIndex / Math.max(intraday.length - 1, 1)) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
