import type { FundData, SectorMeta, IntradayPoint } from '@/types';

const isVsCode = typeof window !== 'undefined' && (window as any).FUND_FLOW_VSCODE;
const API_BASE = isVsCode ? 'http://localhost:3001/api' : '/api';

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  getSectors: () => fetchJson<SectorMeta[]>('/sectors'),
  getIntraday: () => fetchJson<IntradayPoint[]>('/intraday'),
  getAll: async (): Promise<FundData> => {
    const [sectors, intraday] = await Promise.all([
      api.getSectors(),
      api.getIntraday(),
    ]);
    return { sectors, intraday };
  },
};
