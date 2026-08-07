// 新浪板块资金流 - fenlei=0 行业 / 1 概念
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from '../shared/response';
import { httpsGetText } from '../shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const fenlei = getQuery(req, 'fenlei', '1');
  const txt = await httpsGetText(
    `https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/MoneyFlow.ssl_bkzj_bk?page=1&num=50&sort=netamount&asc=0&fenlei=${fenlei}`,
    'https://finance.sina.com.cn/'
  );
  try {
    json(res, 200, { data: { list: JSON.parse(txt) } });
  } catch {
    json(res, 200, { data: { list: [] } });
  }
}
