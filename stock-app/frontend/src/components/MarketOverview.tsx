'use client'

import { useEffect, useState, useCallback } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { api, fmt } from '@/lib/api'
import { useApp } from '@/lib/store'
import type { MarketOverviewData } from '@/lib/types'

export default function MarketOverview() {
  const [data, setData] = useState<MarketOverviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api('/market-overview'))
    } catch {} finally { setLoading(false) }
  }, [])
  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id) }, [load])

  if (!data) {
    return <div className="flex items-center justify-center h-full text-fund-fg/40 text-sm">加载中...</div>
  }

  const {
    indices = [],
    limitUpCount = 0,
    limitDownCount = 0,
    upCount = 0,
    downCount = 0,
  } = data

  // 计算条形图最大范围
  const maxUp = indices.length > 0 ? Math.max(...indices.map(i => i.changeRate)) : 0
  const maxDown = indices.length > 0 ? Math.min(...indices.map(i => i.changeRate)) : 0
  const maxAbs = Math.max(Math.abs(maxUp), Math.abs(maxDown), 0.1)

  return (
    <div className="p-3 space-y-3 overflow-y-auto h-full">
      {/* Indices - 核心指数卡片 */}
      <div className="grid grid-cols-3 gap-2">
        {indices.slice(0, 3).map((idx, i) => (
          <div key={`idx-card-${idx.code || idx.name}-${i}`} className="bg-fund-card rounded-lg p-3">
            <div className="text-[10px] text-fund-fg/50 mb-1">{idx.name}</div>
            <div className={`text-lg font-bold font-mono ${idx.changeRate >= 0 ? 'text-fund-up' : 'text-fund-down'}`}>
              {idx.price.toFixed(2)}
            </div>
            <div className={`text-xs font-mono ${idx.changeRate >= 0 ? 'text-fund-up' : 'text-fund-down'}`}>
              {(idx.changeRate >= 0 ? '+' : '') + idx.changeRate.toFixed(2)}% {idx.changeRate >= 0 ? <TrendingUp size={10} className="inline" /> : <TrendingDown size={10} className="inline" />}
            </div>
            <div className="text-[10px] text-fund-fg/40 mt-1">成交 {fmt.amt(idx.amount)}</div>
          </div>
        ))}
      </div>

      {/* 指数涨跌幅对比条形图 */}
      {indices.length > 0 && (
        <div className="bg-fund-card rounded-lg p-3">
          <div className="text-[10px] text-fund-fg/40 mb-2 flex items-center justify-between">
            <span>指数涨跌幅对比</span>
            <span className="text-fund-fg/30">
              涨 <span className="text-fund-up">{indices.filter(i => i.changeRate > 0).length}</span>
              {' / '}
              跌 <span className="text-fund-down">{indices.filter(i => i.changeRate < 0).length}</span>
            </span>
          </div>
          <div className="space-y-2">
            {indices.map((idx, i) => {
              const isUp = idx.changeRate > 0
              const absRate = Math.abs(idx.changeRate)
              // 使用平方根缩放增强小数值可见性，同时保证最小宽度
              const barWidth = Math.max((absRate / maxAbs) * 100, 3)
              return (
                <div key={`idx-bar-${idx.code || idx.name}-${i}`} className="flex items-center gap-3">
                  <span className="text-[11px] text-fund-fg/60 w-12 shrink-0 truncate">{idx.name}</span>
                  <span className={`text-[11px] font-mono w-20 shrink-0 text-right ${isUp ? 'text-fund-up' : 'text-fund-down'}`}>
                    {idx.price.toFixed(2)}
                  </span>
                  <div className="flex-1 relative h-5 flex items-center">
                    {/* 中心线 */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-fund-border/50" />
                    {/* 涨跌幅条 */}
                    <div
                      className={`absolute h-3 rounded-sm ${isUp ? 'bg-fund-up' : 'bg-fund-down'}`}
                      style={
                        isUp
                          ? { left: '50%', width: `${Math.min(barWidth, 50)}%`, opacity: 0.75 }
                          : { right: '50%', width: `${Math.min(barWidth, 50)}%`, opacity: 0.75 }
                      }
                    />
                  </div>
                  <span className={`text-[11px] font-mono w-14 shrink-0 text-right ${isUp ? 'text-fund-up' : 'text-fund-down'}`}>
                    {isUp ? '+' : ''}{idx.changeRate.toFixed(2)}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Stats - 涨跌家数 */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: '上涨', value: upCount, color: 'text-fund-up' },
          { label: '下跌', value: downCount, color: 'text-fund-down' },
          { label: '涨停', value: limitUpCount, color: 'text-red-400' },
          { label: '跌停', value: limitDownCount, color: 'text-green-400' },
          { label: '平盘', value: data.flatCount || 0, color: 'text-fund-fg/60' },
        ].map((s) => (
          <div key={s.label} className="bg-fund-card rounded-lg p-2 text-center">
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-fund-fg/50">{s.label}</div>
          </div>
        ))}
      </div>

      {loading && <div className="text-[10px] text-fund-fg/30 text-center">刷新中...</div>}
    </div>
  )
}
