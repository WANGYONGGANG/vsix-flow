// 个股日度资金流（最近 N 日主力/散户/中单/大单/超大单净流入）
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from './_shared/response';
import { httpGetJson, stripJsonp, httpsGetText } from './_shared/http';

function secidOf(code: string): string {
  const c = String(code).replace(/^(sh|sz|bj)/i, '');
  const low = String(code).toLowerCase();
  if (low.startsWith('sh')) return `1.${c}`;
  if (low.startsWith('bj')) return `0.${c}`;
  if (low.startsWith('sz')) return `0.${c}`;
  if (/^(60|68|90|11|13|50|56|51|58)/.test(c)) return `1.${c}`;
  return `0.${c}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  const code = getQuery(req, 'code');
  const lmt = Math.max(1, Math.min(120, parseInt(getQuery(req, 'lmt', '30')) || 30));
  if (!code) { json(res, 200, { data: { list: [] } }); return; }

  const secid = secidOf(code);
  const fields1 = 'f1,f2,f3,f7';
  const fields2 = 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65';
  const url = `https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get?lmt=${lmt}&klt=101&secid=${secid}&fields1=${fields1}&fields2=${fields2}&ut=b2884a393a59ad64002292a3e90d46a5`;
  const r = await httpGetJson(url, 'https://data.eastmoney.com/');

  const klines: string[] = r?.data?.klines || [];
  const list = klines.map((row: string) => {
    const p = row.split(',');
    return {
      date: p[0] || '',
      close: parseFloat(p[1]) || 0,
      pct: parseFloat(p[2]) || 0,
      main: parseFloat(p[3]) || 0,
      mainRatio: parseFloat(p[4]) || 0,
      super: parseFloat(p[5]) || 0,
      superRatio: parseFloat(p[6]) || 0,
      big: parseFloat(p[7]) || 0,
      bigRatio: parseFloat(p[8]) || 0,
      mid: parseFloat(p[9]) || 0,
      midRatio: parseFloat(p[10]) || 0,
      small: parseFloat(p[11]) || 0,
      smallRatio: parseFloat(p[12]) || 0,
      // 兼容 deep.flow 使用字段
      main_amount: parseFloat(p[3]) || 0,
    };
  });
  json(res, 200, { data: { list } });
}
