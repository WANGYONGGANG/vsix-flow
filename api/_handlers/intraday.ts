// 分时图（单日，含分钟量能与派生逐笔）
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from './_shared/response';
import { httpGetJson, httpsGetText, stripJsonp, toTencentCode } from './_shared/http';

// "0930 1325.00 984 130380000.00" -> "0930,1325.00,984"（第3列为累计量，差分为当分钟量）
function parseMinuteRows(mdata: any[]): string[] {
  let prevVol = 0;
  return (mdata || []).map((d: any) => {
    const parts = String(d).split(' ');
    if (parts.length < 3) return String(d);
    const cum = parseInt(parts[2]) || 0;
    const vol = Math.max(0, cum - prevVol);
    prevVol = cum;
    return `${parts[0]},${parts[1]},${vol}`;
  });
}

// 由分钟量差分派生逐笔（时间/价格/量/方向）
function deriveTicks(minutes: string[], preClose: number): any[] {
  const ticks: any[] = [];
  let prevPrice = preClose || 0;
  for (const m of minutes) {
    const p = m.split(',');
    if (p.length < 3) continue;
    const price = parseFloat(p[1]);
    const vol = parseInt(p[2]) || 0;
    if (!isFinite(price) || vol <= 0) continue;
    const tm = p[0].length === 4 ? p[0] : p[0].slice(-4);
    ticks.push({ time: tm, price, vol, bs: price >= (prevPrice || price) ? 1 : -1 });
    prevPrice = price;
  }
  return ticks;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const rawCode = getQuery(req, 'code', 'sh000001');

  // 期货分时：用 push2delay klt=1（1分钟K线）替代 trend2（trend2 对期货返回空）
  if (rawCode.toLowerCase().startsWith('f_')) {
    const futuresCode = rawCode.replace(/^f_/i, '');
    const secid = `113.${futuresCode}`;
    const r = await httpsGetText(
      `https://push2delay.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58&klt=1&fqt=0&end=20500101&lmt=300`,
      'https://quote.eastmoney.com/'
    );
    const data = stripJsonp(r);
    const klines: string[] = data?.data?.klines || [];
    // 东财 1分钟格式: "2026-08-17 21:01,952.40,953.08,953.12,951.74,2587,2464005900.00,0.14"
    // 转为 "HHMM,price,vol"
    let prevVol = 0;
    const minutes: string[] = klines.map((k: string) => {
      const p = k.split(',');
      const dt = (p[0] || '').split(' ');
      const hhmm = dt[1] ? dt[1].replace(':', '') : '0000';
      const price = p[2] || '0'; // 收盘价作为分钟价
      const cum = parseInt(p[5] || '0') || 0;
      const vol = Math.max(0, cum - prevVol);
      prevVol = cum;
      return `${hhmm},${price},${vol}`;
    });
    const preClose = data?.data?.preClose || data?.data?.preKPrice || 0;
    json(res, 200, { data: { minutes, preClose, ticks: deriveTicks(minutes, preClose) } });
    return;
  }

  const code = toTencentCode(rawCode);

  const r = await httpGetJson(`https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=${code}`);
  const mdata = r?.data?.[code]?.data?.data || [];
  const rows = parseMinuteRows(mdata);
  const qt = r?.data?.[code]?.qt?.[code] || {};
  const preClose = parseFloat(qt[4]) || 0;
  json(res, 200, { data: { minutes: rows, preClose, ticks: deriveTicks(rows, preClose) } });
}
