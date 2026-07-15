export interface SectorMeta {
  id: string;
  name: string;
  color: string;
}

export interface IntradayPoint {
  time: string;
  sectors: Record<string, number>;
}

export interface IDataProvider {
  name: string;
  getSectors(): Promise<SectorMeta[]>;
  getIntraday(): Promise<IntradayPoint[]>;
}
