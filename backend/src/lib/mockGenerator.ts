import type { SectorMeta, IntradayPoint, HistoricalPoint } from '../../../h5/src/types/index.js';

const DEFAULT_SECTORS = [
  '商业航天', '创新药', '机器人概念', '液冷设备', 'AI营销',
  '白酒', '黄金', '有色金属', '房地产', '化工',
  '光模块', '证券', '银行', '锂矿电池', '玻璃基板',
  '面板', '存储',
];

const COLORS = [
  '#7B1FA2', '#E65100', '#1565C0', '#F9A825', '#C2185B',
  '#00897B', '#D32F2F', '#303F9F', '#689F38', '#5D4037',
  '#455A64', '#AFB42B', '#0097A7', '#FF5722', '#607D8B',
  '#8E24AA', '#1976D2', '#F57C00', '#388E3C', '#AD1457',
];

let sectorIdCounter = 0;

export function createDefaultSectors(): SectorMeta[] {
  return DEFAULT_SECTORS.map((name, i) => ({
    id: `sector_${i}`,
    name,
    color: COLORS[i % COLORS.length],
  }));
}

export function generateSectorId(): string {
  return `sector_${Date.now()}_${sectorIdCounter++}`;
}

export function getColor(index: number): string {
  return COLORS[index % COLORS.length];
}

function generateIntraday(sectors: SectorMeta[]): IntradayPoint[] {
  const times: string[] = [];
  for (let h = 9; h <= 15; h++) {
    for (let m = 0; m < 60; m += 5) {
      if (h === 9 && m < 30) continue;
      if (h === 11 && m > 30) continue;
      if (h === 12) continue;
      if (h === 15 && m > 0) break;
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }

  const points: IntradayPoint[] = [];
  const current: Record<string, number> = {};
  sectors.forEach((s) => {
    current[s.name] = (Math.random() - 0.5) * 4;
  });

  for (const time of times) {
    const pt: Record<string, number> = {};
    sectors.forEach((s) => {
      const drift = (Math.random() - 0.5) * 3;
      current[s.name] += drift;
      if (Math.random() > 0.95) {
        current[s.name] += (Math.random() - 0.5) * 20;
      }
      pt[s.name] = parseFloat(current[s.name].toFixed(2));
    });
    points.push({ time, sectors: pt });
  }

  const last = points[points.length - 1];
  if (last) {
    const sorted = Object.entries(last.sectors).sort((a, b) => b[1] - a[1]);
    if (sorted[0]) last.sectors[sorted[0][0]] = 71.73;
    if (sorted[1]) last.sectors[sorted[1][0]] = 29.5;
    if (sorted[2]) last.sectors[sorted[2][0]] = 24.74;
    if (sorted[3]) last.sectors[sorted[3][0]] = 21.27;
  }

  return points;
}

function generateHistorical(sectors: SectorMeta[], days = 45): HistoricalPoint[] {
  const points: HistoricalPoint[] = [];
  const today = new Date();
  const currents: Record<string, number> = {};
  sectors.forEach((s) => {
    currents[s.name] = (Math.random() - 0.5) * 20;
  });

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const pt: Record<string, number> = {};
    sectors.forEach((s) => {
      currents[s.name] += (Math.random() - 0.5) * 15;
      if (Math.random() > 0.9) {
        currents[s.name] += (Math.random() - 0.5) * 40;
      }
      pt[s.name] = parseFloat(currents[s.name].toFixed(2));
    });
    points.push({ date: dateStr, sectors: pt });
  }
  return points;
}

export const mockStore = {
  sectors: createDefaultSectors(),
  getIntraday: () => generateIntraday(mockStore.sectors),
  getHistorical: (days?: number) => generateHistorical(mockStore.sectors, days),
  addSector: (name: string): SectorMeta => {
    const s: SectorMeta = {
      id: generateSectorId(),
      name,
      color: getColor(mockStore.sectors.length),
    };
    mockStore.sectors.push(s);
    return s;
  },
  removeSector: (id: string) => {
    mockStore.sectors = mockStore.sectors.filter((s) => s.id !== id);
  },
};