// 快讯
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from '../_shared/response';
import { httpGetJson } from '../_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const page = getQuery(req, 'page', '1');
  const pageSize = getQuery(req, 'pageSize', '50');
  const r = await httpGetJson(`http://newsapi.eastmoney.com/kuaixun/v2/api/list?pageSize=${pageSize}&pageIndex=${page}`);
  json(res, 200, { data: { list: r?.news || [] } });
}
