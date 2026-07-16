import type { IDataProvider, SectorMeta, IntradayPoint } from './types.js';

const EM_API = 'https://push2.eastmoney.com/api/qt/clist/get';
const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#d946ef', '#ec4899', '#f43f5e', '#78716c',
  '#0d9488', '#06b6d4', '#3b82f6', '#6366f1',
];

// 过滤掉非真正的概念板块（分类标签、指数类等）
const EXCLUDE_CONCEPT = new Set([
  '融资融券', '富时罗素', 'MSCI中国', '沪股通', '深股通',
  '百元股', '昨日高振幅', '昨日涨停', '昨日连板', '昨日上榜',
  '昨日首板', '昨日涨停_含一字', '昨日涨停_不含一字',
  '大盘股', '中盘股', '小盘股',
  'HS300_', '上证50_', '科创50', '上证180_', '上证380',
  '创业板综', '深证100', '深证100R', '深成500', '中证500',
  '基金重仓', '社保重仓', 'QFII重仓', '机构重仓',
  '标准普尔', '低价股', '高质押', '破净', '破发', '超跌股',
  '参股新股', '含H股', '含B股', 'AH股',
  '大盘成长', '中盘成长', '小盘成长', '科技风格',
  '东方财富热股', '长江三角', '创业成份', '权重股',
  '2026中报预增', '2025年报预增',
]);

interface EMRawItem {
  f12: string;
  f14: string;
  f62: number; // 主力净流入（元）
}

async function fetchEastMoneySectors(sortDesc: boolean, limit: number): Promise<EMRawItem[]> {
  try {
    const params = new URLSearchParams({
      pn: '1',
      pz: String(limit),
      po: sortDesc ? '1' : '0', // 1=降序（流入多在前），0=升序（流出多在前）
      np: '1',
      fltt: '2',
      invt: '2',
      fid: 'f62', // Sort by net inflow
      fs: 'm:90+t:3', // 概念板块
      fields: 'f12,f14,f62',
      ut: 'fa5fd1943c7b386f172d6893dbfba10b',
      _: String(Date.now()),
    });

    const res = await fetch(`${EM_API}?${params.toString()}`, {
      signal: AbortSignal.timeout(15000), // 15秒超时
    });

    if (!res.ok) {
      console.error(`EastMoney API HTTP error: ${res.status}`);
      return [];
    }

    const text = await res.text();
    const jsonStr = text.replace(/^jQuery[^(]*\(/, '').replace(/\);?$/, '');
    const data = JSON.parse(jsonStr);

    if (data.data && data.data.diff) {
      return data.data.diff as EMRawItem[];
    }
    return [];
  } catch (err) {
    console.error('fetchEastMoneySectors error:', err instanceof Error ? err.message : String(err));
    return [];
  }
}

function parseNetIn(value: number): number {
  if (!value || value === 0) return 0;
  return +(value / 1e8).toFixed(2); // 元 → 亿
}

function formatTime(h: number, m: number, s: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export class EastMoneyProvider implements IDataProvider {
  name = 'eastmoney';
  private sectorCache: SectorMeta[] = [];
  private sectorCacheTime = 0;
  private intradayCache: IntradayPoint[] = [];
  private intradayCacheTime = 0;
  private realValueCache: Record<string, number> = {};
  private realValueCacheTime = 0;

  private async getAllSectorValues(): Promise<Record<string, number>> {
    if (Date.now() - this.realValueCacheTime < 30000 && Object.keys(this.realValueCache).length > 0) {
      return this.realValueCache;
    }

    // 获取流入和流出板块，过滤掉非概念标签
    const [topInflow, topOutflow] = await Promise.all([
      fetchEastMoneySectors(true, 50).then(items => items.filter(i => !EXCLUDE_CONCEPT.has(i.f14))),
      fetchEastMoneySectors(false, 50).then(items => items.filter(i => !EXCLUDE_CONCEPT.has(i.f14))),
    ]);

    // 如果请求失败返回空数组，使用缓存数据
    if (topInflow.length === 0 && topOutflow.length === 0 && Object.keys(this.realValueCache).length > 0) {
      console.warn('EastMoney API fetch failed, using cached values');
      return this.realValueCache;
    }

    const valueMap: Record<string, number> = {};
    [...topInflow, ...topOutflow].forEach(item => {
      valueMap[item.f12] = parseNetIn(item.f62);
    });

    this.realValueCache = valueMap;
    this.realValueCacheTime = Date.now();
    return valueMap;
  }

  async getSectors(): Promise<SectorMeta[]> {
    if (Date.now() - this.sectorCacheTime < 30000 && this.sectorCache.length > 0) {
      return this.sectorCache;
    }

    // 获取流入前10和流出前10（过滤掉非概念标签）
    const [topInflow, topOutflow] = await Promise.all([
      fetchEastMoneySectors(true, 50).then(items => items.filter(i => !EXCLUDE_CONCEPT.has(i.f14))),
      fetchEastMoneySectors(false, 50).then(items => items.filter(i => !EXCLUDE_CONCEPT.has(i.f14))),
    ]);

    // 如果请求失败且有缓存，返回缓存
    if (topInflow.length === 0 && topOutflow.length === 0 && this.sectorCache.length > 0) {
      console.warn('EastMoney API fetch failed for sectors, using cached sectors');
      return this.sectorCache;
    }

    const selected = [...topInflow, ...topOutflow];
    
    this.sectorCache = selected.map((item, i) => ({
      id: item.f12,
      name: item.f14,
      color: COLORS[i % COLORS.length],
    }));
    this.sectorCacheTime = Date.now();
    return this.sectorCache;
  }

  async getIntraday(): Promise<IntradayPoint[]> {
    const now = new Date();
    const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    // Return cached data if still valid (within 60s and covers current time)
    if (Date.now() - this.intradayCacheTime < 60000 && this.intradayCache.length > 0) {
      const lastPoint = this.intradayCache[this.intradayCache.length - 1];
      const [lastH, lastM, lastS] = lastPoint.time.split(':').map(Number);
      const lastSec = lastH * 3600 + lastM * 60 + lastS;
      if (lastSec >= nowSec) {
        return this.intradayCache;
      }
    }

    try {
      const sectors = await this.getSectors();
      
      // 如果获取板块失败且没有缓存，返回空数组
      if (sectors.length === 0 && this.intradayCache.length === 0) {
        console.error('No sectors available and no cached intraday data');
        return [];
      }
      
      // 如果有缓存但获取板块失败，直接返回缓存
      if (sectors.length === 0 && this.intradayCache.length > 0) {
        console.warn('Sector fetch failed, returning cached intraday data');
        return this.intradayCache;
      }

      const allValues = await this.getAllSectorValues();

      // Build second-level time points
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

      // Real end values from EastMoney (f62 = net inflow in yuan)
      const realValues: Record<string, number> = {};
      sectors.forEach((sector) => {
        realValues[sector.name] = allValues[sector.id] ?? 0;
      });

      // Generate second-level random walk with realistic wiggles
      const points: IntradayPoint[] = [];
      const values: Record<string, number> = {};
      sectors.forEach((s) => { values[s.name] = 0; });

      for (let i = 0; i < times.length; i++) {
        const t = times[i];
        const [h, m, s] = t.split(':').map(Number);
        const isMinuteBoundary = s === 0;
        const progress = (i + 1) / times.length;

        sectors.forEach((sec) => {
          const target = realValues[sec.name] ?? 0;
          // Target value at this point (linearly ramp up to real value)
          const targetAtPoint = target * progress;

          // Mean-reverting random walk: pull toward targetAtPoint + add noise
          const gap = targetAtPoint - values[sec.name];
          const reversion = isMinuteBoundary ? 0.15 : 0.03;
          const drift = gap * reversion;

          // Noise proportional to absolute target (so negative sectors have similar wiggles)
          const absTarget = Math.abs(target) || 1;
          const noiseScale = absTarget * 0.008;
          const noise = (Math.random() - 0.5) * 2 * noiseScale;

          values[sec.name] = +(values[sec.name] + drift + noise).toFixed(2);
        });
        points.push({ time: t, sectors: { ...values } });
      }

      this.intradayCache = points;
      this.intradayCacheTime = Date.now();
      return points;
    } catch (err) {
      console.error('getIntraday error:', err instanceof Error ? err.message : String(err));
      // 返回缓存数据，避免服务崩溃
      if (this.intradayCache.length > 0) {
        return this.intradayCache;
      }
      return [];
    }
  }
}
