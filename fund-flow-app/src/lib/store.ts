import { create } from 'zustand'
import type { TabId } from './types'

interface AppState {
  // ===== 现有 state =====
  tab: TabId
  setTab: (t: TabId) => void

  selectedCode: string
  setSelectedCode: (c: string) => void

  watchlist: string[]
  addWatchlist: (code: string) => void
  removeWatchlist: (code: string) => void

  voiceEnabled: boolean
  toggleVoice: () => void

  costPrice: Record<string, number>
  setCostPrice: (code: string, price: number) => void

  // ===== 新增 state =====
  /** 板块/龙虎等子 tab 状态 */
  activeSubTab: Record<string, string>
  setActiveSubTab: (key: string, value: string) => void

  /** 导航历史栈，用于返回 */
  historyStack: TabId[]
  pushHistory: (t: TabId) => void
  popHistory: () => TabId | undefined
  clearHistory: () => void

  /** 搜索关键词 */
  searchKeyword: string
  setSearchKeyword: (k: string) => void

  /** 弹幕数据 */
  bulletComments: any[]
  setBulletComments: (list: any[]) => void
  addBulletComment: (item: any) => void
}

export const useApp = create<AppState>((set, get) => ({
  // ===== 现有实现 =====
  tab: 'market_overview',
  setTab: (tab) => set({ tab }),

  selectedCode: '',
  setSelectedCode: (code) => set({ selectedCode: code, tab: 'stock_detail' }),

  watchlist: [],
  addWatchlist: (code) =>
    set((s) => ({
      watchlist: s.watchlist.includes(code) ? s.watchlist : [...s.watchlist, code],
    })),
  removeWatchlist: (code) =>
    set((s) => ({ watchlist: s.watchlist.filter((c) => c !== code) })),

  voiceEnabled: true,
  toggleVoice: () => set((s) => ({ voiceEnabled: !s.voiceEnabled })),

  costPrice: {},
  setCostPrice: (code, price) =>
    set((s) => ({ costPrice: { ...s.costPrice, [code]: price } })),

  // ===== 新增实现 =====
  activeSubTab: {},
  setActiveSubTab: (key, value) =>
    set((s) => ({ activeSubTab: { ...s.activeSubTab, [key]: value } })),

  historyStack: [],
  pushHistory: (t) => set((s) => ({ historyStack: [...s.historyStack, t] })),
  popHistory: () => {
    const stack = get().historyStack
    if (stack.length === 0) return undefined
    const last = stack[stack.length - 1]
    set({ historyStack: stack.slice(0, -1) })
    return last
  },
  clearHistory: () => set({ historyStack: [] }),

  searchKeyword: '',
  setSearchKeyword: (k) => set({ searchKeyword: k }),

  bulletComments: [],
  setBulletComments: (list) => set({ bulletComments: list }),
  addBulletComment: (item) =>
    set((s) => ({ bulletComments: [...s.bulletComments, item] })),
}))

// 保留对 TabId 的再导出，兼容现有 `import { type TabId } from '@/lib/store'` 用法
export type { TabId }
