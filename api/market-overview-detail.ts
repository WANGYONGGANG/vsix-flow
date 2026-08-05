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

  // 2) 涨跌家数 + 涨跌分布：东方财富 push2 全市场
  let upCount = 0, downCount = 0, flatCount = 0;
  let dist = { zt: 0, g5: 0, g1: 0, g0: 0, flat: 0, d0: 0, d1: 0, d5: 0, dt: 0 };
  try {
    const ut = 'bd1d9ddb04089700cf9c27f6f7426281';
    const url = `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=5000&po=1&np=1&ut=${ut}&fltt=2&invt=2&wbp2u=|0|0|0|web&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048&fields=f2,f3`;
    const r3 = await httpGetJson(url, 'https://quote.eastmoney.com/center/gridlist.html');
    const diff: any[] = r3?.data?.diff || [];
    diff.forEach((row) => {
      const chg = Number(row?.f3);
      if (!isFinite(chg) || Number(row?.f2) <= 0) return;
      if (chg > 0) { upCount++;
        if (chg >= 9.8) dist.zt++;
        else if (chg >= 5) dist.g5++;
        else if (chg >= 1) dist.g1++;
        else dist.g0++;
      } else if (chg < 0) { downCount++;
        if (chg <= -9.8) dist.dt++;
        else if (chg <= -5) dist.d5++;
        else if (chg <= -1) dist.d1++;
        else dist.d0++;
      } else { flatCount++; dist.flat++; }
    });
  } catch { /* empty */ }

  // 3) 昨日涨停表现
  let ztCount = 0, ztUpCount = 0, ztAvgChange = 0;
  try {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10).replace(/-/g, '');
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
      trade: { sh: shAmt, sz: szAmt, cyb: cybAmt, total: totalTrade, yesterdayTotal: yesterdayTrade, volumeRatio },
      yesterdayZt: { count: ztCount, upCount: ztUpCount, avgChange: ztAvgChange },
    }
  });
}
