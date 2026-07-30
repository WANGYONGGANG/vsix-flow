'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { ArrowLeft, RefreshCw, Star, Check, X, DollarSign } from 'lucide-react'
import { apiGet, fmt } from '@/lib/api'
import { useApp } from '@/lib/store'
import type { StockQuote } from '@/lib/types'
import KlineChart from '@/components/KlineChart'

export default function StockDetail() {
  const { selectedCode, setTab, popHistory, watchlist, addWatchlist, removeWatchlist, costPrice, setCostPrice } = useApp()
  const [quote, setQuote] = useState<StockQuote | null>(null)
  const [loading, setLoading] = useState(false)
  const [editingCost, setEditingCost] = useState(false)
  const [costInput, setCostInput] = useState('')

  const load = useCallback(async () => {
    if (!selectedCode) return
    setLoading(true)
    try {
      const q = await apiGet<{ data: StockQuote[] }>(`/quote`, { codes: selectedCode })
      const quoteData = q.data?.[0] || null
      setQuote(quoteData)
      if (quoteData) {
        const cp = useApp.getState().costPrice[selectedCode]
        if (cp) setCostInput(cp.toFixed(2))
      }
    } catch {} finally { setLoading(false) }
  }, [selectedCode])

  const intervalRef = useRef<ReturnType<typeof setInterval>>()
  useEffect(() => {
    let cancelled = false
    async function fire() {
      if (!selectedCode) return
      setLoading(true)
      try {
        const q = await apiGet<{ data: StockQuote[] }>('/quote', { codes: selectedCode })
        if (cancelled) return
        const quoteData = q.data?.[0] || null
        setQuote(quoteData)
        if (quoteData) {
          const cp = useApp.getState().costPrice[selectedCode]
          if (cp) setCostInput(cp.toFixed(2))
        }
      } catch {} finally { if (!cancelled) setLoading(false) }
    }
    fire()
    intervalRef.current = setInterval(fire, 30000)
    return () => { cancelled = true; clearInterval(intervalRef.current!) }
  }, [selectedCode])

  const handleBack = () => {
    const prev = popHistory()
    if (prev) setTab(prev)
    else setTab('watchlist')
  }

  const isInWatchlist = selectedCode ? watchlist.includes(selectedCode) : false
  const toggleWatchlist = () => {
    if (!selectedCode) return
    if (isInWatchlist) removeWatchlist(selectedCode)
    else addWatchlist(selectedCode)
  }

  const handleSaveCost = () => {
    const v = parseFloat(costInput)
    if (selectedCode && !isNaN(v) && v > 0) {
      setCostPrice(selectedCode, v)
      setEditingCost(false)
    }
  }

  if (!selectedCode) {
    return (
      <div className="flex items-center justify-center h-full text-fund-fg/40 text-sm">
        请先选择一只股票
      </div>
    )
  }

  const isUp = (quote?.changeRate ?? 0) >= 0
  const pnl = quote && costPrice[selectedCode]
    ? ((quote.price - costPrice[selectedCode]) / costPrice[selectedCode] * 100)
    : null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-3 py-2 border-b border-fund-border flex items-center gap-2">
        <button onClick={handleBack} className="p-1 rounded hover:bg-fund-card">
          <ArrowLeft size={16} className="text-fund-fg/60" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{quote?.name || selectedCode}</span>
            <span className="text-xs font-mono text-fund-fg/50">{selectedCode}</span>
          </div>
        </div>
        <button onClick={toggleWatchlist} className={`p-1 rounded hover:bg-fund-card ${isInWatchlist ? 'text-yellow-400' : 'text-fund-fg/30'}`}>
          <Star size={16} fill={isInWatchlist ? 'currentColor' : 'none'} />
        </button>
        <button onClick={() => { setEditingCost(true); setCostInput(costPrice[selectedCode]?.toFixed(2) || '') }} className="p-1 rounded hover:bg-fund-card text-fund-fg/30">
          <DollarSign size={16} />
        </button>
        <button onClick={load} disabled={loading} className="p-1 rounded hover:bg-fund-card">
          <RefreshCw size={14} className={loading ? 'animate-spin' : 'text-fund-fg/60'} />
        </button>
      </div>

      {/* Price area */}
      {quote && (
        <div className="shrink-0 px-3 py-2.5 bg-fund-card/30 border-b border-fund-border">
          <div className="flex items-end gap-3">
            <span className={`text-2xl font-bold font-mono ${isUp ? 'text-fund-up' : 'text-fund-down'}`}>
              {fmt.price(quote.price)}
            </span>
            <span className={`text-sm font-mono ${isUp ? 'text-fund-up' : 'text-fund-down'}`}>
              {fmt.rate(quote.changeRate)}
            </span>
            <span className={`text-xs font-mono ${isUp ? 'text-fund-up' : 'text-fund-down'}`}>
              {quote.changeAmount >= 0 ? '+' : ''}{fmt.price(quote.changeAmount)}
            </span>
            {pnl !== null && (
              <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${pnl >= 0 ? 'bg-fund-up/10 text-fund-up' : 'bg-fund-down/10 text-fund-down'}`}>
                盈亏 {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
              </span>
            )}
          </div>

          {/* 成本价编辑 */}
          {editingCost && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[10px] text-fund-fg/40">成本价:</span>
              <input
                value={costInput}
                onChange={(e) => setCostInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveCost()}
                className="w-20 bg-fund-bg border border-fund-border rounded px-1.5 py-0.5 text-xs text-fund-fg outline-none focus:border-fund-up"
                autoFocus
              />
              <button onClick={handleSaveCost} className="p-0.5 text-fund-up hover:bg-fund-up/10 rounded"><Check size={12} /></button>
              <button onClick={() => setEditingCost(false)} className="p-0.5 text-fund-fg/40 hover:bg-fund-card rounded"><X size={12} /></button>
            </div>
          )}

          <div className="mt-2 grid grid-cols-5 gap-x-3 gap-y-1 text-[10px]">
            <div><span className="text-fund-fg/40">今开</span><span className="ml-1 font-mono text-fund-fg/70">{fmt.price(quote.open)}</span></div>
            <div><span className="text-fund-fg/40">最高</span><span className="ml-1 font-mono text-fund-up">{fmt.price(quote.high)}</span></div>
            <div><span className="text-fund-fg/40">最低</span><span className="ml-1 font-mono text-fund-down">{fmt.price(quote.low)}</span></div>
            <div><span className="text-fund-fg/40">昨收</span><span className="ml-1 font-mono text-fund-fg/70">{fmt.price(quote.preClose)}</span></div>
            <div><span className="text-fund-fg/40">成交量</span><span className="ml-1 font-mono text-fund-fg/70">{fmt.vol(quote.volume)}</span></div>
            <div><span className="text-fund-fg/40">成交额</span><span className="ml-1 font-mono text-fund-fg/70">{fmt.amt(quote.amount)}</span></div>
            <div><span className="text-fund-fg/40">换手</span><span className="ml-1 font-mono text-fund-fg/70">{(quote.turnoverRate ?? 0).toFixed(2)}%</span></div>
            <div><span className="text-fund-fg/40">振幅</span><span className="ml-1 font-mono text-fund-fg/70">{(quote.amplitude ?? 0).toFixed(2)}%</span></div>
            <div><span className="text-fund-fg/40">市盈</span><span className="ml-1 font-mono text-fund-fg/70">{quote.pe > 0 ? quote.pe.toFixed(1) : '--'}</span></div>
            <div><span className="text-fund-fg/40">市值</span><span className="ml-1 font-mono text-fund-fg/70">{fmt.amt(quote.marketCap)}</span></div>
          </div>
        </div>
      )}

      {/* K线图 */}
      <div className="flex-1 min-h-0">
        <KlineChart code={selectedCode} preClose={quote?.preClose} />
      </div>
    </div>
  )
}
