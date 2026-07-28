'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { api, fmt } from '@/lib/api'
import { useApp } from '@/lib/store'

interface HotStock {
  code: string
  name: string
  price: number
  changeRate: number
  changeAmount: number
  volume: number
  amount: number
  high: number
  low: number
}

export default function HotStocks() {
  const { setSelectedCode, pushHistory } = useApp()
  const [stocks, setStocks] = useState<HotStock[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<HotStock[]>('/hot-stocks')
      setStocks(data || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id) }, [load])

  const handleStockClick = (code: string) => {
    pushHistory('hot_stocks')
    setSelectedCode(code)
  }

  if (stocks.length === 0 && !loading) {
    return (
      <div className="flex items-center justify-center h-full text-fund-fg/40 text-sm">暂无数据</div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-fund-border flex items-center justify-between">
        <h2 className="text-sm font-bold">东方财富热股</h2>
        <button onClick={load} disabled={loading} className="p-1 rounded hover:bg-fund-card">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stock list */}
      <div className="flex-1 overflow-y-auto">
        {stocks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-fund-fg/40 text-sm">
            {loading ? '加载中...' : '暂无数据'}
          </div>
        ) : (
          <div className="divide-y divide-fund-border">
            {/* Table header */}
            <div className="px-3 py-1.5 flex items-center text-[10px] text-fund-fg/40 bg-fund-card/30">
              <span className="w-6 text-center">#</span>
              <span className="flex-1">名称</span>
              <span className="w-16 text-right">现价</span>
              <span className="w-16 text-right">涨跌幅</span>
              <span className="w-20 text-right">成交额</span>
            </div>
            {stocks.map((s, i) => (
              <div
                key={s.code}
                className="px-3 py-2 flex items-center text-xs hover:bg-fund-card/40 cursor-pointer transition-colors"
                onClick={() => handleStockClick(s.code)}
              >
                <span className={`w-6 text-center ${i < 3 ? 'text-fund-up font-bold' : 'text-fund-fg/40'}`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{s.name}</div>
                  <div className="text-[10px] text-fund-fg/40 font-mono">{s.code}</div>
                </div>
                <span className="w-16 text-right font-mono text-fund-fg/80">{s.price.toFixed(2)}</span>
                <span className={`w-16 text-right font-mono font-medium flex items-center justify-end gap-0.5 ${
                  s.changeRate >= 0 ? 'text-fund-up' : 'text-fund-down'
                }`}>
                  {s.changeRate >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {fmt.rate(s.changeRate)}
                </span>
                <span className="w-20 text-right text-[10px] text-fund-fg/40 font-mono">{fmt.amt(s.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
