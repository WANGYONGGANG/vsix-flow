// /api/all-stocks?market=a|cy|kc|bj
// 从东方财富 push2 获取指定市场股票列表
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from './_shared/response';
import { httpGetJson, toCleanCode } from './_shared/http';

const MARKET_FS: Record<string, string> = {
  a: 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048',
  cy: 'm:0+t:80',
  kc: 'm:1+t:23',
  bj: 'm:0+t:81+s:2048',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const market = getQuery(req, 'market', 'a');
  const fs = MARKET_FS[market] || MARKET_FS.a;
  const ut = 'bd1d9ddb04089700cf9c27f6f7426281';
  const url = `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=200&po=1&np=1&ut=${ut}&fltt=2&invt=2&wbp2u=|0|0|0|web&fid=f3&fs=${encodeURIComponent(fs)}&fields=f12,f14,f2,f3,f4,f5,f6,f8,f15,f16,f17,f18`;
  const r = await httpGetJson(url, 'https://quote.eastmoney.com/center/gridlist.html');
  const list: any[] = r?.data?.diff || [];
  json(res, 200, {
    data: {
      diff: list.map((x: any) => ({
        f12: toCleanCode(String(x.f12 || '')),
        f14: x.f14,
        f2: Number(x.f2) || 0,
        f3: Number(x.f3) || 0,
        f4: Number(x.f4) || 0,
        f5: Number(x.f5) || 0,
        f6: Number(x.f6) || 0,
        f8: Number(x.f8) || 0,
        f15: Number(x.f15) || 0,
        f16: Number(x.f16) || 0,
        f17: Number(x.f17) || 0,
        f18: Number(x.f18) || 0,
      })),
    },
  });
}
