// 市场概况详情：三市成交额、昨日涨停表现、涨跌分布
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions } from './_shared/response';
import { httpsGetText, httpGetJson, toTencentCode, tencentTextToDiff } from './_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  // 1) 三市成交额：上证+深证+创业板（腾讯指数 f6 = 成交额，单位元）
  let shAmt = 0, szAmt = 0, cybAmt = 0;
  try {
    const idxText = await httpsGetText('https://qt.gtimg.cn/q=sh000001,sz399001,sz399006', 'https://finance.qq.com/');
    tencentTextToDiff(idxText).forEach((row) => {
      const amt = Number(row?.f6) || 0;
      if (row?.f12 === '000001') shAmt = amt;
      else if (row?.f12 === '399001') szAmt = amt;
      else if (row?.f12 === '399006') cybAmt = amt;
    });
  } catch { /* empty */ }
  // 创业板是深市子集，不重复计入 total，仅作展示
  const totalTrade = shAmt + szAmt;

  // 1.5) 昨日同期成交额 + 量比（缩量/放量）
  // 取最近一个非周末交易日，用腾讯 day/query 分时数据取昨日同刻累计额
  let yesterdayTrade = 0;
  let volumeRatio = 0;
  try {
    const lastT = new Date();
    do { lastT.setDate(lastT.getDate() - 1); } while (lastT.getDay() === 0 || lastT.getDay() === 6);
    const ymd = `${lastT.getFullYear()}${String(lastT.getMonth() + 1).padStart(2, '0')}${String(lastT.getDate()).padStart(2, '0')}`;
    const now2 = new Date();
    const curMin = now2.getHours() * 60 + now2.getMinutes();
    for (const tc of ['sh000001', 'sz399001']) {
      const qText = await httpsGetText(`https://web.ifzq.gtimg.cn/appstock/app/day/query?code=${tc}`, 'https://gu.qq.com/');
      if (!qText) continue;
      try {
        const qJ = JSON.parse(qText);
        const days = qJ?.data?.[tc]?.data || [];
        for (const day of days) {
          if (day?.date !== ymd) continue;
          const rows: string[] = day?.data || [];
          if (!rows.length) break;
          let bestAmt = 0, lastAmt = 0;
          for (const line of rows) {
            const p = line.split(' ');
            const t = p[0] || '';
            const hm = (parseInt(t.slice(0, 2)) || 0) * 60 + (parseInt(t.slice(2, 4)) || 0);
            lastAmt = parseFloat(p[3]) || 0;
            if (hm <= curMin) bestAmt = lastAmt;
          }
          // 收盘后取全天额
          yesterdayTrade += bestAmt > 0 ? bestAmt : lastAmt;
          break;
        }
      } catch { /* empty */ }
    }
    if (yesterdayTrade > 0 && totalTrade > 0) volumeRatio = totalTrade / yesterdayTrade;
  } catch { /* empty */ }

  // 2) 涨跌分布：东财官方分布接口（push2ex，不受 push2 镜像分页限制）
  // fenbu 为 [{"1":950},{"-2":358}...] 形式：键=涨跌百分比档，11=涨停，-11=跌停
  let upCount = 0, downCount = 0, flatCount = 0;
  let dist = { zt: 0, g5: 0, g1: 0, g0: 0, flat: 0, d0: 0, d1: 0, d5: 0, dt: 0 };
  try {
    const r3 = await httpGetJson('https://push2ex.eastmoney.com/getTopicZDFenBu?ut=7eea3edcaed734bea9cbfc24409ed989&dpt=wz.ztzt', 'https://quote.eastmoney.com/ztb/detail.html');
    const fb: Record<string, number> = {};
    (r3?.data?.fenbu || []).forEach((o: any) => {
      const k = Object.keys(o || {})[0];
      if (k !== undefined) fb[k] = Number((o as any)[k]) || 0;
    });
    const sumRange = (a: number, b: number) => { let s = 0; for (let k = a; k <= b; k++) s += fb[String(k)] || 0; return s; };
    dist.zt = fb['11'] || 0; dist.g5 = sumRange(6, 10); dist.g1 = sumRange(2, 5); dist.g0 = fb['1'] || 0;
    dist.flat = fb['0'] || 0;
    dist.d0 = fb['-1'] || 0; dist.d1 = sumRange(-5, -2); dist.d5 = sumRange(-10, -6); dist.dt = fb['-11'] || 0;
    upCount = dist.zt + dist.g5 + dist.g1 + dist.g0;
    downCount = dist.d5 + dist.d1 + dist.d0 + dist.dt;
    flatCount = dist.flat;
  } catch { /* empty */ }

  // 2.5) 主力净流入：上证+深证指数级主力净额（push2，自动切镜像）
  let mainInflow = 0;
  try {
    const r4 = await httpGetJson('https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&ut=b2884a393a59ad64002292a3e90d46a5&secids=1.000001,0.399001&fields=f12,f62', 'https://quote.eastmoney.com/');
    (r4?.data?.diff || []).forEach((row: any) => { mainInflow += Number(row?.f62) || 0; });
  } catch { /* empty */ }

  // 3) 昨日涨停表现（取最近一个交易日，跳过周末）
  let ztCount = 0, ztUpCount = 0, ztAvgChange = 0;
  try {
    const yd = new Date();
    do { yd.setDate(yd.getDate() - 1); } while (yd.getDay() === 0 || yd.getDay() === 6);
    const yesterday = `${yd.getFullYear()}${String(yd.getMonth() + 1).padStart(2, '0')}${String(yd.getDate()).padStart(2, '0')}`;
    const ut = '7eea3edcaed734bea9cbfc24409ed989';
    const r2 = await httpGetJson(
      `https://push2ex.eastmoney.com/getTopicZTPool?ut=${ut}&dpt=wz.ztzt&Pageindex=0&pagesize=200&sort=fbt%3Aasc&date=${yesterday}`,
      'https://quote.eastmoney.com/ztb/detail.html'
    );
    const ztPool = r2?.data?.pool || [];
    ztCount = ztPool.length;
    if (ztPool.length > 0) {
      const ztCodes = ztPool.slice(0, 30).map((x: any) => toTencentCode(x.c || '')).join(',');
      if (ztCodes) {
        const ztText = await httpsGetText(`https://qt.gtimg.cn/q=${ztCodes}`, 'https://finance.qq.com/');
        let sumChange = 0, validCount = 0;
        tencentTextToDiff(ztText).forEach((row) => {
          const change = Number(row?.f3) || 0;
          sumChange += change; validCount++;
          if (change > 0) ztUpCount++;
        });
        if (validCount > 0) ztAvgChange = sumChange / validCount;
      }
    }
  } catch { /* empty */ }

  json(res, 200, {
    data: {
      counts: { up: upCount, down: downCount, flat: flatCount, zt: dist.zt, dt: dist.dt },
      distribution: dist,
      trade: { sh: shAmt, sz: szAmt, cyb: cybAmt, total: totalTrade, yesterdayTotal: yesterdayTrade, volumeRatio, mainInflow },
      yesterdayZt: { count: ztCount, upCount: ztUpCount, avgChange: ztAvgChange },
    }
  });
}
