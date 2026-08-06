// ============================================
// 共享类型定义 - VSCode 扩展 & WebApp 通用
// ============================================

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
  pe: number;          // 市盈率
  pb: number;          // 市净率
  floatCap: number;    // 流通市值
  isSHConnect: boolean;   // 沪股通
  isSZConnect: boolean;   // 深股通
  isMargin: boolean;      // 融资融券
  marginBalance: number;  // 融资融券余额
  industry: string;       // 所属行业
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

// ============ AI 模型配置 ============
export interface AIModelConfig {
  id: string;              // 本地唯一 id
  name: string;            // 显示名
  provider: string;        // 供应商名（备注用）
  baseURL: string;         // https://api.openai.com/v1 或兼容地址
  apiKey: string;          // 用户自己的 key
  model: string;           // 模型名 gpt-4o / deepseek-chat / doubao 等
  enabled?: boolean;
  temperature?: number;
}

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AppSettings {
  // 自选
  stockPortfolio: StockPortfolio;
  fundPortfolio: FundPortfolio;
  holdingsLedger: HoldingsLedger;
  // UI
  riseColor: string;
  fallColor: string;
  pollIntervalMs: number;
  pollOnlyDuringAStockHours: boolean;
  // AI
  aiModels: AIModelConfig[];
  activeAIModelId: string | null;
  // 其他
  voiceBroadcast: boolean;
  stocksRemind: RemindConfig;
  remindSwitch: number;
}
