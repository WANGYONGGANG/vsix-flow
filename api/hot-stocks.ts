// 热门股 - 东财个股人气榜TOP（实时），再查腾讯实时行情
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions } from './_shared/response';
import { httpsGetText, httpPostJson, tencentTextToDiff, toCleanCode } from './_shared/http';

const FALLBACK = 'sh600519,sz000858,sh601318,sh600036,sz300750,sh688981,sz000001,sh601899,sz002594,sh600900';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  // 1) 人气榜排名（sc=SH600664 格式，hisRc=排名变化）
  const ranks: { code: string; rank: number; hisRc: number }[] = [];
  try {
    const payload = { appId: 'appId01', globalId: '786e4c21-70dc-435a-93bb-38', marketType: '', pageNo: 1, pageSize: 20 };
    const rj = await httpPostJson('https://emappdata.eastmoney.com/stockrank/getAllCurrentList', payload, 'https://guba.eastmoney.com/rank/');
    (rj?.data || []).forEach((x: any) => {
      const sc = String(x?.sc || '').toLowerCase();
      if (sc.length < 8) return;
      const mkt = sc.slice(0, 2);
      if (mkt !== 'sh' && mkt !== 'sz' && mkt !== 'bj') return;
      ranks.push({ code: mkt + sc.slice(2), rank: Number(x?.rk) || ranks.length + 1, hisRc: Number(x?.hisRc) || 0 });
    });
  } catch { /* empty */ }

  const codes = ranks.length ? ranks.map((r) => r.code) : FALLBACK.split(',');
  const text = await httpsGetText(`https://qt.gtimg.cn/q=${codes.join(',')}`, 'https://finance.qq.com/');
  const quotes = tencentTextToDiff(text);

  // 2) 按人气榜顺序合并行情
  const diff = codes.map((full, idx) => {
    const clean = toCleanCode(full);
    const q = quotes.find((x) => x.f12 === clean);
    const rk = ranks[idx];
    return {
      ...(q || { f12: clean, f2: 0, f3: 0 }),
      rank: rk?.rank || idx + 1,
      hisRc: rk?.hisRc || 0,
    };
  }).filter((x) => x.f14 || x.f2);

  // 人气榜失败时用兜底股填充排名
  if (!ranks.length) diff.forEach((x, i) => { x.rank = i + 1; x.hisRc = 0; });

  json(res, 200, { data: { diff } });
}
