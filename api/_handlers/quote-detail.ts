// /api/quote-detail - 详情页行情（腾讯盘口实时 + 东方财富财务字段）
// 腾讯(qt.gtimg.cn)：价格/涨跌幅/今开/昨收/最高/最低/换手/量/额/五档买卖盘（实时刷新）
// 东方财富 ulist.np/get：振幅/市盈/市净/总市值/流通市值（定时刷新）
// 东方财富 stock/get：行业
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from './_shared/response';
import { httpGetJson, httpsGetText, toTencentCode, toCleanCode, tencentTextToDiff } from './_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const rawCode = getQuery(req, 'code');
  if (!rawCode) { json(res, 200, { data: { diff: [] } }); return; }

  const cleanCode = rawCode.replace(/^(sh|sz|bj)/i, '');
  const isSh = /^(60|68|90|11|13|50|56|51|58)/.test(cleanCode);
  const secid = `${isSh ? 1 : 0}.${cleanCode}`;

  // 并行：腾讯盘口 + 东财 ulist 财务 + 东财 stock/get 行业
  const ulistFields = 'f7,f9,f20,f21,f23'; // 振幅/市盈/总市值/流通市值/市净
  const [tencentText, u, s] = await Promise.all([
    httpsGetText(`https://qt.gtimg.cn/q=${toTencentCode(rawCode)}`, 'https://finance.qq.com/'),
    httpGetJson(`https://push2.eastmoney.com/api/qt/ulist.np/get?secids=${secid}&fields=${ulistFields}&fltt=2&invt=2`, 'https://quote.eastmoney.com/'),
    httpGetJson(`https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f127&fltt=2&invt=2`, 'https://quote.eastmoney.com/'),
  ]);

  // 腾讯盘口数据
  const tDiff = tencentTextToDiff(tencentText);
  const tq = tDiff[0] || null;
  if (!tq) { json(res, 200, { data: { diff: [] } }); return; }

  // 东财财务字段
  const ud = u?.data?.diff?.[0] || {};
  const sd = s?.data || {};

  // 合并：腾讯盘口为主，东财补充财务字段
  const diff = [{
    // 腾讯实时盘口
    f2: tq.f2 ?? 0, f3: tq.f3 ?? 0, f4: tq.f4 ?? 0, f5: tq.f5 ?? 0, f6: tq.f6 ?? 0,
    f8: tq.f8 ?? 0, f12: tq.f12 ?? cleanCode, f14: tq.f14 || '',
    f15: tq.f15 ?? 0, f16: tq.f16 ?? 0, f17: tq.f17 ?? 0, f18: tq.f18 ?? 0,
    // 五档买卖盘
    buy1: tq.buy1, buy1vol: tq.buy1vol, buy2: tq.buy2, buy2vol: tq.buy2vol,
    buy3: tq.buy3, buy3vol: tq.buy3vol, buy4: tq.buy4, buy4vol: tq.buy4vol,
    buy5: tq.buy5, buy5vol: tq.buy5vol,
    sell1: tq.sell1, sell1vol: tq.sell1vol, sell2: tq.sell2, sell2vol: tq.sell2vol,
    sell3: tq.sell3, sell3vol: tq.sell3vol, sell4: tq.sell4, sell4vol: tq.sell4vol,
    sell5: tq.sell5, sell5vol: tq.sell5vol,
    // 东财财务字段
    f7: ud.f7 ?? 0,    // 振幅
    f9: ud.f9 ?? 0,    // 市盈率
    f20: ud.f20 ?? 0,  // 总市值
    f21: ud.f21 ?? 0,  // 流通市值
    f23: ud.f23 ?? 0,  // 市净率
    f127: sd.f127 ?? '', // 行业
  }];
  json(res, 200, { data: { diff } });
}
