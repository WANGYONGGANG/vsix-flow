export interface StockItem {
  code: string;
  name: string;
  price: number;
  changeRate: number;
  changeAmount: number;
  volume: number;
  amount: number;
  high: number;
  low: number;
  open: number;
  preClose: number;
  turnoverRate: number;
  marketCap: number;
  amplitude: number;
  pe: number;
  pb: number;
  floatCap: number;
  isSHConnect: boolean;
  isSZConnect: boolean;
  isMargin: boolean;
  marginBalance: number;
  industry: string;
}

export interface FundItem {
  code: string;
  name: string;
  price: number;
  changeRate: number;
  earnings: string;
  time: string;
}

export interface PortfolioGroup {
  name: string;
  codes: string[];
}

export interface StockPortfolio {
  groups: PortfolioGroup[];
  expandKeys: string[];
}

export interface FundPortfolio {
  groups: PortfolioGroup[];
  expandKeys: string[];
}

export interface HoldingsLedger {
  [code: string]: {
    cost: number;
    amount: number;
  };
}

export interface RemindConfig {
  [code: string]: {
    price?: { operator: 'gt' | 'lt'; value: number };
    percent?: { operator: 'gt' | 'lt'; value: number };
  };
}

export interface MarketOverview {
  indices: StockItem[];
  limitUpCount: number;
  limitDownCount: number;
  upCount: number;
  downCount: number;
  flatCount: number;
}

export interface SectorInfo {
  code: string;
  name: string;
  changeRate: number;
  price: number;
  amount: number;
  upCount: number;
  downCount: number;
  netInflow: number;
}

export interface AlertItem {
  type: 'up' | 'down';
  text: string;
  time: string;
  code?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  time: string;
  source: string;
  url?: string;
}

export interface KlineData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
