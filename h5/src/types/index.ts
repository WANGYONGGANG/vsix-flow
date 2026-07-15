export interface IntradayPoint {
  time: string;
  sectors: Record<string, number>;
}

export interface SectorMeta {
  id: string;
  name: string;
  color: string;
}

export interface FundData {
  sectors: SectorMeta[];
  intraday: IntradayPoint[];
}
