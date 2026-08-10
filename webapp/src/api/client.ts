// ============================================
// API 客户端封装
// 部署后同源：/api/*
// 本地开发：Vite proxy → localhost:19101 或 vercel dev
// ============================================

export const API_BASE = (import.meta as any).env?.VITE_API_BASE || '';

async function request<T = any>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const hasBody = !!(init?.body || init?.method && init.method !== 'GET' && init.method !== 'HEAD');
    const customHeaders = hasBody ? { 'Content-Type': 'application/json', ...(init?.headers || {}) } : (init?.headers || {});
    const res = await fetch(API_BASE + path, {
      credentials: 'include',
      method: 'GET',
      ...(init || {}),
      headers: customHeaders,
    });
    if (!res.ok) {
      try { console.warn('[api] err', path, res.status, await res.text()); } catch { /* empty */ }
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn('[api] failed', path, e);
    return null;
  }
}

export const api = {
  quote: (codes: string[]) => request<any>(`/api/quote?codes=${codes.join(',')}`),
  quoteDetail: (code: string) => request<any>(`/api/quote-detail?code=${code}`),
  marketOverview: () => request<any>('/api/market-overview'),
  marketOverviewDetail: () => request<any>('/api/market-overview-detail'),
  kline: (code: string, period = 'day', limit?: number, fq = 'qfq') =>
    request<any>(`/api/kline?code=${code}&period=${period}${limit ? `&limit=${limit}` : ''}&fq=${fq}`),
  intraday: (code: string, days = 1) => request<any>(`/api/intraday?code=${code}${days > 1 ? `&days=${days}` : ''}`),
  emNews: (page = 1, pageSize = 60) => request<any>(`/api/em-news?page=${page}&pageSize=${pageSize}`),
  emNewsSearch: (keyword = 'A股', page = 1, pageSize = 50) => request<any>(`/api/em-news-search?keyword=${encodeURIComponent(keyword)}&page=${page}&pageSize=${pageSize}`),
  ztPool: (date?: string) => request<any>(`/api/zt-pool${date ? `?date=${date}` : ''}`),
  lhb: () => request<any>('/api/lhb'),
  stockChanges: () => request<any>('/api/stock-changes'),
  hotStocks: () => request<any>('/api/hot-stocks'),
  sectorLimit: () => request<any>('/api/sector-limit'),
  sinaBkzj: (fenlei: 0 | 1 = 1) => request<any>(`/api/sina-bkzj?fenlei=${fenlei}`),
  stockNews: (code: string, pageSize = 20) => request<any>(`/api/stock-news?code=${code}&pageSize=${pageSize}`),
  stockNotice: (code: string) => request<any>(`/api/stock-notice?code=${code}`),
  stockFinance: (code: string) => request<any>(`/api/stock-finance?code=${code}`),
  stockEssential: (code: string) => request<any>(`/api/stock-essential?code=${code}`),
  stockProfile: (code: string, sub = 'essential') => request<any>(`/api/stock-profile?code=${code}&sub=${sub}`),

  // ===== 扩展适配 - 新增接口 =====
  marketRealtimeBatch: (codes: string[]) => request<any>(`/api/quote?codes=${codes.join(',')}`),
  search: (kw: string) => request<any>(`/api/search?kw=${encodeURIComponent(kw)}`),
  stockFlowRank: (pz = 100) => request<any>(`/api/stock-flow-rank?pz=${pz}`),
  allStocks: (market = 'a') => request<any>(`/api/all-stocks?market=${market}`),
  sectorFlowRank: (t: 1 | 2 = 2, pz = 30) => request<any>(`/api/sector-flow-rank?t=${t}&pz=${pz}`),
  stockFflowDay: (code: string, lmt = 30) => request<any>(`/api/stock-fflow-day?code=${encodeURIComponent(code)}&lmt=${lmt}`),
  stockHolder: (code: string) => request<any>(`/api/stock-holder?code=${encodeURIComponent(code)}`),

  // AI Chat - 支持 SSE 流式响应
  async chatStream(params: {
    baseURL: string; apiKey: string; model: string; temperature?: number;
    messages: { role: string; content: string }[];
    onToken?: (delta: string) => void;
  }): Promise<string> {
    const { baseURL, apiKey, model, messages, temperature, onToken } = params;
    const resp = await fetch(API_BASE + '/api/ai/chat', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseURL, apiKey, model, temperature, messages, stream: true }),
    });
    if (!resp.ok) { throw new Error(`HTTP ${resp.status}`); }
    const reader = resp.body?.getReader();
    if (!reader) { throw new Error('no body'); }
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const t = line.trim();
        if (!t || !t.startsWith('data:')) continue;
        const data = t.slice(5).trim();
        if (data === '[DONE]') return full;
        try {
          const j = JSON.parse(data);
          if (j.error) { throw new Error(String(j.error)); }
          const delta: string = j.choices?.[0]?.delta?.content || j.choices?.[0]?.message?.content || '';
          if (delta) { full += delta; onToken?.(delta); }
        } catch (e) { /* non-JSON chunk - ignore */ }
      }
    }
    return full;
  },
};
