// 市场概况详情：三市成交额、昨日涨停表现、涨跌分布
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions } from './_shared/response';
import { httpsGetText, httpGetJson, toTencentCode, tencentTextToDiff } from './_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  // 1) 三市成交额：上证+深证+创业板
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

  // 2) 涨跌家数：东方财富 push2his.eastmoney.com 全市场涨跌数
  let upCount = 0, downCount = 0, flatCount = 0;
  try {
    // fltt=2 全部A股，fields=f1,f2,f3,f4,f12,f14；分页拿第一页统计即可
    const ut = 'bd1d9ddb04089700cf9c27f6f7426281';
    const url = `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=5000&po=1&np=1&ut=${ut}&fltt=2&invt=2&wbp2u=|0|0|0|web&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048&fields=f2,f3`;
    const r3 = await httpGetJson(url, 'https://quote.eastmoney.com/center/gridlist.html');
    const diff: any[] = r3?.data?.diff || [];
    diff.forEach((row) => {
      const chg = Number(row?.f3);
      if (!isFinite(chg) || Number(row?.f2) <= 0) return;
      if (chg > 0) upCount++;
      else if (chg < 0) downCount++;
      else flatCount++;
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
      counts: { up: upCount, down: downCount, flat: flatCount },
      trade: { sh: shAmt, sz: szAmt, cyb: cybAmt, total: shAmt + szAmt + cybAmt },
      yesterdayZt: { count: ztCount, upCount: ztUpCount, avgChange: ztAvgChange },
    }
  });
}
