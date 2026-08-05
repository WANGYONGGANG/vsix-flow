// 个股资金流排名（按主力净流入排序）- 选股报告阶段一数据源
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from './_shared/response';
import { httpGetJson } from './_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  const pz = Math.max(1, Math.min(200, parseInt(getQuery(req, 'pz', '100')) || 100));

  // 沪深京A股：fs 覆盖主板/创业板/科创板/北交所
  const fs = 'm:0+t:6+f:!2,m:0+t:13+f:!2,m:0+t:80+f:!2,m:1+t:2+f:!2,m:1+t:23+f:!2,m:0+t:7+f:!2,m:1+t:3+f:!2';
  const fields = 'f2,f3,f4,f5,f6,f8,f9,f10,f12,f14,f15,f16,f17,f18,f20,f23,f62,f66,f72,f100,f124,f115,f128,f140,f141,f136,f152';
  const ut = 'fa5fd1943c7b386f172d6893dbfba10b';

  const r = await httpGetJson(
    `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=${pz}&po=1&np=1&fltt=2&invt=2&fid=f62&fs=${encodeURIComponent(fs)}&fields=${fields}&ut=${ut}`,
    'https://data.eastmoney.com/'
  );
  const diff: any[] = r?.data?.diff || [];
  json(res, 200, { data: { diff } });
}
