// WebApp 本地副本 - 与 /workspace/shared/constants.ts 保持一致
export const UI_COLORS = {
  BG: '#0a0c10', FG: '#b8bfc6', CARD: '#12151a', BORDER: '#1f2124', ACCENT: '#e8b339',
  DEFAULT_UP: '#ff4d4f', DEFAULT_DOWN: '#23c343',
} as const;

export const CHG_TYPES: Record<number, string> = {
  4: '秒板', 8: '封板', 16: '打开涨停', 32: '大笔买入', 64: '大笔卖出', 128: '大笔买入',
  8193: '火箭发射', 8194: '快速反弹', 8201: '加速上涨', 8202: '高台跳水', 8203: '加速下跌',
  8204: '大笔卖出', 8207: '大幅上升', 8208: '大幅下降', 8209: '封涨停', 8210: '封跌停',
  8211: '打开涨停', 8212: '打开跌停', 8213: '创历史新高', 8214: '创历史新低',
  8215: '竞价上涨', 8216: '竞价下跌',
};

export function isAStockTradingHours(now: Date = new Date()): boolean {
  const h = now.getUTCHours() + 8;
  const m = now.getUTCMinutes();
  const t = h * 100 + m;
  if (t >= 900 && t <= 1130) return true;
  if (t >= 1300 && t <= 1505) return true;
  return false;
}

export const DEFAULT_SETTINGS = {
  stockPortfolio: { groups: [{ name: '默认分组', codes: ['sh000001', 'sh601899', 'sz000001'] }], expandKeys: [] },
  fundPortfolio: { groups: [], expandKeys: [] },
  holdingsLedger: {},
  riseColor: UI_COLORS.DEFAULT_UP,
  fallColor: UI_COLORS.DEFAULT_DOWN,
  pollIntervalMs: 5000,
  pollOnlyDuringAStockHours: false,
  aiModels: [],
  activeAIModelId: null,
  voiceBroadcast: false,
  stocksRemind: {},
  remindSwitch: 1,
  opacity: 1,
  // ===== 扩展适配 - WebApp 专属 =====
  theme: 'light' as 'dark' | 'light' | 'system',
  watchlist: [] as { code: string; name?: string }[],
  // ===== 从扩展补齐 =====
  webhook: {
    wecom: { url: '', enabled: false },
    dingtalk: { url: '', enabled: false },
    feishu: { url: '', enabled: false },
  },
  voicePreset: 'system',
  maxVisibleTurns: 30,
  aiStockHistoryRange: '3m' as '1y' | '6m' | '3m' | '1m' | '1w',
};
