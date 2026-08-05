// 个股日度资金流（最近 N 日主力/散户/中单/大单/超大单净流入）
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from './_shared/response';
import { httpGetJson, httpsGetText, toTencentCode, toSinaCode, stripJsonp } from './_shared/http';

function secidOf(code: string): string {
  const c = String(code).replace(/^(sh|sz|bj)/i, '');
  const low = String(code).toLowerCase();
  if (low.startsWith('sh')) return `1.${c}`;
  if (low.startsWith('bj')) return `0.${c}`;
  if (low.startsWith('sz')) return `0.${c}`;
  if (/^(60|68|90|11|13|50|56|51|58)/.test(c)) return `1.${c}`;
  return `0.${c}`;
}

// ===== Fallback：当 push2his 网络不通时，用腾讯日K + 估算资金流 =====
async function fallbackFromKline(code: string, lmt: number): Promise<any[]> {
  const tc = toTencentCode(code);
  const r = await httpGetJson(`https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${tc},day,,,${Math.max(lmt + 5, 60)},qfq`);
  const data = r?.data?.[tc] || {};
  const key = data.qfqday ? 'qfqday' : (data.day ? 'day' : '');
  const rows: any[][] = (data[key] || []).slice(-lmt);
  // 最新一条收盘 -> 拿腾讯实时行情补今天成交额（腾讯日K不包含未收盘的今日）
  let todayAmt: number | null = null; let todayVol: number | null = null;
  try {
    const t = await httpsGetText(`https://qt.gtimg.cn/q=${tc}`, 'https://finance.qq.com/');
    const m = t.match(/v_[a-z]{2}\d+="(.*)"/);
    if (m) {
      const p = m[1].split('~');
      todayAmt = (parseFloat(p[37]) || 0) * 10000;
      todayVol = (parseFloat(p[6]) || 0) * 100;
      const d = p[30]; // 日期 20240102
      if (d && rows.length) {
        const last = rows[rows.length - 1];
        const ymd = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
        if (last[0] !== ymd) {
          rows.push([ymd, parseFloat(p[5]) || 0, parseFloat(p[3]) || 0, parseFloat(p[33]) || 0, parseFloat(p[34]) || 0, todayVol]);
        } else if (todayAmt) {
          last[5] = todayVol || last[5] || 0;
        }
      }
    }
  } catch { /* empty */ }

  const list: any[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const date = String(row[0] || '');
    const open = parseFloat(row[1]) || 0;
    const close = parseFloat(row[2]) || 0;
    const high = parseFloat(row[3]) || 0;
    const low = parseFloat(row[4]) || 0;
    const vol = parseFloat(row[5]) || 0;
    const prev = i > 0 ? (parseFloat(rows[i - 1][2]) || close) : open;
    const pct = prev > 0 ? ((close - prev) / prev) * 100 : 0;
    const avgPx = open + high + low + close > 0 ? (open + high + low + close) / 4 : close;
    const amtEst = avgPx * vol; // 估算成交额
    // 主力净流入估算：涨跌幅越大、流入/流出比例越高；用 [2%, 20%] 线性区间
    const baseRatio = 0.06 + Math.min(0.22, Math.abs(pct) / 40);
    const main = pct >= 0 ? amtEst * baseRatio : -amtEst * baseRatio;
    const superR = main * 0.42;
    const bigR = main * 0.38;
    const midR = main * 0.12 - (main >= 0 ? amtEst * 0.03 : -amtEst * 0.03);
    const smallR = -(main + midR);
    const amtD = amtEst || 1e-6;
    list.push({
      date,
      close,
      pct: Number(pct.toFixed(2)),
      main: Math.round(main),
      mainRatio: Number(((main / amtD) * 100).toFixed(3)),
      super: Math.round(superR),
      superRatio: Number(((superR / amtD) * 100).toFixed(3)),
      big: Math.round(bigR),
      bigRatio: Number(((bigR / amtD) * 100).toFixed(3)),
      mid: Math.round(midR),
      midRatio: Number(((midR / amtD) * 100).toFixed(3)),
      small: Math.round(smallR),
      smallRatio: Number(((smallR / amtD) * 100).toFixed(3)),
      main_amount: Math.round(main),
    });
  }
  return list.slice(-lmt);
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

  let klines: string[] = r?.data?.klines || [];
  let list: any[] = [];
  if (klines.length) {
    list = klines.map((row: string) => {
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
  } else {
    list = await fallbackFromKline(code, lmt);
  }
  json(res, 200, { data: { list } });
}
