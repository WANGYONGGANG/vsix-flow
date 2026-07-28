// ==================== 类型定义 ====================
// 所有应用类型接口集中定义

/**
 * 股票行情
 */
export interface StockQuote {
  code: string
  name: string
  price: number
  changeRate: number
  changeAmount: number
  volume: number
  amount: number
  high: number
  low: number
  open: number
  preClose: number
  turnoverRate: number
  pe: number
  pb: number
  marketCap: number
  totalShares: number
  amplitude: number
}

/**
 * 板块信息
 */
export interface SectorInfo {
  code: string
  name: string
  changeRate: number
  changeAmount: number
  price: number
  volume: number
  amount: number
  upCount: number
  downCount: number
  type: 'concept' | 'industry'
  netInflow: number
  mainNetInflow: number
  turnoverRate: number
  leadingStocks: StockQuote[]
}

/**
 * 涨停股票
 */
export interface LimitUpStock {
  code: string
  name: string
  price: number
  changeRate: number
  amount: number
  volume: number
  limitUpDays: number
  limitUpTime: string
  limitUpType: string
  sector: string
  firstLimitUp: string
  continuousLimitUp: boolean
  brokenBoard: boolean
  turnoverRate: number
  pe: number
  pb: number
  marketCap: number
  amplitude: number
  reason: string
}

/**
 * 龙虎榜席位
 */
export interface DragonTigerSeat {
  seatName: string
  type: string
  tag: string
  buyAmt: number
  sellAmt: number
  netAmt: number
}

/**
 * 龙虎榜条目
 */
export interface DragonTigerEntry {
  code: string
  name: string
  closePrice: number
  changeRate: number
  netBuyAmt: number
  buyTimes: number
  sellTimes: number
  reason: string
  tradeDate: string
  seats: DragonTigerSeat[]
}

/**
 * 涨停详情统计
 */
export interface LimitUpDetails {
  firstBoard: number
  continuous2: number
  continuous3Plus: number
  broken: number
}

/**
 * 北向资金流向
 */
export interface NorthFlow {
  sh: number
  sz: number
  total: number
}

/**
 * 市场概况数据
 */
export interface MarketOverviewData {
  indices: StockQuote[]
  limitUpCount: number
  limitDownCount: number
  upCount: number
  downCount: number
  flatCount: number
  totalCount: number
  northFlow: NorthFlow
  limitUpDetails: LimitUpDetails
}

/**
 * 异动条目
 */
export interface AlertItem {
  type: 'up' | 'down'
  text: string
  time: string
  code?: string
}

/**
 * 大盘指数行情（异动用）
 */
export interface IndexQuote {
  code: string
  name: string
  price: number
  change: number
  changeRate: number
  volume: number
  amount: number
}

/**
 * 异动数据
 */
export interface AlertData {
  indexQuotes?: IndexQuote[]
  indexAlerts: AlertItem[]
  stockAlerts: AlertItem[]
}

/**
 * 新闻条目
 */
export interface NewsItem {
  id: string | number
  title: string
  content: string
  time: string
  source: string
}

/**
 * K线数据
 */
export interface KlineData {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  amount: number
  turnover: number
  ma5?: number
  ma10?: number
  ma20?: number
  ma60?: number
}

/**
 * 盘中分时点位（各板块涨跌幅）
 */
export interface IntradayPoint {
  time: string
  sectors: Record<string, number>
}

/**
 * 板块元数据
 */
export interface SectorMeta {
  id: string
  name: string
  color: string
}

/**
 * Tab 标识
 */
export type TabId =
  | 'fundFlow'
  | 'em_news'
  | 'sector_limit'
  | 'dragon_tiger'
  | 'yesterday_limit'
  | 'limit_leader'
  | 'market_overview'
  | 'alert'
  | 'strong_sector'
  | 'hot_stocks'
  | 'watchlist'
  | 'stock_detail'
