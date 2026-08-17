// 分时图（支持单日/五日，含分钟量能与派生逐笔）
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
  const days = parseInt(getQuery(req, 'days', '1')) || 1;

  // 期货分时：用东财 push2his trend2 API（secid=113）
  if (rawCode.toLowerCase().startsWith('f_')) {
    const futuresCode = rawCode.replace(/^f_/i, '');
    const secid = `113.${futuresCode}`;
    const r = await httpsGetText(
      `https://push2his.eastmoney.com/api/qt/stock/trend2/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58&iscr=0&ndays=1`,
      'https://quote.eastmoney.com/'
    );
    const data = stripJsonp(r);
    const trends: string[] = data?.data?.trends || [];
    // 东财格式："2025-08-17 09:31,710.0,709.0,710.0,708.0,10,1234.0,..."
    // 转为 "HHMM,price,vol"
    let prevVol = 0;
    const minutes: string[] = trends.map((t: string) => {
      const p = t.split(',');
      const dt = (p[0] || '').split(' ');
      const hhmm = dt[1] ? dt[1].replace(':', '') : '0000';
      const price = p[2] || '0';
      const cum = parseInt(p[5] || '0') || 0;
      const vol = Math.max(0, cum - prevVol);
      prevVol = cum;
      return `${hhmm},${price},${vol}`;
    });
    const preClose = data?.data?.preClose || 0;
    json(res, 200, { data: { minutes, preClose, ticks: deriveTicks(minutes, preClose) } });
    return;
  }

  const code = toTencentCode(rawCode);

  if (days > 1) {
    // 五日分时：data[code].data = [{date, data:[...]}, ...]
    const r = await httpGetJson(`https://web.ifzq.gtimg.cn/appstock/app/day/query?code=${code}`);
    const arr: any[] = r?.data?.[code]?.data || [];
    const qt = r?.data?.[code]?.qt?.[code] || {};
    const dayList = arr.slice(-days).map((d: any) => ({
      date: String(d.date || ''),
      minutes: parseMinuteRows(d.data || []),
    }));
    json(res, 200, { data: { days: dayList, preClose: qt[4] || 0 } });
    return;
  }

  const r = await httpGetJson(`https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=${code}`);
  const mdata = r?.data?.[code]?.data?.data || [];
  const rows = parseMinuteRows(mdata);
  const qt = r?.data?.[code]?.qt?.[code] || {};
  const preClose = parseFloat(qt[4]) || 0;
  json(res, 200, { data: { minutes: rows, preClose, ticks: deriveTicks(rows, preClose) } });
}
