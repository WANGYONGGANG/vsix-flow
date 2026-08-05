// 股票代码/名称搜索（东方财富 suggest + 本地字典 fallback）
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from './_shared/response';
import { httpGetJson, stripJsonp, httpsGetText } from './_shared/http';

// 本地字典：常见 A 股龙头 / 高关注股票（东财 suggest 网络受限或结果少的时候兜底）
const LOCAL_DICT: Array<{ code: string; prefix: 'sh' | 'sz' | 'bj'; name: string; py: string; type?: string; }> = [
  // 白酒消费
  { code: '600519', prefix: 'sh', name: '贵州茅台', py: 'gzmt,maotai,moutai' },
  { code: '000858', prefix: 'sz', name: '五粮液', py: 'wly,wuliangye' },
  { code: '000568', prefix: 'sz', name: '泸州老窖', py: 'lzlj,luzhou' },
  { code: '600809', prefix: 'sh', name: '山西汾酒', py: 'sxfj,fenjiu' },
  { code: '000596', prefix: 'sz', name: '古井贡酒', py: 'gjgj' },
  { code: '600600', prefix: 'sh', name: '青岛啤酒', py: 'qdpj,qingdao' },
  { code: '600887', prefix: 'sh', name: '伊利股份', py: 'ylgf,yili' },
  { code: '002714', prefix: 'sz', name: '牧原股份', py: 'mygf,muyuan' },
  { code: '603288', prefix: 'sh', name: '海天味业', py: 'htwy,haitian' },
  { code: '300999', prefix: 'sz', name: '金龙鱼', py: 'jly' },
  { code: '600298', prefix: 'sh', name: '安琪酵母', py: 'aqjm' },
  // 银行保险金融
  { code: '601398', prefix: 'sh', name: '工商银行', py: 'gsyh,icbc' },
  { code: '601288', prefix: 'sh', name: '农业银行', py: 'nyyh,abc' },
  { code: '601988', prefix: 'sh', name: '中国银行', py: 'zgyh,boc' },
  { code: '601939', prefix: 'sh', name: '建设银行', py: 'jsyh,ccb' },
  { code: '600036', prefix: 'sh', name: '招商银行', py: 'zsyh,cmb' },
  { code: '000001', prefix: 'sz', name: '平安银行', py: 'payh,pingan' },
  { code: '601166', prefix: 'sh', name: '兴业银行', py: 'xyyh,cib' },
  { code: '600000', prefix: 'sh', name: '浦发银行', py: 'pfyh,spdb' },
  { code: '601318', prefix: 'sh', name: '中国平安', py: 'zgpa,pingan,pac' },
  { code: '601601', prefix: 'sh', name: '中国太保', py: 'zgtb,cpic' },
  { code: '601628', prefix: 'sh', name: '中国人寿', py: 'zgrs,chinalife' },
  { code: '600030', prefix: 'sh', name: '中信证券', py: 'zxzq,citic' },
  { code: '601211', prefix: 'sh', name: '国泰君安', py: 'gtja' },
  { code: '000776', prefix: 'sz', name: '广发证券', py: 'gfzq' },
  // 新能源 汽车
  { code: '300750', prefix: 'sz', name: '宁德时代', py: 'ndsd,catl' },
  { code: '002594', prefix: 'sz', name: '比亚迪', py: 'byd,biya' },
  { code: '601012', prefix: 'sh', name: '隆基绿能', py: 'ljln,longji' },
  { code: '300274', prefix: 'sz', name: '阳光电源', py: 'ygdy,sungrow' },
  { code: '600438', prefix: 'sh', name: '通威股份', py: 'twgf,tongwei' },
  { code: '300014', prefix: 'sz', name: '亿纬锂能', py: 'ywln,eve' },
  { code: '002460', prefix: 'sz', name: '赣锋锂业', py: 'gfli,ganfeng' },
  { code: '002466', prefix: 'sz', name: '天齐锂业', py: 'tqli,tianqi' },
  { code: '300015', prefix: 'sz', name: '爱尔眼科', py: 'aeyk,aier' },
  { code: '300760', prefix: 'sz', name: '迈瑞医疗', py: 'mryl,mindray' },
  { code: '601633', prefix: 'sh', name: '长城汽车', py: 'ccqc,gwm' },
  { code: '601127', prefix: 'sh', name: '赛力斯', py: 'sls,seres,aishang' },
  { code: '300751', prefix: 'sz', name: '迈为股份', py: 'mwgf' },
  // 科技 半导体 互联网
  { code: '002475', prefix: 'sz', name: '立讯精密', py: 'lxjm,luxshare' },
  { code: '600745', prefix: 'sh', name: '闻泰科技', py: 'wtkj,wingtech' },
  { code: '603986', prefix: 'sh', name: '兆易创新', py: 'zycx,gigadevice' },
  { code: '603501', prefix: 'sh', name: '韦尔股份', py: 'wegf,will' },
  { code: '300782', prefix: 'sz', name: '卓胜微', py: 'zsw,maxscend' },
  { code: '300059', prefix: 'sz', name: '东方财富', py: 'dfcf,eastmoney' },
  { code: '300033', prefix: 'sz', name: '同花顺', py: 'ths,10jqka' },
  { code: '002230', prefix: 'sz', name: '科大讯飞', py: 'kdxf,iflytek' },
  { code: '000977', prefix: 'sz', name: '浪潮信息', py: 'lcxx,inspur' },
  { code: '000063', prefix: 'sz', name: '中兴通讯', py: 'zxtx,zte' },
  { code: '601138', prefix: 'sh', name: '工业富联', py: 'gyfl,fii,foxconn' },
  { code: '002371', prefix: 'sz', name: '北方华创', py: 'bfhc' },
  { code: '300476', prefix: 'sz', name: '胜宏科技', py: 'shkj' },
  { code: '002384', prefix: 'sz', name: '东山精密', py: 'dsjm' },
  { code: '600487', prefix: 'sh', name: '亨通光电', py: 'htgd' },
  // 医药
  { code: '600276', prefix: 'sh', name: '恒瑞医药', py: 'hryy,hrpharm' },
  { code: '300760', prefix: 'sz', name: '迈瑞医疗', py: 'mryl,mindray' },
  { code: '603259', prefix: 'sh', name: '药明康德', py: 'ymkd,wuxi' },
  { code: '000661', prefix: 'sz', name: '长春高新', py: 'ccgx,cchg' },
  { code: '300347', prefix: 'sz', name: '泰格医药', py: 'tgyy,tigermed' },
  { code: '300122', prefix: 'sz', name: '智飞生物', py: 'zfsw,zhifei' },
  { code: '300142', prefix: 'sz', name: '沃森生物', py: 'wssw,walvax' },
  { code: '300436', prefix: 'sz', name: '广生堂', py: 'gst' },
  { code: '600196', prefix: 'sh', name: '复星医药', py: 'fxyy,fosunpharma' },
  { code: '002007', prefix: 'sz', name: '华兰生物', py: 'hlsw,hualan' },
  // 地产基建
  { code: '000002', prefix: 'sz', name: '万科A', py: 'wka,vanke' },
  { code: '600048', prefix: 'sh', name: '保利发展', py: 'blfz,poly' },
  { code: '601668', prefix: 'sh', name: '中国建筑', py: 'zgjz,cscec' },
  { code: '601186', prefix: 'sh', name: '中国铁建', py: 'zgtj,crcc' },
  { code: '601390', prefix: 'sh', name: '中国中铁', py: 'zggt,crec' },
  { code: '600585', prefix: 'sh', name: '海螺水泥', py: 'hlsn,conch' },
  { code: '000333', prefix: 'sz', name: '美的集团', py: 'mdjt,midea' },
  { code: '000651', prefix: 'sz', name: '格力电器', py: 'gldq,gree' },
  { code: '600690', prefix: 'sh', name: '海尔智家', py: 'hezj,haier' },
  { code: '002415', prefix: 'sz', name: '海康威视', py: 'hkwc,hikvision' },
  { code: '002241', prefix: 'sz', name: '歌尔股份', py: 'gegf,goertek' },
  // 能源 材料 周期
  { code: '601857', prefix: 'sh', name: '中国石油', py: 'zgsy,cnpc' },
  { code: '600028', prefix: 'sh', name: '中国石化', py: 'zgsh,sinopec' },
  { code: '601088', prefix: 'sh', name: '中国神华', py: 'zgsh,shenhua' },
  { code: '601899', prefix: 'sh', name: '紫金矿业', py: 'zjky,zijin' },
  { code: '000408', prefix: 'sz', name: '藏格矿业', py: 'zgky' },
  { code: '000630', prefix: 'sz', name: '铜陵有色', py: 'tlys,tongling' },
  { code: '000831', prefix: 'sz', name: '中国稀土', py: 'zgxt' },
  { code: '600547', prefix: 'sh', name: '山东黄金', py: 'sdhj' },
  { code: '600900', prefix: 'sh', name: '长江电力', py: 'cjdl,cypc' },
  { code: '601985', prefix: 'sh', name: '中国核电', py: 'zgcnnp' },
  { code: '600436', prefix: 'sh', name: '片仔癀', py: 'pzh,pianzaihuang' },
  { code: '600031', prefix: 'sh', name: '三一重工', py: 'syzg,sany' },
  // 指数
  { code: '000001', prefix: 'sh', name: '上证指数', py: 'szzs' },
  { code: '399001', prefix: 'sz', name: '深证成指', py: 'szcz' },
  { code: '399006', prefix: 'sz', name: '创业板指', py: 'cybz' },
  { code: '000688', prefix: 'sh', name: '科创50', py: 'kc50' },
  { code: '000300', prefix: 'sh', name: '沪深300', py: 'hs300' },
  { code: '399005', prefix: 'sz', name: '中小板指', py: 'zxbz' },
  { code: '000016', prefix: 'sh', name: '上证50', py: 'sz50' },
  // 港股/中概通
  { code: '00700', prefix: 'sh', name: '腾讯控股', py: 'txkg,tencent' },
  { code: '09988', prefix: 'sh', name: '阿里巴巴', py: 'albaba,baba' },
  { code: '09618', prefix: 'sh', name: '京东集团', py: 'jd' },
  { code: '01810', prefix: 'sh', name: '小米集团', py: 'xm,xiaomi' },
];

function fuzzyMatch(kw: string): any[] {
  const k = kw.trim().toLowerCase();
  if (!k) return [];
  const results: Array<{ item: typeof LOCAL_DICT[number]; score: number; }> = [];
  for (const it of LOCAL_DICT) {
    let score = 0;
    if (it.name.toLowerCase() === k) score += 100;
    else if (it.name.toLowerCase().includes(k)) score += 60;
    else {
      const pys = it.py.split(',').map((s) => s.trim()).filter(Boolean);
      for (const p of pys) {
        if (p === k) { score += 80; break; }
        if (p.startsWith(k)) { score += 40; break; }
        if (p.includes(k)) { score += 20; break; }
      }
    }
    if (it.code === k) score += 90;
    if (!score) continue;
    results.push({ item: it, score });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 10).map((r) => ({
    code: r.item.prefix + r.item.code,
    display_code: r.item.code,
    name: r.item.name,
    market: r.item.prefix === 'sh' ? 1 : r.item.prefix === 'sz' ? 0 : 9,
    type: r.item.type || '股票',
  }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  const kw = decodeURIComponent(getQuery(req, 'kw')).trim();
  if (!kw) { json(res, 200, { data: { list: [] } }); return; }

  const token = 'D43BF722C8E33BDC906FB84D85E326E8';
  const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(kw)}&type=14&token=${token}`;
  const r = await httpGetJson(url, 'https://quote.eastmoney.com/');

  const arr: any[] = r?.QuotationCodeTable?.Data || [];
  let list = arr.map((d: any) => {
    const code = d.Code || '';
    let mkt = d.MarketinGbk; // 1=沪, 0=深, 9=北
    let prefix = 'sh';
    if (mkt === 0) prefix = 'sz';
    else if (mkt === 9) prefix = 'bj';
    else if (/^(60|68|90|11|13|50|56|51|58)/.test(code)) prefix = 'sh';
    else if (/^(00|30|20|12|15|16|18|159)/.test(code)) prefix = 'sz';
    else if (/^(43|83|87|92|88)/.test(code)) prefix = 'bj';
    return {
      code: prefix + code,
      display_code: code,
      name: d.Name || '',
      market: d.Market || mkt,
      type: d.Indicator || d.SecurityTypeName || '',
    };
  }).filter((x: any) => x.code && x.name);

  // Fallback：东财返回 < 3 条时，用本地字典补结果（去重）
  if (list.length < 5) {
    const seen = new Set<string>(list.map((x) => String(x.code).toLowerCase()));
    const extra = fuzzyMatch(kw).filter((x) => !seen.has(String(x.code).toLowerCase()));
    list = list.concat(extra).slice(0, 15);
  }

  json(res, 200, { data: { list } });
}
