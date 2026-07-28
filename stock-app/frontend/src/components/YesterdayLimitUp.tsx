'use client'

import { useEffect, useState, useCallback } from 'react'
import { Flame } from 'lucide-react'
import { api, fmt } from '@/lib/api'
import { useApp } from '@/lib/store'

export default function YesterdayLimitUp() {
  const { setSelectedCode, pushHistory } = useApp()
  const [stocks, setStocks] = useState<any[]>([])
  const [filterBy, setFilterBy] = useState<'all' | 'continuous' | 'broken'>('all')
  const [loading, setLoading] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    try { setStocks(await api('/limit-up-today')) } catch {} finally { setLoading(false) }
  }, [])
  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id) }, [load])

  const list = filterBy === 'all'
    ? stocks
    : filterBy === 'continuous'
      ? stocks.filter((s) => s.continuousLimitUp || (s.limitUpDays ?? 0) >= 2)
      : stocks.filter((s) => s.brokenBoard)

  const handleRowClick = (code: string) => {
    pushHistory('yesterday_limit')
    setSelectedCode(code)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-fund-border flex items-center justify-between">
        <h2 className="text-sm font-bold">昨日涨停今日表现</h2>
        <div className="flex gap-1">
          {([{ k: 'all', l: '全部' }, { k: 'continuous', l: '连板中' }, { k: 'broken', l: '已断板' }] as const).map((o) => (
            <button key={o.k} onClick={() => setFilterBy(o.k)}
              className={`px-2 py-0.5 text-[11px] rounded ${filterBy === o.k ? 'bg-fund-up text-white' : 'bg-fund-card text-fund-fg/60'}`}>{o.l}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {list.length === 0 ? (
          <div className="flex items-center justify-center h-full text-fund-fg/40 text-sm">{loading ? '加载中...' : '暂无数据'}</div>
        ) : (
          <div className="divide-y divide-fund-border">
            {list.map((s, i) => {
              const isUp = s.todayChangeRate >= 0
              const isLimitUp = s.todayChangeRate > 9.5
              return (
                <div
                  key={`${s.code}-${i}`}
                  className="px-3 py-2.5 hover:bg-fund-card/40 cursor-pointer"
                  onClick={() => handleRowClick(s.code)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-fund-fg/70">{s.code}</span>
                      <span className="text-xs font-medium">{s.name}</span>
                      {/* 连板标记 */}
                      {isLimitUp && s.limitUpDays > 1 && (
                        <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-medium ${
                          s.limitUpDays >= 3
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-orange-500/15 text-orange-400'
                        }`}>
                          <Flame size={9} />{s.limitUpDays}连板
                        </span>
                      )}
                      {isLimitUp && s.limitUpDays <= 1 && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-fund-up/15 text-fund-up text-[10px] font-medium">
                          <Flame size={9} />涨停
                        </span>
                      )}
                      {!isLimitUp && s.limitUpDays > 1 && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-fund-fg/10 text-fund-fg/40 text-[10px]">
                          昨{s.limitUpDays}板
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5"><span className="text-[10px] text-fund-fg/40">昨收</span><span className="text-xs text-fund-fg/80">{fmt.price(s.yesterdayClose)}</span></div>
                    <div className="flex flex-col gap-0.5"><span className="text-[10px] text-fund-fg/40">现价</span><span className={`text-sm font-bold font-mono ${isUp ? 'text-fund-up' : 'text-fund-down'}`}>{fmt.price(s.todayPrice)}</span></div>
                    <div className="flex flex-col gap-0.5"><span className="text-[10px] text-fund-fg/40">涨跌</span><span className={`text-xs font-medium font-mono ${isUp ? 'text-fund-up' : 'text-fund-down'}`}>{fmt.rate(s.todayChangeRate)}</span></div>
                    <div className="flex flex-col gap-0.5"><span className="text-[10px] text-fund-fg/40">高/低</span><span className="text-[10px] font-mono"><span className="text-fund-up">{fmt.price(s.todayHigh)}</span>/<span className="text-fund-down">{fmt.price(s.todayLow)}</span></span></div>
                    <div className="flex flex-col gap-0.5 text-right"><span className="text-[10px] text-fund-fg/40">成交额</span><span className="text-xs text-fund-fg/70 font-mono">{fmt.amt(s.amount)}</span></div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
