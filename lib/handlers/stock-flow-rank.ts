// 个股资金流排名（按主力净流入排序）- 选股报告阶段一数据源
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from '../shared/response';
import { httpGetJson } from '../shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  const pz = Math.max(1, Math.min(400, parseInt(getQuery(req, 'pz', '100')) || 100));

  // 沪深京A股：fs 覆盖主板/创业板/科创板/北交所
  const fs = 'm:0+t:6+f:!2,m:0+t:13+f:!2,m:0+t:80+f:!2,m:1+t:2+f:!2,m:1+t:23+f:!2,m:0+t:7+f:!2,m:1+t:3+f:!2';
  const fields = 'f2,f3,f4,f5,f6,f8,f9,f10,f12,f14,f15,f16,f17,f18,f20,f23,f62,f66,f72,f100,f124,f115,f128,f140,f141,f136,f152';
  const ut = 'fa5fd1943c7b386f172d6893dbfba10b';

  const r = await httpGetJson(
    `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=${pz}&po=1&np=1&fltt=2&invt=2&fid=f62&fs=${encodeURIComponent(fs)}&fields=${fields}&ut=${ut}`,
    'https://data.eastmoney.com/'
  );
  let diff: any[] = r?.data?.diff || [];

  // ===== Fallback：新浪 ssl_bkzj_ssggzj 实时个股资金流排名（真实单笔成交分类统计，非估算）=====
  if (!diff.length) {
    const sina = await httpGetJson(
      `https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/MoneyFlow.ssl_bkzj_ssggzj?page=1&num=${pz}&sort=netamount&asc=0`,
      'https://finance.sina.com.cn/'
    );
    const arr: any[] = Array.isArray(sina) ? sina : [];
    for (const d of arr) {
      const symbol = String(d.symbol || '').toLowerCase();
      const m = symbol.match(/^(sh|sz|bj)(\d{6})/);
      if (!m) continue;
      const prefix = m[1].toUpperCase();
      const clean = m[2];
      const net = Number(d.netamount || 0);
      diff.push({
        f12: clean,
        f14: String(d.name || ''),
        f2: Number(d.trade || 0),
        f3: Number(d.changeratio || 0) * 100,
        f6: Number(d.amount || 0),
        f8: Number(d.turnover || 0),
        f62: net,                                         // 净流入（真实）
        f66: Number(d.r0_net || 0),                       // 主力净流入（真实，r0_net）
        f72: Number(d.r0_ratio || 0) * 100,               // 主力净占比
        f124: prefix,
        // 新浪没有返回值的字段留空，不做任何估算
        f4: null, f5: null, f9: null, f10: null,
        f15: null, f16: null, f17: null, f18: null,
        f20: null, f23: null, f100: null,
        f115: null, f128: null, f136: null, f140: null, f141: null, f152: null,
      });
    }
    diff.sort((a, b) => (Number(b.f62) || 0) - (Number(a.f62) || 0));
    diff = diff.slice(0, pz);
  }

  // ===== 去重：无论走 push2 还是 fallback，都按 f12 留第一条（避免接口/候选池重复）=====
  {
    const seen = new Set<string>(); const out: any[] = [];
    for (const d of diff) {
      const k = String(d.f12 || '').toLowerCase();
      if (!k || seen.has(k)) continue;
      seen.add(k); out.push(d);
    }
    diff = out;
  }
  json(res, 200, { data: { diff } });
}
