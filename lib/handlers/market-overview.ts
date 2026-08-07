// 市场概况：7大指数（上证/深证/创业板/上证50/科创50/沪深300/中证500）
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions } from '../shared/response';
import { httpsGetText, toTencentCode, tencentTextToDiff } from '../shared/http';

const MARKET_INDEX_CODES = 'sh000001,sz399001,sz399006,sh000016,sh000688,sh000300,sz399005';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  const codes = MARKET_INDEX_CODES.split(',').filter(Boolean).map(toTencentCode).join(',');
  const text = await httpsGetText(`https://qt.gtimg.cn/q=${codes}`, 'https://finance.qq.com/');
  const diff = tencentTextToDiff(text);
  json(res, 200, { data: { diff } });
}
