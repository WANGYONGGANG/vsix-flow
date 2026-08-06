// ============================================
// 共享工具函数 - 纯函数、无平台依赖
// ============================================

/** 数字转 万/亿 简写 */
export function fmtYi(v: number | string): string {
  const n = Number(v) || 0;
  const abs = Math.abs(n);
  let s: string;
  if (abs >= 100000000) s = (abs / 100000000).toFixed(2) + '亿';
  else if (abs >= 10000) s = (abs / 10000).toFixed(2) + '万';
  else s = abs.toFixed(2);
  return n < 0 ? '-' + s : s;
}

export function fmtPrice(v: number | string): string {
  const n = Number(v) || 0;
  return n > 10000 ? (n / 10000).toFixed(2) + '万' : n.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}

/** 判断涨颜色 class */
export function upClass(v: number): string {
  return v >= 0 ? 'up' : 'down';
}
export function upSign(v: number): string {
  return v >= 0 ? '+' : '';
}

/** 东方财富代码转换：sh600519 -> 1.600519 / sz000001 -> 0.000001 */
export function emFlattenCode(code: string): string {
  const m = getSecuritiesMarket(code);
  const prefix = m === 'sh' ? '1.' : '0.';
  const clean = code.replace(/^(sh|sz|bj)/i, '');
  return prefix + clean;
}

export function getSecuritiesMarket(code: string): 'sh' | 'sz' | 'bj' {
  const c = code.replace(/^(sh|sz|bj)/i, '');
  if (/^(60|68|90|11|13|50|56|51|58)/.test(c)) return 'sh';
  if (/^(00|30|20|12|15|16|18|159)/.test(c)) return 'sz';
  if (/^(43|83|87|92|88|8)/.test(c)) return 'bj';
  return 'sh';
}

/** 东方财富原始 diff 字段 -> StockItem */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapEmDiffToStockItem(d: any): StockItem {
  return {
    code: d.f12,
    name: d.f14,
    price: d.f43 ?? d.f2 ?? 0,
    changeRate: d.f170 ?? d.f3 ?? 0,
    changeAmount: d.f169 ?? d.f4 ?? 0,
    volume: d.f47 ?? 0,
    amount: d.f48 ?? 0,
    high: d.f44 ?? d.f15 ?? 0,
    low: d.f45 ?? d.f16 ?? 0,
    open: d.f46 ?? d.f17 ?? 0,
    preClose: d.f18 ?? 0,
    turnoverRate: d.f168 ?? d.f38 ?? 0,
    marketCap: d.f20 ?? 0,
    amplitude: d.f37 ?? 0,
  };
}

export function escapeHtml(s: string): string {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

/** 代码带市场前缀 */
export function normalizeCode(raw: string): string {
  const c = String(raw || '').trim().toLowerCase();
  if (/^(sh|sz|bj)\d+/.test(c)) return c;
  const m = getSecuritiesMarket(c);
  return m + c;
}
