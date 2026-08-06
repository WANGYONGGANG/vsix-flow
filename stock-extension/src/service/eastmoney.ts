import * as http from 'http';
import { getProxyPort } from '../shared/proxyPort';
import { apiGet } from '../shared/apiClient';
import type { StockItem, SectorInfo, AlertItem, NewsItem, KlineData, MarketOverview } from '../shared/types';

function proxyGet(path: string): Promise<any> {
  // 优先云端 API（配置 stock-ext.apiBaseUrl 时），失败则回退本地代理
  return apiGet(path, 12000);
}

function emFlattenCode(code: string): string {
  const m = getSecuritiesMarket(code);
  const prefix = m === 'sh' ? '1.' : '0.';
  const clean = code.replace(/^(sh|sz|bj)/i, '');
  return prefix + clean;
}

function getSecuritiesMarket(code: string): 'sh' | 'sz' | 'bj' {
  const c = code.replace(/^(sh|sz|bj)/i, '');
  if (/^(60|68|90|11|13|50|56|51|58)/.test(c)) return 'sh';
  if (/^(00|30|20|12|15|16|18|159)/.test(c)) return 'sz';
  if (/^(43|83|87|92|88|8)/.test(c)) return 'bj';
  return 'sh';
}

export async function fetchStockQuotes(codes: string[]): Promise<StockItem[]> {
  if (!codes.length) return [];
  const secids = codes.map(c => emFlattenCode(c)).join(',');
  const r = await proxyGet(`/api/quote?codes=${codes.join(',')}`);
  const diff = r?.data?.diff || [];
  return diff.map((d: any) => ({
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
    pe: d.f9 ?? 0, pb: d.f23 ?? 0, floatCap: d.f116 ?? 0,
    isSHConnect: /^(601|603|605|688)/.test(d.f12 || ''), isSZConnect: /^(000|002|300)/.test(d.f12 || ''),
    isMargin: (d.f116 ?? 0) > 5e8, marginBalance: 0, industry: d.f127 ?? '',
  }));
}

export async function fetchFundQuotes(codes: string[]): Promise<any[]> {
  if (!codes.length) return [];
  const r = await proxyGet(`/api/quote?codes=${codes.join(',')}`);
  return r?.data?.diff || [];
}

export async function fetchMarketOverview(): Promise<MarketOverview> {
  const r = await proxyGet('/api/market-overview');
  const indices = (r?.data?.diff || []).map((d: any) => ({
    code: d.f12, name: d.f14, price: d.f2 ?? 0, changeRate: d.f3 ?? 0,
    changeAmount: d.f4 ?? 0, volume: 0, amount: 0, high: 0, low: 0, open: 0,
    preClose: 0, turnoverRate: 0, marketCap: 0, amplitude: 0,
  }));
  return { indices, limitUpCount: 0, limitDownCount: 0, upCount: 0, downCount: 0, flatCount: 0 };
}

export async function fetchSectorBoards(): Promise<SectorInfo[]> {
  const r = await proxyGet('/api/sector-limit');
  const list = r?.data?.diff || [];
  return list.map((d: any) => ({
    code: d.f12, name: d.f14, changeRate: d.f3 ?? 0, price: d.f2 ?? 0,
    amount: d.f20 ?? 0, upCount: d.f104 ?? 0, downCount: d.f105 ?? 0, netInflow: d.f62 ?? 0,
  }));
}

export async function fetchFundFlowIntraday(sectorCode: string): Promise<{ time: string; value: number }[]> {
  const r = await proxyGet(`/api/fund-flow/intraday?code=${sectorCode}`);
  const trends = r?.data?.trends || [];
  return trends.map((t: string) => {
    const parts = t.split(',');
    return { time: parts[0], value: parseFloat(parts[1]) || 0 };
  });
}

export async function fetchKline(code: string, period: string = 'day'): Promise<KlineData[]> {
  const r = await proxyGet(`/api/kline?code=${code}&period=${period}`);
  const klines = r?.data?.klines || [];
  return klines.map((k: string) => {
    const p = k.split(',');
    return { time: p[0], open: parseFloat(p[1]) || 0, high: parseFloat(p[2]) || 0, low: parseFloat(p[3]) || 0, close: parseFloat(p[4]) || 0, volume: parseFloat(p[5]) || 0 };
  });
}

export async function fetchEmNews(page: number = 1, pageSize: number = 50): Promise<NewsItem[]> {
  const r = await proxyGet(`/api/em-news?page=${page}&pageSize=${pageSize}`);
  const list = r?.data?.list || [];
  return list.map((d: any) => ({
    id: String(d.id || d.seq || ''),
    title: d.title || '',
    content: d.content || d.digest || '',
    time: d.showtime || d.ctime || '',
    source: d.source || d.site || d.Art_Media_Name || '',
    url: d.url_w || d.url_m || d.url || '',
  }));
}

export async function fetchLimitUpToday(): Promise<any[]> {
  const r = await proxyGet('/api/limit-up-today');
  return r?.data?.diff || [];
}

export async function fetchHotStocks(): Promise<StockItem[]> {
  const r = await proxyGet('/api/hot-stocks');
  const list = r?.data?.diff || [];
  return list.map((d: any) => ({
    code: d.f12, name: d.f14, price: d.f2 ?? 0, changeRate: d.f3 ?? 0, changeAmount: d.f4 ?? 0,
    volume: 0, amount: d.f20 ?? 0, high: d.f15 ?? 0, low: d.f16 ?? 0, open: d.f17 ?? 0,
    preClose: d.f18 ?? 0, turnoverRate: 0, marketCap: 0, amplitude: 0,
  }));
}

export async function fetchDragonTiger(date?: string): Promise<any[]> {
  const r = await proxyGet('/api/dragon-tiger');
  return r?.data?.diff || [];
}

export async function fetchAlertData(): Promise<{ indexAlerts: AlertItem[]; stockAlerts: AlertItem[] }> {
  return { indexAlerts: [], stockAlerts: [] };
}
