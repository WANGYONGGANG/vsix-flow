export function formatPrice(n: number): string {
  if (!isFinite(n)) return '--';
  return n.toFixed(2);
}

export function formatRate(n: number): string {
  if (!isFinite(n)) return '--';
  return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
}

export function formatAmount(n: number): string {
  if (!isFinite(n)) return '--';
  const abs = Math.abs(n);
  if (abs >= 1e8) return (n / 1e8).toFixed(2) + '亿';
  if (abs >= 1e4) return (n / 1e4).toFixed(1) + '万';
  return n.toFixed(0);
}

export function getSecuritiesMarket(code: string): 'sh' | 'sz' | 'bj' {
  const c = code.trim();
  if (/^(60|68|90|11|13|50|56|51|58)/.test(c)) return 'sh';
  if (/^(00|30|20|12|15|16|18|159)/.test(c)) return 'sz';
  if (/^(43|83|87|92|88|8)/.test(c)) return 'bj';
  return 'sh';
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function isAStockHours(): boolean {
  const now = new Date();
  const h = now.getUTCHours() + 8;
  const m = now.getUTCMinutes();
  const time = h * 100 + m;
  return time >= 900 && time <= 1505;
}
