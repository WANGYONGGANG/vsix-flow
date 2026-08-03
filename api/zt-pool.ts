// 涨停池
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from '../_shared/response';
import { httpGetJson } from '../_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const date = getQuery(req, 'date');
  const d = date || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const ut = '7eea3edcaed734bea9cbfc24409ed989';
  const r = await httpGetJson(
    `https://push2ex.eastmoney.com/getTopicZTPool?ut=${ut}&dpt=wz.ztzt&Pageindex=0&pagesize=200&sort=fbt%3Aasc&date=${d}`,
    'https://quote.eastmoney.com/ztb/detail.html'
  );
  json(res, 200, { data: { pool: r?.data?.pool || [] } });
}
