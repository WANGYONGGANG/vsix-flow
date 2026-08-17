// K 线：日 / 周 / 月 / 5m / 15m / 30m / 60m
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from './_shared/response';
import { httpsGetText, httpGetJson, toSinaCode, toTencentCode, stripJsonp } from './_shared/http';

const PERIOD_MAP: Record<string, string> = { 'day': '101', 'week': '102', 'month': '103', '5m': '5', '15m': '15', '30m': '30', '60m': '60' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const code = getQuery(req, 'code', 'sh000001');
  const period = getQuery(req, 'period', 'day');

  // 期货 K线：用东财 push2his kline API（secid=113）
  if (code.toLowerCase().startsWith('f_')) {
    const futuresCode = code.replace(/^f_/i, '');
    const secid = `113.${futuresCode}`;
    const klt = PERIOD_MAP[period] || '101';
    const limit = Number(getQuery(req, 'limit') || 320) || 320;
    const r = await httpsGetText(
      `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58&klt=${klt}&fqt=0&end=20500101&lmt=${limit}`,
      'https://quote.eastmoney.com/'
    );
    const data = stripJsonp(r);
    const klines: string[] = data?.data?.klines || [];
    // 东财格式：日期,开盘,收盘,最高,最低,成交量,成交额,振幅 → 转为 日期,开盘,收盘,最高,最低,成交量
    const rows: string[] = klines.map((k: string) => {
      const p = k.split(',');
      return `${p[0] || ''},${p[1] || 0},${p[2] || 0},${p[3] || 0},${p[4] || 0},${p[5] || 0}`;
    });
    json(res, 200, { data: { klines: rows } });
    return;
  }

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
