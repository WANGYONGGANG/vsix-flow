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

  // 检测是否为期货代码（f_ 前缀）
  const isFutures = rawCode.toLowerCase().startsWith('f_');
  
  if (isFutures) {
    // 期货数据：使用东方财富期货 API
    const futuresCode = rawCode.replace(/^f_/i, '');
    const secid = `113.${futuresCode}`; // 期货使用 market 113
    
    const [futuresData] = await Promise.all([
      httpGetJson(`https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f43,f44,f45,f46,f47,f48,f50,f51,f52,f55,f57,f58,f60,f116,f117,f162,f167,f170,f171&fltt=2&invt=2`, 'https://quote.eastmoney.com/'),
    ]);
    
    const fd = futuresData?.data || {};
    const diff = [{
      f2: fd.f43 || 0,      // 最新价
      f3: fd.f170 || 0,     // 涨跌幅
      f4: fd.f171 || 0,     // 涨跌额
      f5: fd.f47 || 0,      // 成交量
      f6: fd.f48 || 0,      // 成交额
      f8: 0,                // 换手率（期货无此字段）
      f12: futuresCode,     // 代码
      f14: fd.f58 || '',    // 名称
      f15: fd.f44 || 0,     // 最高
      f16: fd.f45 || 0,     // 最低
      f17: fd.f46 || 0,     // 今开
      f18: fd.f60 || 0,     // 昨收
      f7: 0,                // 振幅（期货需单独计算）
      f9: 0,                // 市盈率（期货无）
      f20: fd.f116 || 0,    // 总市值
      f21: fd.f117 || 0,    // 流通市值
      f23: 0,               // 市净率（期货无）
      f127: '',             // 行业（期货无）
      // 期货无五档盘口
    }];
    json(res, 200, { data: { diff } });
    return;
  }

  const cleanCode = rawCode.replace(/^(sh|sz|bj)/i, '');
  const isSh = /^(60|68|90|11|13|50|56|51|58)/.test(cleanCode);
  const secid = `${isSh ? 1 : 0}.${cleanCode}`;

  // 并行：腾讯盘口 + 东财 ulist 财务 + 东财 stock/get 行业/市值/估值
  const ulistFields = 'f7,f9,f20,f21,f23'; // 振幅/市盈/总市值/流通市值/市净
  const [tencentText, u, s] = await Promise.all([
    httpsGetText(`https://qt.gtimg.cn/q=${toTencentCode(rawCode)}`, 'https://finance.qq.com/'),
    httpGetJson(`https://push2.eastmoney.com/api/qt/ulist.np/get?secids=${secid}&fields=${ulistFields}&fltt=2&invt=2`, 'https://quote.eastmoney.com/'),
    httpGetJson(`https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f116,f117,f127,f162,f167&fltt=2&invt=2`, 'https://quote.eastmoney.com/'),
  ]);

  // 腾讯盘口数据
  const tDiff = tencentTextToDiff(tencentText);
  const tq = tDiff[0] || null;
  if (!tq) { json(res, 200, { data: { diff: [] } }); return; }

  // 东财财务字段（东财限流时字段可能为 "-" 或缺失，两路互为兜底）
  const num = (v: any): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const ud = u?.data?.diff?.[0] || {};
  const sd = s?.data || {};
  // 振幅兜底：由腾讯高/低/昨收计算
  const hi = num(tq.f15), lo = num(tq.f16), pre = num(tq.f18);
  const amplitude = num(ud.f7) || (pre > 0 ? +(((hi - lo) / pre) * 100).toFixed(2) : 0);

  // 合并：腾讯盘口为主，东财补充财务字段
  const industry = sd.f127 ?? '';
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
    // 财务字段：东财优先，腾讯兜底（东财被墙时腾讯数据有效）
    f7: amplitude || num(tq._tqAmplitude) || 0,
    f9: num(ud.f9) || num(sd.f162) || num(tq._tqPE) || 0,
    f20: num(ud.f20) || num(sd.f116) || (tq._tqTotalCap ? tq._tqTotalCap * 1e8 : 0),
    f21: num(ud.f21) || num(sd.f117) || (tq._tqFloatCap ? tq._tqFloatCap * 1e8 : 0),
    f23: num(ud.f23) || num(sd.f167) || num(tq._tqPB) || 0,
    f127: industry, // 行业
  }];
  json(res, 200, { data: { diff } });
}
