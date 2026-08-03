// 市场概况详情：三市成交额、昨日涨停表现、涨跌分布
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions } from '../_shared/response';
import { httpsGetText, httpGetJson, toTencentCode, tencentTextToDiff } from '../_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

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
      counts: { up: 0, down: 0, flat: 0 },
      trade: { sh: shAmt, sz: szAmt, cyb: cybAmt, total: shAmt + szAmt + cybAmt },
      yesterdayZt: { count: ztCount, upCount: ztUpCount, avgChange: ztAvgChange },
    }
  });
}
