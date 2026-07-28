'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { api, fmt } from '@/lib/api'
import { useApp } from '@/lib/store'

export default function StrongSector() {
  const { setSelectedCode, pushHistory } = useApp()
  const [data, setData] = useState<any[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [constituents, setConstituents] = useState<Record<string, any[]>>({})
  const [constituentsLoading, setConstituentsLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setData(await api('/strong-sector')) } catch {} finally { setLoading(false) }
  }, [])
  useEffect(() => { load(); const id = setInterval(load, 60000); return () => clearInterval(id) }, [load])

  const toggleExpand = async (code: string) => {
    const next = new Set(expanded)
    if (next.has(code)) {
      next.delete(code)
      setExpanded(next)
    } else {
      next.add(code)
      setExpanded(next)
      if (!constituents[code]) {
        setConstituentsLoading(true)
        try {
          const stocks = await api(`/strong-sector/${code}`)
          setConstituents((prev) => ({ ...prev, [code]: stocks }))
        } catch {} finally { setConstituentsLoading(false) }
      }
    }
  }

  const handleStockClick = (code: string) => {
    pushHistory('strong_sector')
    setSelectedCode(code)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-fund-border flex items-center justify-between">
        <h2 className="text-sm font-bold">最强板块 / 今日主线</h2>
        <button onClick={load} disabled={loading} className="p-1 rounded hover:bg-fund-card">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-fund-fg/40 text-sm">{loading ? '加载中...' : '暂无数据'}</div>
        ) : (
          <div className="divide-y divide-fund-border">
            {data.map((s, i) => {
              const isOpen = expanded.has(s.code)
              return (
                <div key={`${s.code}-${i}`}>
                  <div
                    className="px-3 py-2.5 hover:bg-fund-card/40 cursor-pointer"
                    onClick={() => toggleExpand(s.code)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 text-[10px] text-center ${i < 3 ? 'text-fund-up font-bold' : 'text-fund-fg/40'}`}>{i + 1}</span>
                        <span className="text-xs font-medium">{s.name}</span>
                        {s.upCount > 0 && <span className="text-[10px] px-1 py-0.5 rounded bg-red-500/15 text-red-400">{s.upCount}只涨停</span>}
                        <span className="shrink-0 text-fund-fg/30 ml-1">
                          {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </span>
                      </div>
                      <span className={`text-sm font-bold font-mono ${s.changeRate >= 0 ? 'text-fund-up' : 'text-fund-down'}`}>{fmt.rate(s.changeRate)}</span>
                    </div>
                    {s.topStocks?.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {s.topStocks.slice(0, 3).map((t: any, j: number) => (
                          <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-fund-card text-fund-fg/60">
                            {t.name} <span className={t.changeRate >= 0 ? 'text-fund-up' : 'text-fund-down'}>{fmt.rate(t.changeRate)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {isOpen && (
                    <div className="px-3 pb-2 border-t border-fund-border/30 bg-fund-card/20">
                      {constituentsLoading && !constituents[s.code] ? (
                        <div className="text-center py-2 text-[10px] text-fund-fg/30">加载成分股...</div>
                      ) : constituents[s.code]?.length > 0 ? (
                        <div className="divide-y divide-fund-border/20 mt-1">
                          {constituents[s.code].map((st: any, si: number) => (
                            <div
                              key={st.code}
                              className="flex items-center justify-between py-1.5 text-[11px] hover:bg-fund-card/30 cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); handleStockClick(st.code) }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 text-center text-fund-fg/40">{si + 1}</span>
                                <span className="font-mono text-fund-fg/60">{st.code}</span>
                                <span className="text-fund-fg/80">{st.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`font-medium ${st.changeRate >= 0 ? 'text-fund-up' : 'text-fund-down'}`}>{fmt.rate(st.changeRate)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-2 text-[10px] text-fund-fg/30">暂无成分股数据</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
