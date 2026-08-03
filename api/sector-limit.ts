// 板块排行 / 东方财富板块资金
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions } from '../_shared/response';
import { httpGetJson } from '../_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const r = await httpGetJson(
    'https://data.eastmoney.com/dataapi/bkzj/getbkzj?key=f174&code=m%3A90%2Bt%3A2',
    'https://data.eastmoney.com/'
  );
  const list = r?.data?.diff || [];
  const diff = list.map((d: any) => ({
    f12: d.f12, f14: d.f14, f2: d.f2 || 0, f3: d.f3 || 0,
    f20: d.f20 || 0, f62: d.f62 || 0, f104: d.f104 || 0, f105: d.f105 || 0,
    f174: d.f174 || 0,
  }));
  json(res, 200, { data: { diff } });
}
