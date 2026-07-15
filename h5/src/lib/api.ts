import type { FundData, SectorMeta, IntradayPoint, HistoricalPoint } from '@/types';

const isVsCode = typeof window !== 'undefined' && (window as any).FUND_FLOW_VSCODE;
const API_BASE = isVsCode ? 'http://localhost:3001/api' : '/api';

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  getSectors: () => fetchJson<SectorMeta[]>('/sectors'),
  addSector: (name: string) =>
    fetchJson<SectorMeta>('/sectors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }),
  removeSector: (id: string) =>
    fetchJson<void>(`/sectors/${id}`, { method: 'DELETE' }),
  getIntraday: (date?: string) => fetchJson<IntradayPoint[]>(`/intraday${date ? `?date=${date}` : ''}`),
  getHistorical: (days = 45) => fetchJson<HistoricalPoint[]>(`/historical?days=${days}`),
  getAll: async (): Promise<FundData> => {
    const [sectors, intraday, historical] = await Promise.all([
      api.getSectors(),
      api.getIntraday(),
      api.getHistorical(),
    ]);
    return { sectors, intraday, historical };
  },
};