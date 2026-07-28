'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, X, Search } from 'lucide-react'
import { api, fmt } from '@/lib/api'
import { useApp } from '@/lib/store'

const STORAGE_KEY = 'fund-flow-watchlist'

function loadPersistedWatchlist(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persistWatchlist(codes: string[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(codes))
  } catch {}
}

export default function Watchlist() {
  const { watchlist, addWatchlist, removeWatchlist, setSelectedCode, pushHistory } = useApp()
  const [input, setInput] = useState('')
  const [searchText, setSearchText] = useState('')
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Initialize watchlist from localStorage on mount
  useEffect(() => {
    const persisted = loadPersistedWatchlist()
    if (persisted.length > 0 && watchlist.length === 0) {
      persisted.forEach((code) => addWatchlist(code))
    }
    setInitialized(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist watchlist to localStorage whenever it changes
  useEffect(() => {
    if (initialized) {
      persistWatchlist(watchlist)
    }
  }, [watchlist, initialized])

  const loadQuotes = useCallback(async () => {
    if (!watchlist.length) { setQuotes([]); return }
    setLoading(true)
    try {
      const d = await api(`/quote?codes=${watchlist.join(',')}`)
      setQuotes(d.data || [])
    } catch {} finally { setLoading(false) }
  }, [watchlist])
  useEffect(() => { loadQuotes(); const id = setInterval(loadQuotes, 10000); return () => clearInterval(id) }, [loadQuotes])

  const handleAdd = () => {
    const code = input.trim()
    if (code && /^\d{6}$/.test(code)) { addWatchlist(code); setInput('') }
  }

  const handleRowClick = (code: string) => {
    pushHistory('watchlist')
    setSelectedCode(code)
  }

  // Filter quotes by search text
  const filteredQuotes = searchText.trim()
    ? quotes.filter(
        (q) =>
          q.code.includes(searchText.trim()) ||
          q.name.includes(searchText.trim())
      )
    : quotes

  return (
    <div className="flex flex-col h-full">
      {/* Add stock input */}
      <div className="px-3 py-2 border-b border-fund-border flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="输入6位股票代码"
          className="flex-1 bg-fund-card border border-fund-border rounded px-2 py-1 text-xs text-fund-fg outline-none focus:border-fund-up"
        />
        <button onClick={handleAdd} className="p-1 rounded bg-fund-up text-white hover:bg-fund-up/80"><Plus size={14} /></button>
      </div>
      {/* Search filter */}
      <div className="px-3 py-1.5 border-b border-fund-border/50 flex items-center gap-2">
        <Search size={12} className="text-fund-fg/30 shrink-0" />
        <input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="按代码或名称搜索..."
          className="flex-1 bg-transparent border-none text-xs text-fund-fg outline-none placeholder:text-fund-fg/30"
        />
        {searchText && (
          <button onClick={() => setSearchText('')} className="text-fund-fg/30 hover:text-fund-fg/60">
            <X size={12} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredQuotes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-fund-fg/40 text-sm">
            {watchlist.length === 0 ? '暂无自选股，请添加' : loading ? '加载中...' : '暂无数据'}
          </div>
        ) : (
          <div className="divide-y divide-fund-border">
            {filteredQuotes.map((q, i) => (
              <div
                key={`${q.code}-${i}`}
                className="px-3 py-2 hover:bg-fund-card/40 flex items-center justify-between cursor-pointer"
                onClick={() => handleRowClick(q.code)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-fund-fg/70">{q.code}</span>
                  <span className="text-xs font-medium">{q.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold font-mono ${q.changeRate >= 0 ? 'text-fund-up' : 'text-fund-down'}`}>{fmt.price(q.price)}</span>
                  <span className={`text-xs font-mono ${q.changeRate >= 0 ? 'text-fund-up' : 'text-fund-down'}`}>{fmt.rate(q.changeRate)}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeWatchlist(q.code) }}
                    className="p-0.5 text-fund-fg/30 hover:text-fund-down"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
