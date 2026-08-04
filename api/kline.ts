// K 线：日 / 周 / 月 / 5m / 15m / 30m / 60m
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from '../_shared/response';
import { httpsGetText, httpGetJson, toSinaCode, toTencentCode, stripJsonp } from '../_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const code = getQuery(req, 'code', 'sh000001');
  const period = getQuery(req, 'period', 'day');

  if (['5m', '15m', '30m', '60m'].includes(period)) {
    const sinaCode = toSinaCode(code);
    const scale = period.replace('m', '');
    const r = await httpsGetText(
      `https://quotes.sina.cn/cn/api/jsonp_v2.php/=/CN_MarketDataService.getKLineData?symbol=${sinaCode}&scale=${scale}&ma=no&datalen=320`,
      'https://finance.sina.com.cn/'
    );
    const list = Array.isArray(stripJsonp(r)) ? stripJsonp(r) : [];
    const rows: string[] = list.map((d: any) => `${d.day || ''},${d.open || 0},${d.close || 0},${d.high || 0},${d.low || 0},${d.volume || 0}`);
    json(res, 200, { data: { klines: rows } });
    return;
  }

  // Day / Week / Month - 腾讯前复权
  const tcCode = toTencentCode(code);
  const fq = getQuery(req, 'fq', 'qfq');
  const limit = Number(getQuery(req, 'limit') || 320) || 320;
  const r = await httpGetJson(`https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${tcCode},${period},,,${limit},${fq}`);
  const data = r?.data?.[tcCode] || {};
  const key = data[`${fq}${period}`] ? `${fq}${period}` : (data[period] ? period : '');
  const rows: string[] = (data[key] || []).map((row: any[]) => `${row[0]},${row[1]},${row[2]},${row[3]},${row[4]},${row[5] || 0}`);
  json(res, 200, { data: { klines: rows } });
}
