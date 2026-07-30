'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Flame, RefreshCw } from 'lucide-react'
import { api, fmt } from '@/lib/api'
import { useApp } from '@/lib/store'

export default function LimitLeader() {
  const { setSelectedCode, pushHistory } = useApp()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    try { setData(await api('/limit-leader')) } catch {} finally { setLoading(false) }
  }, [])
  const mountedRef = useRef(false)
  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    load(); const id = setInterval(load, 60000); return () => clearInterval(id)
  }, [load])

  const handleRowClick = (code: string) => {
    pushHistory('limit_leader')
    setSelectedCode(code)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-fund-border flex items-center justify-between">
        <h2 className="text-sm font-bold">涨停龙头</h2>
        <button onClick={load} disabled={loading} className="p-1 rounded hover:bg-fund-card">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-fund-fg/40 text-sm">{loading ? '加载中...' : '暂无数据'}</div>
        ) : (
          <div className="divide-y divide-fund-border">
            {data.map((s, i) => (
              <div
                key={`${s.code}-${i}`}
                className="px-3 py-2 hover:bg-fund-card/40 cursor-pointer"
                onClick={() => handleRowClick(s.code)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-fund-fg/70">{s.code}</span>
                    <span className="text-xs font-medium">{s.name}</span>
                    {(s.limitDays > 1 || s.limitUpDays > 1) && (
                      <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-medium ${
                        (s.limitDays >= 3 || s.limitUpDays >= 3)
                          ? 'bg-red-500/15 text-red-400'
                          : 'bg-orange-500/15 text-orange-400'
                      }`}>
                        <Flame size={9} />{s.limitDays || s.limitUpDays}连板
                      </span>
                    )}
                    {(s.limitDays === 1 || (!s.limitDays && !s.limitUpDays)) && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-fund-up/15 text-fund-up text-[10px] font-medium">
                        <Flame size={9} />首板
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {s.sector && <span className="text-[10px] px-1.5 py-0.5 rounded bg-fund-border/30 text-fund-fg/50">{s.sector}</span>}
                    <span className="text-sm font-bold font-mono text-fund-up">{fmt.rate(s.changeRate)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
