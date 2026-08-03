// /api/quote & /api/market-overview 合并（同一段逻辑）
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from '../_shared/response';
import { httpsGetText, toTencentCode, tencentTextToDiff } from '../_shared/http';

const MARKET_INDEX_CODES = 'sh000001,sz399001,sz399006,sh000016,sh000688,sh000300,sz399005';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const path = req.url?.split('?')[0] || '';
  const isOverview = path.includes('/api/market-overview') && !path.includes('detail');
  const rawCodes = isOverview ? MARKET_INDEX_CODES : getQuery(req, 'codes');
  const codes = rawCodes.split(',').filter(Boolean).map(toTencentCode).join(',');

  if (!codes) { json(res, 200, { data: { diff: [] } }); return; }

  const text = await httpsGetText(`https://qt.gtimg.cn/q=${codes}`, 'https://finance.qq.com/');
  const diff = tencentTextToDiff(text);
  json(res, 200, { data: { diff } });
}
