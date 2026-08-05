// 股票代码/名称搜索（东方财富 suggest）
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from './_shared/response';
import { httpGetJson, stripJsonp, httpsGetText } from './_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  const kw = decodeURIComponent(getQuery(req, 'kw')).trim();
  if (!kw) { json(res, 200, { data: { list: [] } }); return; }

  const token = 'D43BF722C8E33BDC906FB84D85E326E8';
  const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(kw)}&type=14&token=${token}`;
  const r = await httpGetJson(url, 'https://quote.eastmoney.com/');

  const arr: any[] = r?.QuotationCodeTable?.Data || [];
  const list = arr.map((d: any) => {
    const code = d.Code || '';
    let mkt = d.MarketinGbk; // 1=沪, 0=深, 9=北
    let prefix = 'sh';
    if (mkt === 0) prefix = 'sz';
    else if (mkt === 9) prefix = 'bj';
    else if (/^(60|68|90|11|13|50|56|51|58)/.test(code)) prefix = 'sh';
    else if (/^(00|30|20|12|15|16|18|159)/.test(code)) prefix = 'sz';
    else if (/^(43|83|87|92|88)/.test(code)) prefix = 'bj';
    return {
      code: prefix + code,
      display_code: code,
      name: d.Name || '',
      market: d.Market || mkt,
      type: d.Indicator || d.SecurityTypeName || '',
    };
  }).filter((x: any) => x.code && x.name);

  json(res, 200, { data: { list } });
}
