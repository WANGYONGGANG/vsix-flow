// WebApp 本地副本 - 与 /workspace/shared/utils.ts 保持一致
export function fmtYi(v: number | string): string {
  const n = Number(v) || 0;
  const abs = Math.abs(n);
  let s: string;
  if (abs >= 100000000) s = (abs / 100000000).toFixed(2) + '亿';
  else if (abs >= 10000) s = (abs / 10000).toFixed(2) + '万';
  else s = abs.toFixed(2);
  return n < 0 ? '-' + s : s;
}

export function fmtWan(v: number | string): string {
  const n = Number(v) || 0;
  const abs = Math.abs(n);
  if (abs >= 100000000) return (abs / 100000000).toFixed(2) + '亿';
  if (abs >= 10000) return (abs / 10000).toFixed(2) + '万';
  return abs.toFixed(0);
}

export function fmtAmount(v: number | string): string {
  const n = Number(v) || 0;
  const abs = Math.abs(n);
  if (abs >= 100000000) return (abs / 100000000).toFixed(2) + '亿';
  if (abs >= 10000) return (abs / 10000).toFixed(2) + '万';
  if (abs >= 1000) return (abs / 10000).toFixed(2) + '万';
  return abs.toFixed(0);
}
export function fmtPrice(v: number | string): string {
  const n = Number(v) || 0;
  return n > 10000 ? (n / 10000).toFixed(2) + '万' : n.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}
export function upSign(v: number): string { return v >= 0 ? '+' : ''; }

export function getSecuritiesMarket(code: string): 'sh' | 'sz' | 'bj' {
  const c = code.replace(/^(sh|sz|bj)/i, '');
  if (/^(60|68|90|11|13|50|56|51|58)/.test(c)) return 'sh';
  if (/^(00|30|20|12|15|16|18|159)/.test(c)) return 'sz';
  if (/^(43|83|87|92|88|8)/.test(c)) return 'bj';
  return 'sh';
}
export function normalizeCode(raw: string): string {
  const c = String(raw || '').trim().toLowerCase();
  if (/^(sh|sz|bj)\d+/.test(c)) return c;
  const m = getSecuritiesMarket(c);
  return m + c;
}
export function mapEmDiffToStockItem(d: any): any {
  // 盘口字段来自腾讯（实时），财务字段来自东方财富（振幅/市盈/市净/市值/行业）
  return {
    code: d.f12, name: d.f14,
    price: d.f2 ?? 0, changeRate: d.f3 ?? 0, changeAmount: d.f4 ?? 0,
    volume: d.f5 ?? 0, amount: d.f6 ?? 0,
    high: d.f15 ?? 0, low: d.f16 ?? 0, open: d.f17 ?? 0, preClose: d.f18 ?? 0,
    turnoverRate: d.f8 ?? 0, marketCap: d.f20 ?? 0, amplitude: d.f7 ?? 0,
    pe: d.f9 ?? 0, pb: d.f23 ?? 0, floatCap: d.f21 ?? 0,
    isSHConnect: /^(601|603|605|688)/.test(d.f12 || ''), isSZConnect: /^(000|002|300)/.test(d.f12 || ''),
    isMargin: /^(60|68|00|30)/.test(d.f12 || ''), marginBalance: 0, industry: d.f127 ?? '',
    buy1: d.buy1, buy1vol: d.buy1vol, buy2: d.buy2, buy2vol: d.buy2vol,
    buy3: d.buy3, buy3vol: d.buy3vol, buy4: d.buy4, buy4vol: d.buy4vol,
    buy5: d.buy5, buy5vol: d.buy5vol,
    sell1: d.sell1, sell1vol: d.sell1vol, sell2: d.sell2, sell2vol: d.sell2vol,
    sell3: d.sell3, sell3vol: d.sell3vol, sell4: d.sell4, sell4vol: d.sell4vol,
    sell5: d.sell5, sell5vol: d.sell5vol,
  };
}
export function escapeHtml(s: string): string {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}
export function uid(): string { return Math.random().toString(36).slice(2, 10); }
