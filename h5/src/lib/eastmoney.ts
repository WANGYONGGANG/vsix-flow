import type { SectorMeta, IntradayPoint } from '@/types';

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
  f62: number;
}

// 请求东方财富 API（带超时）
async function fetchEastMoneySectors(sortDesc: boolean, limit: number): Promise<EMRawItem[]> {
  const params = new URLSearchParams({
    pn: '1',
    pz: String(limit),
    po: sortDesc ? '1' : '0',
    np: '1',
    fltt: '2',
    invt: '2',
    fid: 'f62',
    fs: 'm:90+t:3',
    fields: 'f12,f14,f62',
    ut: 'fa5fd1943c7b386f172d6893dbfba10b',
    _: String(Date.now()),
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${EM_API}?${params.toString()}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`EastMoney API HTTP error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (data.data && data.data.diff) {
      return data.data.diff as EMRawItem[];
    }
    return [];
  } catch (err) {
    clearTimeout(timeout);
    console.error('fetchEastMoneySectors error:', err instanceof Error ? err.message : String(err));
    return [];
  }
}

function parseNetIn(value: number): number {
  if (!value || value === 0) return 0;
  return +(value / 1e8).toFixed(2);
}

function formatTime(h: number, m: number, s: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// 获取概念板块列表（流入前10 + 流出前10）
export async function getSectors(): Promise<SectorMeta[]> {
  const [topInflow, topOutflow] = await Promise.all([
    fetchEastMoneySectors(true, 50).then(items => items.filter(i => !EXCLUDE_CONCEPT.has(i.f14))),
    fetchEastMoneySectors(false, 50).then(items => items.filter(i => !EXCLUDE_CONCEPT.has(i.f14))),
  ]);

  const selected = [...topInflow.slice(0, 10), ...topOutflow.slice(0, 10)];

  return selected.map((item, i) => ({
    id: item.f12,
    name: item.f14,
    color: COLORS[i % COLORS.length],
  }));
}

// 获取板块实时净值映射
async function getAllSectorValues(): Promise<Record<string, number>> {
  const [topInflow, topOutflow] = await Promise.all([
    fetchEastMoneySectors(true, 30).then(items => items.filter(i => !EXCLUDE_CONCEPT.has(i.f14))),
    fetchEastMoneySectors(false, 30).then(items => items.filter(i => !EXCLUDE_CONCEPT.has(i.f14))),
  ]);

  const valueMap: Record<string, number> = {};
  [...topInflow, ...topOutflow].forEach(item => {
    valueMap[item.f12] = parseNetIn(item.f62);
  });

  return valueMap;
}

// 生成秒级分时数据
export async function getIntraday(sectors: SectorMeta[]): Promise<IntradayPoint[]> {
  const now = new Date();
  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  const allValues = await getAllSectorValues();

  // 构建交易时间秒级时间点
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

  // 真实终值
  const realValues: Record<string, number> = {};
  sectors.forEach((sector) => {
    realValues[sector.name] = allValues[sector.id] ?? 0;
  });

  // 生成秒级随机游走
  const points: IntradayPoint[] = [];
  const values: Record<string, number> = {};
  sectors.forEach((s) => { values[s.name] = 0; });

  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    const [_h, _m, s] = t.split(':').map(Number);
    const isMinuteBoundary = s === 0;
    const progress = (i + 1) / times.length;

    sectors.forEach((sec) => {
      const target = realValues[sec.name] ?? 0;
      const targetAtPoint = target * progress;
      const gap = targetAtPoint - values[sec.name];
      const reversion = isMinuteBoundary ? 0.15 : 0.03;
      const drift = gap * reversion;
      const absTarget = Math.abs(target) || 1;
      const noiseScale = absTarget * 0.008;
      const noise = (Math.random() - 0.5) * 2 * noiseScale;
      values[sec.name] = +(values[sec.name] + drift + noise).toFixed(2);
    });
    points.push({ time: t, sectors: { ...values } });
  }

  return points;
}

// ========== 前端缓存 ==========
let cacheSectors: SectorMeta[] | null = null;
let cacheIntraday: IntradayPoint[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 60 秒缓存

function timeToSec(t: string): number {
  const [h, m, s] = t.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

function nowSec(): number {
  const n = new Date();
  return n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds();
}

function isCacheValid(): boolean {
  if (!cacheSectors || !cacheIntraday || cacheIntraday.length === 0) return false;
  if (Date.now() - cacheTime > CACHE_TTL) return false;
  // 缓存的最后时间必须 >= 当前时间
  const lastTime = cacheIntraday[cacheIntraday.length - 1].time;
  return timeToSec(lastTime) >= nowSec();
}

// 一次性获取所有数据（带缓存）
export async function getAllData(): Promise<{ sectors: SectorMeta[]; intraday: IntradayPoint[] }> {
  if (isCacheValid()) {
    return { sectors: cacheSectors!, intraday: cacheIntraday! };
  }

  const sectors = await getSectors();
  const intraday = await getIntraday(sectors);

  cacheSectors = sectors;
  cacheIntraday = intraday;
  cacheTime = Date.now();

  return { sectors, intraday };
}
