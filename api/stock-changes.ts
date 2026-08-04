// 异动
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions } from './_shared/response';
import { httpGetJson } from './_shared/http';

const TYPES = '8201,8202,8193,4,32,64,8207,8209,8211,8213,8215,8204,8203,8194,8,16,128,8208,8210,8212,8214,8216';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const ut = '7eea3edcaed734bea9cbfc24409ed989';
  const r = await httpGetJson(
    `http://push2ex.eastmoney.com/getAllStockChanges?type=${TYPES}&pageindex=0&pagesize=100&ut=${ut}&dpt=wzchanges`,
    'https://quote.eastmoney.com/'
  );
  json(res, 200, { data: { list: r?.data?.allstock || [] } });
}
