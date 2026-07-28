'use client'

import {
  BarChart3, Zap, Layers, Sword, Flame, Trophy, Activity,
  AlertTriangle, Crown, Star, Thermometer,
} from 'lucide-react'
import { useApp, type TabId } from '@/lib/store'
import MarketOverview from '@/components/MarketOverview'
import DragonTiger from '@/components/DragonTiger'
import YesterdayLimitUp from '@/components/YesterdayLimitUp'
import LimitLeader from '@/components/LimitLeader'
import StrongSector from '@/components/StrongSector'
import AlertMonitor from '@/components/AlertMonitor'
import Watchlist from '@/components/Watchlist'
import SectorLimitTab from '@/components/SectorLimitTab'
import FundFlowTab from '@/components/FundFlowTab'
import NewsTab from '@/components/NewsTab'
import HotStocks from '@/components/HotStocks'
import StockDetail from '@/components/StockDetail'

// ==================== TABS CONFIG ====================
const TABS: { id: TabId; icon: any; label: string }[] = [
  { id: 'market_overview', icon: Activity, label: '概况' },
  { id: 'fundFlow', icon: BarChart3, label: '资金' },
  { id: 'em_news', icon: Zap, label: '新闻' },
  { id: 'sector_limit', icon: Layers, label: '板块' },
  { id: 'limit_leader', icon: Trophy, label: '龙头' },
  { id: 'strong_sector', icon: Crown, label: '强板' },
  { id: 'dragon_tiger', icon: Sword, label: '龙虎' },
  { id: 'yesterday_limit', icon: Flame, label: '涨停' },
  { id: 'alert', icon: AlertTriangle, label: '异动' },
  { id: 'hot_stocks', icon: Thermometer, label: '热股' },
  { id: 'watchlist', icon: Star, label: '自选' },
]

// ==================== TAB COMPONENTS MAP ====================
const TAB_COMPONENTS: Record<TabId, any> = {
  market_overview: MarketOverview,
  fundFlow: FundFlowTab,
  em_news: NewsTab,
  sector_limit: SectorLimitTab,
  limit_leader: LimitLeader,
  strong_sector: StrongSector,
  dragon_tiger: DragonTiger,
  yesterday_limit: YesterdayLimitUp,
  alert: AlertMonitor,
  hot_stocks: HotStocks,
  watchlist: Watchlist,
  stock_detail: StockDetail,
}

// ==================== MAIN PAGE ====================
export default function Home() {
  const { tab, setTab } = useApp()
  const TabComp = TAB_COMPONENTS[tab] || MarketOverview
  return (
    <div className="flex flex-col h-screen bg-fund-bg text-fund-fg">
      {/* Tab Bar */}
      <div className="shrink-0 border-b border-fund-border bg-fund-card/50 px-2 py-1.5 flex items-center gap-0.5 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} title={t.label}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md whitespace-nowrap transition-colors ${
              tab === t.id ? 'bg-fund-up text-white shadow-sm' : 'text-fund-fg/50 hover:bg-fund-card hover:text-fund-fg'
            }`}>
            <t.icon size={12} /><span>{t.label}</span>
          </button>
        ))}
      </div>
      {/* Content */}
      <div className="flex-1 min-h-0">
        <TabComp />
      </div>
    </div>
  )
}
