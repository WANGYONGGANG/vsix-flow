export interface IntradayPoint {
  time: string;
  sectors: Record<string, number>;
}

export interface HistoricalPoint {
  date: string;
  sectors: Record<string, number>;
}

export interface SectorMeta {
  id: string;
  name: string;
  color: string;
}

export type TimeRange = 'intraday' | 'history';

export interface FundData {
  sectors: SectorMeta[];
  intraday: IntradayPoint[];
  historical: HistoricalPoint[];
}
