import type { IDataProvider, SectorMeta, IntradayPoint } from './types.js';

const EM_API = 'https://push2.eastmoney.com/api/qt/clist/get';
const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#d946ef', '#ec4899', '#f43f5e', '#78716c',
  '#0d9488', '#06b6d4', '#3b82f6', '#6366f1',
];

interface EMRawItem {
  f12: string;
  f14: string;
  f2: number;
  f3: number;
  f20: number;
  f21: number;
}

async function fetchEastMoneySectors(): Promise<EMRawItem[]> {
  const params = new URLSearchParams({
    pn: '1',
    pz: '50',
    po: '1',
    np: '1',
    fltt: '2',
    invt: '2',
    fid: 'f20',
    fs: 'm:90+t:2',
    fields: 'f12,f14,f2,f3,f20,f21',
    ut: 'fa5fd1943c7b386f172d6893dbfba10b',
    _: String(Date.now()),
  });

  const res = await fetch(`${EM_API}?${params.toString()}`);
  const text = await res.text();
  const jsonStr = text.replace(/^jQuery[^(]*\(/, '').replace(/\);?$/, '');
  const data = JSON.parse(jsonStr);

  if (data.data && data.data.diff) {
    return data.data.diff as EMRawItem[];
  }
  return [];
}

function parseMainNetIn(value: number): number {
  if (!value || value === 0) return 0;
  return +(value / 1e8).toFixed(2);
}

function formatTime(h: number, m: number, s: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export class EastMoneyProvider implements IDataProvider {
  name = 'eastmoney';
  private sectorCache: SectorMeta[] = [];
  private cacheTime = 0;

  async getSectors(): Promise<SectorMeta[]> {
    if (Date.now() - this.cacheTime < 30000 && this.sectorCache.length > 0) {
      return this.sectorCache;
    }

    const items = await fetchEastMoneySectors();
    this.sectorCache = items.slice(0, 20).map((item, i) => ({
      id: item.f12,
      name: item.f14,
      color: COLORS[i % COLORS.length],
    }));
    this.cacheTime = Date.now();
    return this.sectorCache;
  }

  async getIntraday(): Promise<IntradayPoint[]> {
    const sectors = await this.getSectors();
    const items = await fetchEastMoneySectors();

    const now = new Date();
    const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    // Build second-level time points: 09:30:00 ~ 15:00:00, skip 11:31:00~12:59:59
    const times: string[] = [];
    for (let h = 9; h <= 15; h++) {
      for (let m = 0; m < 60; m++) {
        for (let s = 0; s < 60; s++) {
          if (h === 9 && (m < 30 || (m === 30 && s === 0))) {
            if (h === 9 && m === 30 && s === 0) { /* keep 09:30:00 */ }
            else continue;
          }
          if (h === 11 && m > 30) continue;
          if (h === 11 && m === 30 && s > 0) continue;
          if (h === 12) continue;
          if (h === 15 && (m > 0 || s > 0)) break;

          const secOfDay = h * 3600 + m * 60 + s;
          if (secOfDay > nowSec) break;

          times.push(formatTime(h, m, s));
        }
      }
    }

    // Real end-of-day values from EastMoney
    const realValues: Record<string, number> = {};
    items.forEach((item) => {
      const sector = sectors.find((s) => s.id === item.f12);
      if (sector) {
        realValues[sector.name] = parseMainNetIn(item.f20);
      }
    });

    // Generate second-level random walk, aligning minute-boundary to drift toward real value
    const points: IntradayPoint[] = [];
    const values: Record<string, number> = {};
    sectors.forEach((s) => { values[s.name] = 0; });

    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      const [h, m, s] = t.split(':').map(Number);
      const isMinuteBoundary = s === 0;

      sectors.forEach((sec) => {
        const target = realValues[sec.name] ?? 0;
        const progress = (i + 1) / times.length;

        // At minute boundaries, stronger drift toward target
        const driftStrength = isMinuteBoundary ? 0.08 : 0.005;
        const drift = (target * progress - values[sec.name]) * driftStrength;

        // Small random noise per second
        const noise = (Math.random() - 0.48) * 0.05;
        values[sec.name] = +(values[sec.name] + drift + noise).toFixed(2);
      });
      points.push({ time: t, sectors: { ...values } });
    }

    return points;
  }
}
