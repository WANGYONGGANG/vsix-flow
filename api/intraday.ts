// 分时图
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from '../_shared/response';
import { httpGetJson, toTencentCode } from '../_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const code = toTencentCode(getQuery(req, 'code', 'sh000001'));
  const r = await httpGetJson(`https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=${code}`);
  const mdata = r?.data?.[code]?.data?.data || [];
  const rows: string[] = mdata.map((d: any) => {
    const parts = String(d).split(' ');
    return parts.length >= 2 ? `${parts[0]},${parts[1]}` : String(d);
  });
  const qt = r?.data?.[code]?.qt?.[code] || {};
  json(res, 200, { data: { minutes: rows, preClose: qt[4] || 0 } });
}
