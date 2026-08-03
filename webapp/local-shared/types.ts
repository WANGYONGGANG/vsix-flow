// WebApp 本地副本 - 与 /workspace/shared/types.ts 保持一致
export interface StockItem {
  code: string; name: string; price: number; changeRate: number; changeAmount: number;
  volume: number; amount: number; high: number; low: number; open: number; preClose: number;
  turnoverRate: number; marketCap: number; amplitude: number;
}
export interface PortfolioGroup { name: string; codes: string[]; }
export interface StockPortfolio { groups: PortfolioGroup[]; expandKeys: string[]; }
export interface FundPortfolio { groups: PortfolioGroup[]; expandKeys: string[]; }
export interface HoldingsLedger { [code: string]: { cost: number; amount: number }; }
export interface NewsItem { id: string; title: string; content: string; time: string; source: string; url?: string; }
export interface AIModelConfig {
  id: string; name: string; provider: string; baseURL: string; apiKey: string; model: string;
  enabled?: boolean; temperature?: number;
}
export interface AIChatMessage { role: 'system' | 'user' | 'assistant'; content: string; }
export interface AppSettings {
  stockPortfolio: StockPortfolio;
  fundPortfolio: FundPortfolio;
  holdingsLedger: HoldingsLedger;
  riseColor: string;
  fallColor: string;
  pollIntervalMs: number;
  pollOnlyDuringAStockHours: boolean;
  aiModels: AIModelConfig[];
  activeAIModelId: string | null;
  voiceBroadcast: boolean;
  stocksRemind: Record<string, any>;
  remindSwitch: number;
}
