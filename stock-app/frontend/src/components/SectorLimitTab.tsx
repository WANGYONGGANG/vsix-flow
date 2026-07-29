'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { RefreshCw, TrendingUp, TrendingDown, Layers, Factory } from 'lucide-react'
import { api, fmt } from '@/lib/api'
import { useApp } from '@/lib/store'

type TabKey = 'all' | 'concept' | 'industry'
type SortKey = 'upCount' | 'changeRate' | 'changeAmount'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'concept', label: '概念板块' },
  { key: 'industry', label: '行业板块' },
]

const sortOptions: { key: SortKey; label: string }[] = [
  { key: 'upCount', label: '按涨停数' },
  { key: 'changeRate', label: '按涨跌幅' },
  { key: 'changeAmount', label: '按涨跌额' },
]

interface SectorItem {
  code: string
  name: string
  price: number
  changeRate: number
  changeAmount: number
  upCount: number
  downCount: number
  volume: number
  amount: number
  type: string
}

export default function SectorLimitTab() {
  const { activeSubTab, setActiveSubTab } = useApp()
  const [sectors, setSectors] = useState<SectorItem[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState('')

  const activeTab = (activeSubTab['sector_limit_tab'] || 'all') as TabKey
  const sortBy = (activeSubTab['sector_limit_sort'] || 'upCount') as SortKey

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api('/sector-limit')
      setSectors(d)
      setLastUpdate(new Date().toLocaleTimeString())
    } catch {} finally { setLoading(false) }
  }, [])
  useEffect(() => { load(); const id = setInterval(load, 60000); return () => clearInterval(id) }, [load])

  const filtered = useMemo(() => {
    let list = activeTab === 'all' ? sectors : sectors.filter((s) => s.type === activeTab)
    return [...list].sort((a, b) => {
      if (sortBy === 'upCount') return b.upCount - a.upCount
      if (sortBy === 'changeRate') return b.changeRate - a.changeRate
      return b.changeAmount - a.changeAmount
    })
  }, [activeTab, sortBy, sectors])

  return (
    <div className="flex flex-col h-full">
      {/* Tabs + Refresh */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-fund-border">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab('sector_limit_tab', tab.key)}
              className={`px-2 py-1 text-[11px] rounded transition-colors ${
                activeTab === tab.key
                  ? 'bg-fund-up text-white'
                  : 'text-fund-fg/60 hover:bg-fund-card'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && <span className="text-[10px] text-fund-fg/40">{lastUpdate}</span>}
          <button onClick={load} disabled={loading} className="p-1 rounded hover:bg-fund-card">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Sort options */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-fund-border bg-fund-bg/50">
        {sortOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setActiveSubTab('sector_limit_sort', opt.key)}
            className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
              sortBy === opt.key
                ? 'bg-fund-card text-fund-fg'
                : 'text-fund-fg/50 hover:text-fund-fg/80 hover:bg-fund-card/50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[32px_1fr_70px_50px_50px_60px] gap-1 px-3 py-1.5 text-[10px] text-fund-fg/40 border-b border-fund-border bg-fund-bg/30">
        <span>排名</span>
        <span>板块名称</span>
        <span className="text-right">涨跌幅</span>
        <span className="text-right">上涨</span>
        <span className="text-right">下跌</span>
        <span className="text-right">成交量</span>
      </div>

      {/* Data rows */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-fund-fg/40 text-sm">{loading ? '加载中...' : '暂无数据'}</div>
        ) : (
          <div className="divide-y divide-fund-border">
            {filtered.map((s, index) => (
              <div key={`sl-${s.code || s.name}-${s.type || 'x'}-${index}`} className="grid grid-cols-[32px_1fr_70px_50px_50px_60px] gap-1 px-3 py-2 hover:bg-fund-card/50 items-center">
                <span className={`text-xs font-medium ${index < 3 ? 'text-fund-up' : 'text-fund-fg/40'}`}>{index + 1}</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs text-fund-fg/80 truncate">{s.name}</span>
                  {s.type === 'concept' ? (
                    <Layers size={10} className="text-fund-fg/30 shrink-0" />
                  ) : (
                    <Factory size={10} className="text-fund-fg/30 shrink-0" />
                  )}
                </div>
                <span className={`text-xs text-right font-medium ${s.changeRate > 0 ? 'text-fund-up' : s.changeRate < 0 ? 'text-fund-down' : 'text-fund-fg/60'}`}>
                  {s.changeRate > 0 && <TrendingUp size={10} className="inline mr-0.5" />}
                  {s.changeRate < 0 && <TrendingDown size={10} className="inline mr-0.5" />}
                  {fmt.rate(s.changeRate)}
                </span>
                <span className="text-xs text-right text-fund-up font-medium">{s.upCount}</span>
                <span className="text-xs text-right text-fund-down font-medium">{s.downCount}</span>
                <span className="text-xs text-right text-fund-fg/50">{fmt.vol(s.volume)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
