import type { FundData } from '@/types';
import { getAllData } from './eastmoney';

export const api = {
  getAll: async (): Promise<FundData> => {
    return getAllData();
  },
};
