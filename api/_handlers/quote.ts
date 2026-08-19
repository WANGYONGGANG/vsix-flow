// /api/quote & /api/market-overview 合并（同一段逻辑）
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from './_shared/response';
import { httpsGetText, httpGetJson, toTencentCode, tencentTextToDiff } from './_shared/http';

const MARKET_INDEX_CODES = 'sh000001,sz399001,sz399006,sh000016,sh000688,sh000300,sz399005';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const path = req.url?.split('?')[0] || '';
  const isOverview = path.includes('/api/market-overview') && !path.includes('detail');
  const rawCodes = isOverview ? MARKET_INDEX_CODES : getQuery(req, 'codes');

  const allCodes = rawCodes.split(',').filter(Boolean);
  const stockCodes: string[] = [];
  const futuresCodes: string[] = [];
  for (const c of allCodes) {
    if (c.toLowerCase().startsWith('f_')) {
      futuresCodes.push(c.replace(/^f_/i, ''));
    } else {
      stockCodes.push(c);
    }
  }

  const results: any[] = [];

  // 股票：腾讯API
  if (stockCodes.length) {
    const codes = stockCodes.map(toTencentCode).join(',');
    const text = await httpsGetText(`https://qt.gtimg.cn/q=${codes}`, 'https://finance.qq.com/');
    results.push(...tencentTextToDiff(text));
  }

  // 期货：东方财富 push2delay API（返回东财字段格式给 mapEmDiffToStockItem）
  for (const fc of futuresCodes) {
    try {
      const secid = `113.${fc}`;
      const r = await httpGetJson(`https://push2delay.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f44,f45,f46,f47,f48,f50,f51,f52,f55,f57,f58,f60,f170,f171&fltt=2&invt=2`, 'https://quote.eastmoney.com/');
      const d = r?.data || {};
      results.push({
        f2: d.f43 || 0,    // 最新价
        f3: d.f170 || 0,   // 涨跌幅
        f4: d.f171 || 0,   // 涨跌额
        f5: d.f47 || 0,    // 成交量
        f6: d.f48 || 0,    // 成交额
        f8: 0,             // 换手率
        f12: fc,           // 代码
        f14: d.f58 || fc,  // 名称
        f15: d.f44 || 0,   // 最高
        f16: d.f45 || 0,   // 最低
        f17: d.f46 || 0,   // 今开
        f18: d.f60 || 0,   // 昨收
        f7: 0, f9: 0, f20: 0, f21: 0, f23: 0, f127: '',
      });
    } catch {}
  }

  json(res, 200, { data: { diff: results } });
}
