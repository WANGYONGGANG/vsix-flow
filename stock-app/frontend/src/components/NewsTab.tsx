'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Zap, RefreshCw } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { useApp } from '@/lib/store'
import type { NewsItem } from '@/lib/types'

export default function NewsTab() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(false)
  const [lastId, setLastId] = useState<string | number | null>(null)
  const [newCount, setNewCount] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const prevLenRef = useRef(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ news: NewsItem[] }>('/em-news')
      const list = res.news || []
      setNews(list)
      if (list.length > 0) {
        setLastId(list[0].id)
        if (prevLenRef.current > 0 && list.length > prevLenRef.current) {
          setNewCount((c) => c + (list.length - prevLenRef.current))
        }
        prevLenRef.current = list.length
      }
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id) }, [load])

  // Auto-scroll to bottom on new data
  useEffect(() => {
    if (listRef.current && news.length > 0) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [news.length])

  const scrollToTop = () => {
    setNewCount(0)
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-fund-border">
        <h2 className="text-sm font-semibold flex items-center gap-1">
          <Zap size={14} className="text-fund-up" />
          7x24 快讯
        </h2>
        <div className="flex items-center gap-2">
          {newCount > 0 && (
            <button onClick={scrollToTop} className="text-[10px] px-1.5 py-0.5 rounded bg-fund-up/15 text-fund-up">
              {newCount}条新消息
            </button>
          )}
          <button onClick={load} disabled={loading} className="p-1 rounded hover:bg-fund-card">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {news.length === 0 ? (
          <div className="flex items-center justify-center h-full text-fund-fg/40 text-sm">
            {loading ? '加载中...' : '暂无数据'}
          </div>
        ) : (
          <div className="divide-y divide-fund-border/50">
            {news.map((item, i) => {
              const isNew = i < newCount
              const stableKey = `news-${i}-${item.id || item.time?.replace(/[^0-9]/g, '') || i}`
              const content = (item.content || item.title || '').trim()
              return (
                <div
                  key={stableKey}
                  className={`px-3 py-2.5 text-xs transition-colors ${
                    isNew ? 'bg-fund-up/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-fund-fg/40 shrink-0">{item.time}</span>
                    {item.source && (
                      <span className="text-[10px] px-1 py-0.5 rounded bg-fund-card text-fund-fg/50 shrink-0">{item.source}</span>
                    )}
                  </div>
                  {item.title && item.content && item.title !== item.content ? (
                    <div className="mb-0.5 font-medium text-fund-fg leading-snug">{item.title}</div>
                  ) : null}
                  <div className="text-fund-fg/80 leading-relaxed">{content}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
