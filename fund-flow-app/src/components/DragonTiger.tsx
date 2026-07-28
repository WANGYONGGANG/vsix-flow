'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { api, fmt } from '@/lib/api'
import { useApp } from '@/lib/store'
import type { DragonTigerEntry } from '@/lib/types'

export default function DragonTiger() {
  const [entries, setEntries] = useState<DragonTigerEntry[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api('/dragon-tiger')
      setEntries(d)
      setLastUpdate(new Date().toLocaleTimeString())
    } catch {} finally { setLoading(false) }
  }, [])
  useEffect(() => { load(); const id = setInterval(load, 120000); return () => clearInterval(id) }, [load])

  const typeStyle: Record<string, { bg: string; text: string }> = {
    '机构': { bg: 'bg-purple-500/20', text: 'text-purple-400' },
    '游资': { bg: 'bg-orange-500/20', text: 'text-orange-400' },
    '量化': { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    '敢死队': { bg: 'bg-red-500/20', text: 'text-red-400' },
    '其他': { bg: 'bg-gray-500/20', text: 'text-gray-400' },
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-fund-border">
        <h2 className="text-sm font-semibold">昨日龙虎榜</h2>
        <div className="flex items-center gap-2">
          {lastUpdate && <span className="text-[10px] text-fund-fg/40">{lastUpdate}</span>}
          <button onClick={load} disabled={loading} className="p-1 rounded hover:bg-fund-card"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-fund-fg/40 text-sm">{loading ? '加载中...' : '暂无数据'}</div>
        ) : (
          <div className="divide-y divide-fund-border">
            {entries.map((e, i) => {
              const open = expanded.has(e.code)
              return (
                <div key={`${e.code}-${i}`}>
                  <button
                    onClick={() => setExpanded((p) => { const n = new Set(p); open ? n.delete(e.code) : n.add(e.code); return n })}
                    className="w-full text-left px-3 py-2 hover:bg-fund-card/40"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-[10px] text-fund-fg/40 text-center shrink-0">{i + 1}</span>
                      <div className="min-w-0 shrink-0 w-[72px]">
                        <div className="text-xs font-medium truncate">{e.name}</div>
                        <div className="text-[10px] text-fund-fg/40">{e.code}</div>
                      </div>
                      <div className="shrink-0 w-[70px] text-right">
                        <div className="text-xs">{fmt.price(e.closePrice)}</div>
                        <div className={`text-[10px] ${e.changeRate >= 0 ? 'text-fund-up' : 'text-fund-down'}`}>{fmt.rate(e.changeRate)}</div>
                      </div>
                      <div className={`shrink-0 w-[72px] text-right text-xs font-medium ${e.netBuyAmt >= 0 ? 'text-fund-up' : 'text-fund-down'}`}>
                        {e.netBuyAmt >= 0 ? '+' : ''}{e.netBuyAmt.toFixed(0)}万
                      </div>
                      <div className="shrink-0 flex items-center gap-1 ml-auto">
                        {e.buyTimes > 0 && <span className="text-[10px] text-fund-up bg-fund-up/10 px-1 py-0.5 rounded">买{e.buyTimes}</span>}
                        {e.sellTimes > 0 && <span className="text-[10px] text-fund-down bg-fund-down/10 px-1 py-0.5 rounded">卖{e.sellTimes}</span>}
                      </div>
                      <span className="shrink-0 text-fund-fg/30 ml-1">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                    </div>
                    {e.reason && (
                      <div className="mt-1 flex gap-1 flex-wrap">
                        {e.reason.split(/[,;，；]/).filter(Boolean).map((r, j) => (
                          <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-fund-card text-fund-fg/50 border border-fund-border/50">{r.trim()}</span>
                        ))}
                      </div>
                    )}
                  </button>
                  {open && (
                    <div className="px-3 pb-3 border-t border-fund-border/50 bg-fund-card/20">
                      <div className="text-[11px] font-medium text-fund-fg/60 py-2">席位明细</div>
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="text-fund-fg/40 border-b border-fund-border/50">
                            <th className="text-left py-1.5 pr-2 font-normal">席位</th>
                            <th className="text-center py-1.5 px-1 font-normal w-20">标签</th>
                            <th className="text-right py-1.5 px-1 font-normal w-16">买入</th>
                            <th className="text-right py-1.5 px-1 font-normal w-16">卖出</th>
                            <th className="text-right py-1.5 pl-1 font-normal w-16">净额</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-fund-border/30">
                          {(e.seats || []).length === 0 ? (
                            <tr><td colSpan={5} className="py-3 text-center text-fund-fg/30">无席位数据</td></tr>
                          ) : (
                            e.seats.map((s, si) => {
                              const ts = typeStyle[s.type] || typeStyle['其他']
                              return (
                                <tr key={si} className="hover:bg-fund-card/30">
                                  <td className="py-1.5 pr-2 text-fund-fg/80 truncate max-w-[140px]" title={s.seatName}>{s.seatName}</td>
                                  <td className="py-1.5 px-1">
                                    <div className="flex items-center gap-1">
                                      <span className={`text-[10px] px-1 py-0.5 rounded ${ts.bg} ${ts.text}`}>{s.type}</span>
                                      {s.tag && s.tag !== s.type && s.tag !== '其他' && (
                                        <span className="text-[10px] px-1 py-0.5 rounded bg-fund-card text-fund-fg/50 border border-fund-border/50">{s.tag}</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-1.5 px-1 text-right text-fund-up">{s.buyAmt > 0 ? s.buyAmt.toFixed(0) + '万' : '-'}</td>
                                  <td className="py-1.5 px-1 text-right text-fund-down">{s.sellAmt > 0 ? s.sellAmt.toFixed(0) + '万' : '-'}</td>
                                  <td className={`py-1.5 pl-1 text-right font-medium ${s.netAmt >= 0 ? 'text-fund-up' : 'text-fund-down'}`}>{s.netAmt >= 0 ? '+' : ''}{s.netAmt.toFixed(0)}万</td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
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
