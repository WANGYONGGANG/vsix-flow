'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createChart, type IChartApi, type ISeriesApi, ColorType, CrosshairMode, type CandlestickData, type HistogramData, type LineData, type Time } from 'lightweight-charts'
import { useApp } from '@/lib/store'
import { apiGet } from '@/lib/api'
import type { KlineData } from '@/lib/types'

// 周期选项
const PERIODS: { key: string; label: string }[] = [
  { key: '5min', label: '5分' },
  { key: '15min', label: '15分' },
  { key: '30min', label: '30分' },
  { key: '60min', label: '60分' },
  { key: 'day', label: '日K' },
  { key: 'week', label: '周K' },
  { key: 'month', label: '月K' },
]

// 副图指标选项
const INDICATORS: { key: string; label: string }[] = [
  { key: 'vol', label: '成交量' },
  { key: 'macd', label: 'MACD' },
  { key: 'kdj', label: 'KDJ' },
  { key: 'rsi', label: 'RSI' },
]

interface Props {
  code: string
  preClose?: number  // 昨收价，用于判断涨跌停
}

export default function KlineChart({ code, preClose }: Props) {
  const { costPrice } = useApp()
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const ma5Ref = useRef<ISeriesApi<'Line'> | null>(null)
  const ma10Ref = useRef<ISeriesApi<'Line'> | null>(null)
  const ma20Ref = useRef<ISeriesApi<'Line'> | null>(null)
  const costLineRef = useRef<ISeriesApi<'Line'> | null>(null)
  const [period, setPeriod] = useState('day')
  const [subIndicators, setSubIndicators] = useState<string[]>(['vol'])
  const [klines, setKlines] = useState<KlineData[]>([])
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')

  // 计算 MA 均线
  const calcMA = useCallback((data: number[], n: number): (number | undefined)[] => {
    const result: (number | undefined)[] = []
    for (let i = 0; i < data.length; i++) {
      if (i < n - 1) { result.push(undefined); continue }
      let sum = 0
      for (let j = 0; j < n; j++) sum += data[i - j]
      result.push(sum / n)
    }
    return result
  }, [])

  // 计算 MACD
  const calcMACD = useCallback((closes: number[]) => {
    const ema12: number[] = []
    const ema26: number[] = []
    const dif: number[] = []
    const dea: number[] = []
    const macd: number[] = []
    let e12 = closes[0], e26 = closes[0]
    for (let i = 0; i < closes.length; i++) {
      e12 = (closes[i] * 2 + e12 * 10) / 12
      e26 = (closes[i] * 2 + e26 * 26) / 28
      ema12.push(e12)
      ema26.push(e26)
      dif.push(e12 - e26)
    }
    let d = dif[0]
    for (let i = 0; i < dif.length; i++) {
      d = (dif[i] * 2 + d * 8) / 10
      dea.push(d)
      macd.push((dif[i] - d) * 2)
    }
    return { dif, dea, macd }
  }, [])

  // 计算 KDJ
  const calcKDJ = useCallback((klines: KlineData[], n = 9, m1 = 3, m2 = 3) => {
    const k: number[] = [], d: number[] = [], j: number[] = []
    let prevK = 50, prevD = 50
    for (let i = 0; i < klines.length; i++) {
      const start = Math.max(0, i - n + 1)
      let high = -Infinity, low = Infinity
      for (let s = start; s <= i; s++) {
        if (klines[s].high > high) high = klines[s].high
        if (klines[s].low < low) low = klines[s].low
      }
      const rsv = high === low ? 50 : ((klines[i].close - low) / (high - low)) * 100
      const curK = (2 / m1) * rsv + ((m1 - 1) / m1) * prevK
      const curD = (2 / m2) * curK + ((m2 - 1) / m2) * prevD
      const curJ = 3 * curK - 2 * curD
      k.push(curK); d.push(curD); j.push(curJ)
      prevK = curK; prevD = curD
    }
    return { k, d, j }
  }, [])

  // 计算 RSI
  const calcRSI = useCallback((closes: number[], n = 14) => {
    const rsi: (number | undefined)[] = []
    for (let i = 0; i < closes.length; i++) {
      if (i < n) { rsi.push(undefined); continue }
      let gain = 0, loss = 0
      for (let j = i - n + 1; j <= i; j++) {
        const diff = closes[j] - closes[j - 1]
        if (diff > 0) gain += diff
        else loss -= diff
      }
      rsi.push(loss === 0 ? 100 : 100 - 100 / (1 + gain / loss))
    }
    return rsi
  }, [])

  // 加载 K 线数据
  const loadKline = useCallback(async () => {
    if (!code) return
    setLoading(true)
    try {
      const json = await apiGet<any>('/kline', { code, period })
      if (json.error) return
      setName(json.name || '')
      const raw = json.klines || []
      // 计算均线
      const closes = raw.map((k: KlineData) => k.close)
      const ma5 = calcMA(closes, 5)
      const ma10 = calcMA(closes, 10)
      const ma20 = calcMA(closes, 20)
      const enriched = raw.map((k: KlineData, i: number) => ({
        ...k,
        ma5: ma5[i],
        ma10: ma10[i],
        ma20: ma20[i],
      }))
      setKlines(enriched)
    } catch (e) {
      console.error('[KlineChart] load error:', e)
    } finally {
      setLoading(false)
    }
  }, [code, period, calcMA])

  useEffect(() => { loadKline() }, [loadKline])

  // 初始化 / 更新图表
  useEffect(() => {
    if (!chartContainerRef.current || klines.length === 0) return

    // 清理旧图表
    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
    }

    const container = chartContainerRef.current
    const colors = getComputedStyle(document.documentElement)
    const bgColor = colors.getPropertyValue('--fund-bg').trim() || '#0a0c10'
    const gridColor = colors.getPropertyValue('--fund-grid').trim() || '#1f2124'
    const fgColor = colors.getPropertyValue('--fund-fg').trim() || '#b8bfc6'
    const upColor = colors.getPropertyValue('--fund-up').trim() || '#ff4d4f'
    const downColor = colors.getPropertyValue('--fund-down').trim() || '#23c343'

    // 主图占比 65%，副图占比 35%
    const hasSub = subIndicators.length > 0
    const mainHeight = hasSub ? 65 : 100
    const subHeight = hasSub ? 35 : 0

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: bgColor },
        textColor: fgColor,
        fontSize: 10,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: fgColor + '40', width: 1, style: 2 },
        horzLine: { color: fgColor + '40', width: 1, style: 2 },
      },
      rightPriceScale: { borderColor: gridColor },
      timeScale: {
        borderColor: gridColor,
        timeVisible: ['5min', '15min', '30min', '60min'].includes(period),
        rightOffset: 5,
      },
    })
    chartRef.current = chart

    // K 线数据
    const candleData: CandlestickData[] = klines.map((k) => {
      const time = normalizeTime(k.time, period)
      return {
        time,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
      }
    })

    // 主图 K 线系列
    const candleSeries = chart.addCandlestickSeries({
      upColor,
      downColor,
      borderUpColor: upColor,
      borderDownColor: downColor,
      wickUpColor: upColor,
      wickDownColor: downColor,
    })
    candleSeriesRef.current = candleSeries
    candleSeries.setData(candleData)

    // MA 均线
    const maColors: Record<string, string> = { ma5: '#f5a623', ma10: '#4fc3f7', ma20: '#ab47bc' }
    const maRefs: Record<string, React.MutableRefObject<ISeriesApi<'Line'> | null>> = {
      ma5: ma5Ref, ma10: ma10Ref, ma20: ma20Ref,
    }
    for (const [key, color] of Object.entries(maColors)) {
      const lineSeries = chart.addLineSeries({
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
      maRefs[key].current = lineSeries
      const lineData: LineData[] = klines
        .map((k, i) => ({ time: normalizeTime(k.time, period), value: (k as any)[key] as number }))
        .filter((d): d is LineData => d.value !== undefined && !isNaN(d.value))
      lineSeries.setData(lineData)
    }

    // 成本价线
    const cp = costPrice[code]
    if (cp && cp > 0) {
      const costSeries = chart.addLineSeries({
        color: '#ffeb3b',
        lineWidth: 1,
        lineStyle: 2, // dashed
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: false,
      })
      costLineRef.current = costSeries
      costSeries.setData(candleData.map((d) => ({ time: d.time, value: cp })))
    }

    // 涨跌停变色：涨跌停K线使用特殊背景标记
    // lightweight-charts 不直接支持单根K线背景色，通过在图表上叠加标记实现
    if (preClose && preClose > 0) {
      const limitUpPrice = +(preClose * 1.1).toFixed(2)
      const limitDownPrice = +(preClose * 0.9).toFixed(2)
      // 为涨停/跌停的K线添加特殊标记
      const markers: any[] = []
      klines.forEach((k, i) => {
        const time = normalizeTime(k.time, period)
        if (k.close >= limitUpPrice && k.high <= limitUpPrice) {
          // 涨停未开板
          markers.push({ time, position: 'belowBar', color: upColor + '80', shape: 'square', text: '涨' })
        }
        if (k.close <= limitDownPrice && k.low >= limitDownPrice) {
          // 跌停未开板
          markers.push({ time, position: 'aboveBar', color: downColor + '80', shape: 'square', text: '跌' })
        }
      })
      if (markers.length > 0) {
        candleSeries.setMarkers(markers)
      }
    }

    // 成交量（如果选了）
    if (subIndicators.includes('vol')) {
      const volSeries = chart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: 'vol',
      })
      volSeriesRef.current = volSeries
      chart.priceScale('vol').applyOptions({
        scaleMargins: { top: 0.7, bottom: 0 },
      })
      volSeries.setData(
        klines.map((k) => ({
          time: normalizeTime(k.time, period),
          value: k.volume,
          color: k.close >= k.open ? upColor + '80' : downColor + '80',
        }))
      )
    }

    // MACD 副图
    if (subIndicators.includes('macd')) {
      const closes = klines.map((k) => k.close)
      const { dif, dea, macd } = calcMACD(closes)
      const macdSeries = chart.addHistogramSeries({
        priceScaleId: 'macd',
        priceFormat: { type: 'price', precision: 3, minMove: 0.001 },
      })
      chart.priceScale('macd').applyOptions({
        scaleMargins: { top: 0.75, bottom: 0 },
      })
      macdSeries.setData(
        macd.map((v, i) => ({
          time: normalizeTime(klines[i].time, period),
          value: v,
          color: v >= 0 ? upColor + '60' : downColor + '60',
        }))
      )
      // DIF line
      const difSeries = chart.addLineSeries({
        color: '#f5a623',
        lineWidth: 1,
        priceScaleId: 'macd',
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
      difSeries.setData(
        dif.map((v, i) => ({ time: normalizeTime(klines[i].time, period), value: v }))
      )
      // DEA line
      const deaSeries = chart.addLineSeries({
        color: '#4fc3f7',
        lineWidth: 1,
        priceScaleId: 'macd',
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      })
      deaSeries.setData(
        dea.map((v, i) => ({ time: normalizeTime(klines[i].time, period), value: v }))
      )
    }

    // RSI 副图
    if (subIndicators.includes('rsi')) {
      const closes = klines.map((k) => k.close)
      const rsi6 = calcRSI(closes, 6)
      const rsi12 = calcRSI(closes, 12)
      const rsi24 = calcRSI(closes, 24)
      const rsiScaleId = 'rsi'
      chart.priceScale(rsiScaleId).applyOptions({
        scaleMargins: { top: 0.75, bottom: 0 },
        autoScale: false,
      })
      // RSI 6
      const rsi6Series = chart.addLineSeries({
        color: '#f5a623', lineWidth: 1, priceScaleId: rsiScaleId,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      })
      rsi6Series.setData(
        rsi6.map((v, i) => ({ time: normalizeTime(klines[i].time, period), value: v })).filter((d): d is LineData => d.value !== undefined)
      )
      // RSI 12
      const rsi12Series = chart.addLineSeries({
        color: '#4fc3f7', lineWidth: 1, priceScaleId: rsiScaleId,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      })
      rsi12Series.setData(
        rsi12.map((v, i) => ({ time: normalizeTime(klines[i].time, period), value: v })).filter((d): d is LineData => d.value !== undefined)
      )
      // RSI 24
      const rsi24Series = chart.addLineSeries({
        color: '#ab47bc', lineWidth: 1, priceScaleId: rsiScaleId,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      })
      rsi24Series.setData(
        rsi24.map((v, i) => ({ time: normalizeTime(klines[i].time, period), value: v })).filter((d): d is LineData => d.value !== undefined)
      )
    }

    // KDJ 副图
    if (subIndicators.includes('kdj')) {
      const { k, d, j } = calcKDJ(klines)
      const kdjScaleId = 'kdj'
      chart.priceScale(kdjScaleId).applyOptions({
        scaleMargins: { top: 0.75, bottom: 0 },
      })
      const kSeries = chart.addLineSeries({
        color: '#f5a623', lineWidth: 1, priceScaleId: kdjScaleId,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      })
      kSeries.setData(k.map((v, i) => ({ time: normalizeTime(klines[i].time, period), value: v })))
      const dSeries = chart.addLineSeries({
        color: '#4fc3f7', lineWidth: 1, priceScaleId: kdjScaleId,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      })
      dSeries.setData(d.map((v, i) => ({ time: normalizeTime(klines[i].time, period), value: v })))
      const jSeries = chart.addLineSeries({
        color: '#ab47bc', lineWidth: 1, priceScaleId: kdjScaleId,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      })
      jSeries.setData(j.map((v, i) => ({ time: normalizeTime(klines[i].time, period), value: v })))
    }

    chart.timeScale().fitContent()

    // 响应容器大小变化
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        chart.applyOptions({ width, height })
      }
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
    }
  }, [klines, subIndicators, period, preClose, costPrice, calcMACD, calcKDJ, calcRSI])

  const toggleIndicator = (key: string) => {
    setSubIndicators((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="shrink-0 px-2 py-1 border-b border-fund-border flex items-center gap-1 overflow-x-auto">
        {/* 周期选择 */}
        <div className="flex items-center gap-0.5 shrink-0">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-1.5 py-0.5 text-[10px] rounded transition-colors whitespace-nowrap ${
                period === p.key
                  ? 'bg-fund-up text-white'
                  : 'text-fund-fg/50 hover:bg-fund-card hover:text-fund-fg'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="w-px h-4 bg-fund-border mx-1 shrink-0" />
        {/* 副图指标 */}
        <div className="flex items-center gap-0.5">
          {INDICATORS.map((ind) => (
            <button
              key={ind.key}
              onClick={() => toggleIndicator(ind.key)}
              className={`px-1.5 py-0.5 text-[10px] rounded transition-colors whitespace-nowrap ${
                subIndicators.includes(ind.key)
                  ? 'bg-fund-card text-fund-fg border border-fund-border'
                  : 'text-fund-fg/40 hover:text-fund-fg/70'
              }`}
            >
              {ind.label}
            </button>
          ))}
        </div>
        <div className="w-px h-4 bg-fund-border mx-1 shrink-0" />
        {/* 均线图例 */}
        <div className="flex items-center gap-2 text-[10px] shrink-0">
          <span className="flex items-center gap-0.5"><span className="w-3 h-0.5 bg-[#f5a623] inline-block rounded" />MA5</span>
          <span className="flex items-center gap-0.5"><span className="w-3 h-0.5 bg-[#4fc3f7] inline-block rounded" />MA10</span>
          <span className="flex items-center gap-0.5"><span className="w-3 h-0.5 bg-[#ab47bc] inline-block rounded" />MA20</span>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="flex-1 min-h-0 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-fund-bg/60 z-10">
            <span className="text-fund-fg/40 text-xs">加载K线...</span>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  )
}

// 归一化时间格式为 lightweight-charts 的 Time 类型
function normalizeTime(timeStr: string, period: string): Time {
  if (['5min', '15min', '30min', '60min'].includes(period)) {
    // 分钟级别，返回 YYYY-MM-DD HH:MM 格式
    return timeStr as Time
  }
  // 日/周/月级别，返回 YYYY-MM-DD 格式
  const datePart = timeStr.split(' ')[0]
  return datePart as Time
}
