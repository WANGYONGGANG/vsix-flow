// 个股日度资金流（最近 N 日主力/散户/中单/大单/超大单净流入）
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from './_shared/response';
import { httpGetJson, toSinaCode } from './_shared/http';

function secidOf(code: string): string {
  const c = String(code).replace(/^(sh|sz|bj)/i, '');
  const low = String(code).toLowerCase();
  if (low.startsWith('sh')) return `1.${c}`;
  if (low.startsWith('bj')) return `0.${c}`;
  if (low.startsWith('sz')) return `0.${c}`;
  if (/^(60|68|90|11|13|50|56|51|58)/.test(c)) return `1.${c}`;
  return `0.${c}`;
}

// 新浪 ssl_qsfx_lscjfb 返回真实的分类成交额 + 分类净流
//  r0 主力  r1 中单  r2 小单  r3 散单（新浪的字段定义就是 4 档）
// 新浪 ssl_qsfx_zjlrqs 返回汇总净流、净占比、主力占比（真实单笔统计）
// 不做任何比例/系数估算；缺失字段统一返回 null
async function fallbackFromSina(code: string, lmt: number): Promise<any[]> {
  const daima = toSinaCode(code); // sh600519
  if (!daima) return [];
  const base = 'https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/MoneyFlow';
  const [lscjfb, zjlrqs] = await Promise.all([
    httpGetJson(`${base}.ssl_qsfx_lscjfb?page=1&num=${lmt}&sort=opendate&asc=0&daima=${daima}`, 'https://finance.sina.com.cn/'),
    httpGetJson(`${base}.ssl_qsfx_zjlrqs?page=1&num=${lmt}&sort=opendate&asc=0&daima=${daima}`, 'https://finance.sina.com.cn/'),
  ]);
  const arr1: any[] = Array.isArray(lscjfb) ? lscjfb : [];
  const arr2: any[] = Array.isArray(zjlrqs) ? zjlrqs : [];
  const byDate = new Map<string, any>();
  for (const x of arr2) {
    const d = String(x.opendate || '');
    if (d) byDate.set(d, x);
  }
  const list: any[] = [];
  for (const row of arr1) {
    const date = String(row.opendate || '');
    if (!date) continue;
    const close = Number(row.trade || 0);
    const pct = Number(row.changeratio || 0) * 100;
    // 只使用真实返回的 4 档净流，不估算超大/大单比例
    const r0Net = Number(row.r0_net || 0);
    const r1Net = Number(row.r1_net || 0);
    const r2Net = Number(row.r2_net || 0);
    const r3Net = Number(row.r3_net || 0);
    const sum = byDate.get(date);
    list.push({
      date,
      close,
      pct: Number(pct.toFixed(2)),
      main: Math.round(r0Net),
      mainRatio: sum ? Number((Number(sum.r0_ratio || 0) * 100).toFixed(3)) : null,
      super: null,           // 新浪没单独提供超大单净流，不估算
      superRatio: null,
      big: null,             // 新浪没单独提供大单净流，不估算
      bigRatio: null,
      mid: Math.round(r1Net),
      midRatio: null,
      small: Math.round(r2Net + r3Net),
      smallRatio: null,
      main_amount: Math.round(r0Net),
    });
  }
  return list.slice(0, lmt);
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
        main_amount: parseFloat(p[3]) || 0,
      };
    });
  } else {
    list = await fallbackFromSina(code, lmt);
  }
  json(res, 200, { data: { list } });
}
