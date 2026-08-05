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
export interface WatchEntry { code: string; name?: string; }
export interface WebhookConfig {
  url: string;
  enabled: boolean;
}
export interface WebhookSettings {
  wecom?: WebhookConfig;     // 企业微信
  dingtalk?: WebhookConfig;  // 钉钉
  feishu?: WebhookConfig;    // 飞书
}
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
  opacity: number;
  hideStatusBar: boolean;
  hideStatusBarIcon: boolean;
  hideSidebarIcon?: boolean;
  hideActivityIcon?: boolean;
  // ===== 扩展适配 - WebApp 专属 =====
  theme: 'dark' | 'light' | 'system';
  statusBarStock: boolean;   // 迷你行情条是否显示自选股
  tickerMs: number;          // 迷你行情条轮询周期（ms）
  watchlist?: WatchEntry[];  // 兼容用（股票搜索/自选显示，与 stockPortfolio 同步）
  // ===== 从扩展补齐 =====
  webhook?: WebhookSettings;          // 预警 Webhook 推送（企业微信/钉钉/飞书）
  voicePreset?: string;               // 语音播报音色预设
  maxVisibleTurns?: number;           // AI 最大对话轮数（默认 30）
  aiStockHistoryRange?: '1y' | '6m' | '3m' | '1m' | '1w';  // AI 分析历史区间
}
