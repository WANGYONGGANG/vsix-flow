// 板块资金流排名 - 选股报告阶段二数据源（行业 t=2 / 概念 t=1）
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from './_shared/response';
import { httpGetJson } from './_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  const t = parseInt(getQuery(req, 't', '2')) || 2; // 2=行业板块 1=概念板块
  const pz = Math.max(1, Math.min(100, parseInt(getQuery(req, 'pz', '30')) || 30));

  const fs = t === 1 ? 'm:90+t:3+f:!50' : 'm:90+t:2+f:!50';
  const fields = 'f2,f3,f4,f12,f14,f20,f62,f66,f104,f105,f204,f205';
  const ut = 'fa5fd1943c7b386f172d6893dbfba10b';

  const r = await httpGetJson(
    `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=${pz}&po=1&np=1&fltt=2&invt=2&fid=f62&fs=${encodeURIComponent(fs)}&fields=${fields}&ut=${ut}`,
    'https://data.eastmoney.com/'
  );
  const diff: any[] = r?.data?.diff || [];
  json(res, 200, { data: { diff } });
}
