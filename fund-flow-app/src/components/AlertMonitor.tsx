'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Volume2, VolumeX, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import { useApp } from '@/lib/store'
import type { AlertData } from '@/lib/types'

export default function AlertMonitor() {
  const [data, setData] = useState<AlertData | null>(null)
  const [loading, setLoading] = useState(false)
  const { voiceEnabled, toggleVoice, setSelectedCode, pushHistory } = useApp()
  const prevAlerts = useRef<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api('/alert')
      setData(d)
      // Voice alerts for new items
      if (voiceEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
        const all = [...(d.indexAlerts || []), ...(d.stockAlerts || [])].map((a) => a.text).join(';')
        if (all && all !== prevAlerts.current) {
          const newItems = [...(d.indexAlerts || []), ...(d.stockAlerts || [])].filter((a) => !prevAlerts.current.includes(a.text))
          for (const item of newItems.slice(0, 3)) {
            const u = new SpeechSynthesisUtterance(item.text)
            u.lang = 'zh-CN'
            u.rate = 1.2
            window.speechSynthesis.speak(u)
          }
          prevAlerts.current = all
        }
      }
    } catch {} finally { setLoading(false) }
  }, [voiceEnabled])
  useEffect(() => { load(); const id = setInterval(load, 10000); return () => clearInterval(id) }, [load])

  const handleStockClick = (code?: string) => {
    if (!code) return
    pushHistory('alert')
    setSelectedCode(code)
  }

  // 合并所有异动，按时间排序（倒序）
  const allAlerts = [
    ...(data?.indexAlerts || []).map(a => ({ ...a, category: 'index' as const })),
    ...(data?.stockAlerts || []).map(a => ({ ...a, category: 'stock' as const })),
  ]

  const stockUpCount = (data?.stockAlerts || []).filter(a => a.type === 'up').length
  const stockDownCount = (data?.stockAlerts || []).filter(a => a.type === 'down').length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-fund-border flex items-center justify-between">
        <h2 className="text-sm font-bold">异动监控</h2>
        <div className="flex items-center gap-2">

          <button onClick={load} disabled={loading} className="p-1 rounded hover:bg-fund-card">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={toggleVoice} className={`p-1 rounded hover:bg-fund-card ${voiceEnabled ? 'text-fund-up' : 'text-fund-fg/30'}`} title={voiceEnabled ? '关闭语音' : '开启语音'}>
            {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!data ? (
          <div className="flex items-center justify-center h-full text-fund-fg/40 text-sm">{loading ? '加载中...' : '暂无数据'}</div>
        ) : (
          <div className="p-3 space-y-1">
            {/* ===== 异动事件流（合并大盘+个股，按类型分组展示） ===== */}
            {allAlerts.length === 0 ? (
              <div className="text-center text-fund-fg/30 text-sm py-8">暂无异动</div>
            ) : (
              <>
                {/* 大盘异动 */}
                {(data.indexAlerts || []).length > 0 && (
                  <div className="mb-3">
                    <div className="text-[10px] text-fund-fg/40 mb-1.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      大盘异动
                    </div>
                    <div className="space-y-1">
                      {data.indexAlerts.map((a, i) => (
                        <div key={`idx-${i}`} className={`text-xs p-2 rounded flex items-center gap-1.5 ${
                          a.type === 'up' ? 'bg-fund-up/10 text-fund-up' : 'bg-fund-down/10 text-fund-down'
                        }`}>
                          {a.type === 'up' ? <TrendingUp size={11} className="shrink-0" /> : <TrendingDown size={11} className="shrink-0" />}
                          <span className="flex-1">{a.text}</span>
                          <span className="text-[10px] opacity-50 shrink-0">{a.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 个股异动 */}
                {(data.stockAlerts || []).length > 0 && (
                  <div>
                    <div className="text-[10px] text-fund-fg/40 mb-1.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      个股异动
                    </div>
                    <div className="space-y-1">
                      {data.stockAlerts.map((a, i) => (
                        <div
                          key={`stk-${i}`}
                          className={`text-xs p-2 rounded flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity ${
                            a.type === 'up' ? 'bg-fund-up/10 text-fund-up' : 'bg-fund-down/10 text-fund-down'
                          }`}
                          onClick={() => handleStockClick(a.code)}
                        >
                          {a.type === 'up' ? <TrendingUp size={11} className="shrink-0" /> : <TrendingDown size={11} className="shrink-0" />}
                          <span className="flex-1">{a.text}</span>
                          <span className="text-[10px] opacity-50 shrink-0">{a.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
