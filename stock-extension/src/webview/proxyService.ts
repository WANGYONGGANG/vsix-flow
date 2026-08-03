import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import { TextDecoder } from 'util';

const gbDec = new TextDecoder('gb18030');

function httpGetJson(fullUrl: string, referer?: string): Promise<any> {
  return new Promise((resolve) => {
    const headers: Record<string, string> = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
    if (referer) headers['Referer'] = referer;
    const mod = fullUrl.startsWith('https') ? https : http;
    const req = mod.get(fullUrl, { headers }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(15000, () => { req.destroy(); });
  });
}

function httpsGetText(fullUrl: string, referer: string, encoding?: string): Promise<string> {
  return new Promise((resolve) => {
    const headers: Record<string, string> = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
    if (referer) headers['Referer'] = referer;
    const req = https.get(fullUrl, { headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve(encoding === 'utf8' ? buf.toString('utf8') : gbDec.decode(buf));
      });
    });
    req.on('error', () => resolve(''));
    req.setTimeout(15000, () => { req.destroy(); });
  });
}

function toSinaCode(code: string): string {
  const c = code.replace(/[.$\s]/g, '').toLowerCase();
  if (/^(sh|sz|bj)/.test(c)) return c;
  if (/^(60|68|90|11|13|50|56|51|58)/.test(c)) return `sh${c}`;
  if (/^(00|30|20|12|15|16|18|159)/.test(c)) return `sz${c}`;
  if (/^(43|83|87|92|88)/.test(c)) return `bj${c}`;
  return `sh${c}`;
}

function toTencentCode(code: string): string {
  const c = code.replace(/[.$\s]/g, '').toLowerCase();
  if (/^(sh|sz|bj)/.test(c)) return c;
  if (/^(60|68|90|11|13|50|56|51|58)/.test(c)) return `sh${c}`;
  if (/^(00|30|20|12|15|16|18|159)/.test(c)) return `sz${c}`;
  if (/^(43|83|87|92|88)/.test(c)) return `bj${c}`;
  return `sh${c}`;
}

function toCleanCode(sinaCode: string): string {
  return sinaCode.replace(/^(sh|sz|bj)/, '');
}

function fmtAmt(v: any): string {
  const n = Number(v || 0);
  if (n >= 1e12) return (n / 1e12).toFixed(2) + '万亿';
  if (n >= 1e8) return (n / 1e8).toFixed(2) + '亿';
  if (n >= 1e4) return (n / 1e4).toFixed(2) + '万';
  return n.toFixed(2);
}

function fmtHoldNum(v: any): string {
  const n = Number(v || 0);
  if (n >= 1e8) return (n / 1e8).toFixed(2) + '亿股';
  if (n >= 1e4) return (n / 1e4).toFixed(2) + '万股';
  return n.toFixed(0) + '股';
}

function stripJsonp(text: string): any {
  // Strip Sina script prefix if present
  let t = text.replace(/^\/\*<script>[\s\S]*?<\/script>\*\/\s*/, '');
  // Try =([...]) pattern (Sina)
  const m1 = t.match(/=\(([\s\S]+)\)$/);
  if (m1) { try { return JSON.parse(m1[1]); } catch {} }
  // Try name(...) pattern (eastmoney)
  const m2 = t.match(/^\w+\(([\s\S]+)\)$/);
  if (m2) { try { return JSON.parse(m2[1]); } catch {} }
  // Try plain JSON
  try { return JSON.parse(t); } catch { return null; }
}

function sinaToDiff(lines: string[]): any[] {
  const diff: any[] = [];
  for (const line of lines) {
    const m = line.match(/hq_str_([a-z]{2}\d+)="(.*)"/);
    if (!m) continue;
    const code = m[1];
    const p = m[2].split(',');
    const name = p[0];
    const open = parseFloat(p[1]);
    const yestclose = parseFloat(p[2]);
    const price = parseFloat(p[3]);
    const high = parseFloat(p[4]);
    const low = parseFloat(p[5]);
    const volume = (parseFloat(p[8]) || 0) * 100;
    const amount = parseFloat(p[9]) || 0;
    const change = price - yestclose;
    const rate = yestclose ? (change / yestclose) * 100 : 0;
    const turnover = parseFloat(p[32]) || 0;
    diff.push({
      f2: price, f3: rate, f4: change, f5: volume, f6: amount, f8: turnover,
      f12: toCleanCode(code), f14: name,
      f15: high, f16: low, f17: open, f18: yestclose,
    });
  }
  return diff;
}

export class ProxyService {
  private server: http.Server | undefined;
  private port: number;

  constructor(port: number = 19101) {
    this.port = port;
  }

  start(): Promise<number> {
    return new Promise((resolve, reject) => {
      const tryListen = (port: number) => {
        this.server = http.createServer((req, res) => {
          this.handleRequest(req, res);
        });
        this.server.listen(port, () => resolve(port));
        this.server.on('error', (err: any) => {
          if (err.code === 'EADDRINUSE' && port < this.port + 10) {
            tryListen(port + 1);
          } else {
            reject(err);
          }
        });
      };
      tryListen(this.port);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = undefined;
    }
  }

  getPort(): number {
    return this.port;
  }

  private json(res: http.ServerResponse, status: number, body: any) {
    res.writeHead(status, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body));
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const targetUrl = req.url || '';
    const parsed = url.parse(targetUrl, true);

    try {
      if (targetUrl.startsWith('/api/quote') || (targetUrl.startsWith('/api/market-overview') && !targetUrl.startsWith('/api/market-overview-detail'))) {
        const codes = targetUrl.startsWith('/api/market-overview')
          ? 'sh000001,sz399001,sz399006,sh000016,sh000688,sh000300,sz399005'
          : ((parsed.query.codes as string) || '');
        const list = codes.split(',').filter(Boolean).map(toTencentCode).join(',');
        if (!list) { this.json(res, 200, { data: { diff: [] } }); return; }
        const text = await httpsGetText(`https://qt.gtimg.cn/q=${list}`, 'https://finance.qq.com/');
        const diff = text.split('\n').filter((l) => l.trim()).map((line) => {
          const m = line.match(/v_([a-z]{2}\d+)="(.*)"/);
          if (!m) return null;
          const p = m[2].split('~');
          return {
            f2: parseFloat(p[3]) || 0,
            f3: parseFloat(p[32]) || 0,
            f4: parseFloat(p[31]) || 0,
            f5: (parseFloat(p[6]) || 0) * 100,
            f6: (parseFloat(p[37]) || 0) * 10000,
            f8: parseFloat(p[38]) || 0,
            f12: toCleanCode(m[1]),
            f14: p[1] || '',
            f15: parseFloat(p[33]) || 0,
            f16: parseFloat(p[34]) || 0,
            f17: parseFloat(p[5]) || 0,
            f18: parseFloat(p[4]) || 0,
            // Buy/Sell 1-5
            buy1: parseFloat(p[9]) || 0, buy1vol: parseInt(p[10]) || 0,
            buy2: parseFloat(p[11]) || 0, buy2vol: parseInt(p[12]) || 0,
            buy3: parseFloat(p[13]) || 0, buy3vol: parseInt(p[14]) || 0,
            buy4: parseFloat(p[15]) || 0, buy4vol: parseInt(p[16]) || 0,
            buy5: parseFloat(p[17]) || 0, buy5vol: parseInt(p[18]) || 0,
            sell1: parseFloat(p[19]) || 0, sell1vol: parseInt(p[20]) || 0,
            sell2: parseFloat(p[21]) || 0, sell2vol: parseInt(p[22]) || 0,
            sell3: parseFloat(p[23]) || 0, sell3vol: parseInt(p[24]) || 0,
            sell4: parseFloat(p[25]) || 0, sell4vol: parseInt(p[26]) || 0,
            sell5: parseFloat(p[27]) || 0, sell5vol: parseInt(p[28]) || 0,
          };
        }).filter(Boolean);
        this.json(res, 200, { data: { diff } });
        return;
      }

      // 市场概况数据：涨跌分布 + 三市成交额 + 昨日涨停表现
      if (targetUrl.startsWith('/api/market-overview-detail')) {
        // 腾讯指数数据
        const idxText = await httpsGetText('https://qt.gtimg.cn/q=sh000001,sz399001,sz399006', 'https://finance.qq.com/');
        let shAmt = 0, szAmt = 0, cybAmt = 0;
        let shUp = 0, shDown = 0, shFlat = 0;
        let szUp = 0, szDown = 0, szFlat = 0;
        idxText.split('\n').filter((l: string) => l.trim()).forEach((line: string) => {
          const m = line.match(/v_([a-z]{2}\d+)="(.*)"/);
          if (!m) return;
          const p = m[2].split('~');
          const amt = (parseFloat(p[37]) || 0) * 10000;
          if (m[1] === 'sh000001') { shAmt = amt; shUp = parseInt(p[44]) || 0; shDown = parseInt(p[45]) || 0; shFlat = parseInt(p[46]) || 0; }
          else if (m[1] === 'sz399001') { szAmt = amt; szUp = parseInt(p[44]) || 0; szDown = parseInt(p[45]) || 0; szFlat = parseInt(p[46]) || 0; }
          else if (m[1] === 'sz399006') { cybAmt = amt; }
        });
        const totalUp = shUp + szUp;
        const totalDown = shDown + szDown;
        const totalFlat = shFlat + szFlat;
        const totalTrade = shAmt + szAmt + cybAmt;
        // 昨日涨停表现
        const ut = '7eea3edcaed734bea9cbfc24409ed989';
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10).replace(/-/g, '');
        const r2 = await httpGetJson(`https://push2ex.eastmoney.com/getTopicZTPool?ut=${ut}&dpt=wz.ztzt&Pageindex=0&pagesize=200&sort=fbt%3Aasc&date=${yesterday}`, 'https://quote.eastmoney.com/ztb/detail.html');
        const ztPool = r2?.data?.pool || [];
        let ztCount = ztPool.length;
        let ztUpCount = 0, ztAvgChange = 0;
        if (ztPool.length > 0) {
          const ztCodes = ztPool.slice(0, 30).map((x: any) => toTencentCode(x.c || '')).join(',');
          if (ztCodes) {
            const ztText = await httpsGetText(`https://qt.gtimg.cn/q=${ztCodes}`, 'https://finance.qq.com/');
            let sumChange = 0, validCount = 0;
            ztText.split('\n').filter((l: string) => l.trim()).forEach((line: string) => {
              const mz = line.match(/v_[a-z]{2}\d+="(.*)"/);
              if (!mz) return;
              const pz = mz[1].split('~');
              const change = parseFloat(pz[32]) || 0;
              sumChange += change; validCount++;
              if (change > 0) ztUpCount++;
            });
            if (validCount > 0) ztAvgChange = sumChange / validCount;
          }
        }
        this.json(res, 200, {
          data: {
            distribution: { zt: 0, g5: 0, g1: 0, g0: 0, flat: 0, d0: 0, d1: 0, d5: 0, dt: 0 },
            counts: { up: totalUp, down: totalDown, flat: totalFlat },
            trade: { sh: shAmt, sz: szAmt, cyb: cybAmt, total: totalTrade },
            yesterdayZt: { count: ztCount, upCount: ztUpCount, avgChange: ztAvgChange },
          }
        });
        return;
      }

      if (targetUrl.startsWith('/api/em-news-search')) {
        const param = JSON.stringify({"uid":"","keyword":"A股 股市","type":["cmsArticleWebOld"],"client":"web","clientType":"web","clientVersion":"curr","param":{"cmsArticleWebOld":{"searchScope":"default","sort":"default","pageIndex":1,"pageSize":30,"preTag":"","postTag":""}}});
        const r = await httpsGetText(`https://search-api-web.eastmoney.com/search/jsonp?cb=x&param=${encodeURIComponent(param)}`, 'https://www.eastmoney.com/', 'utf8');
        const json = stripJsonp(r as any);
        const list = (json?.result?.cmsArticleWebOld || []).map((a: any) => ({
          title: a.title || '',
          content: (a.content || '').replace(/<[^>]+>/g, '').slice(0, 120),
          url: a.articleUrl || '',
          time: a.date || '',
          source: a.mediaName || '东方财富',
          showtime: a.date || '',
        }));
        this.json(res, 200, { data: { list } });
        return;
      }

      if (targetUrl.startsWith('/api/em-news')) {
        const page = parsed.query.page || 1;
        const pageSize = parsed.query.pageSize || 50;
        const r = await httpGetJson(`http://newsapi.eastmoney.com/kuaixun/v2/api/list?pageSize=${pageSize}&pageIndex=${page}`);
        const list = r?.news || [];
        this.json(res, 200, { data: { list } });
        return;
      }

      if (targetUrl.startsWith('/api/kline')) {
        const code = (parsed.query.code as string) || 'sh000001';
        const period = (parsed.query.period as string) || 'day';
        // Minute klines (5m/15m/30m/60m) - use Sina API
        if (['5m', '15m', '30m', '60m'].includes(period)) {
          const sinaCode = toSinaCode(code);
          const scale = period.replace('m', '');
          const r = await httpsGetText(`https://quotes.sina.cn/cn/api/jsonp_v2.php/=/CN_MarketDataService.getKLineData?symbol=${sinaCode}&scale=${scale}&ma=no&datalen=320`, 'https://finance.sina.com.cn/', 'utf8');
          const json = stripJsonp(r as any);
          const list = Array.isArray(json) ? json : [];
          const rows: string[] = list.map((d: any) => `${d.day || ''},${d.open || 0},${d.close || 0},${d.high || 0},${d.low || 0},${d.volume || 0}`);
          this.json(res, 200, { data: { klines: rows } });
          return;
        }
        // Day/Week/Month klines - use Tencent API
        const tcCode = toTencentCode(code);
        const fq = 'qfq';
        const r = await httpGetJson(`https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${tcCode},${period},,,320,${fq}`);
        const data = r?.data?.[tcCode];
        const key = data?.[`qfq${period}`] ? `qfq${period}` : (data?.[period] ? period : '');
        const rows: string[] = (data?.[key] || []).map((row: any[]) => `${row[0]},${row[1]},${row[2]},${row[3]},${row[4]},${row[5] || 0}`);
        this.json(res, 200, { data: { klines: rows } });
        return;
      }

      if (targetUrl.startsWith('/api/intraday')) {
        const code = toTencentCode((parsed.query.code as string) || 'sh000001');
        const r = await httpGetJson(`https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=${code}`);
        const mdata = r?.data?.[code]?.data?.data || [];
        const rows: string[] = mdata.map((d: any) => {
          const parts = d.split(' ');
          return parts.length >= 2 ? `${parts[0]},${parts[1]}` : d;
        });
        const qt = r?.data?.[code]?.qt?.[code] || {};
        this.json(res, 200, { data: { minutes: rows, preClose: qt[4] || 0 } });
        return;
      }

      if (targetUrl.startsWith('/api/hot-stocks')) {
        const hot = 'sh600519,sz000858,sh601318,sh600036,sz300750,sh688981,sz000001,sh601899,sz002594,sh600900';
        const text = await httpsGetText(`https://qt.gtimg.cn/q=${hot}`, 'https://finance.qq.com/');
        const diff = text.split('\n').filter((l) => l.trim()).map((line) => {
          const m = line.match(/v_([a-z]{2}\d+)="(.*)"/);
          if (!m) return null;
          const p = m[2].split('~');
          return {
            f2: parseFloat(p[3]) || 0, f3: parseFloat(p[32]) || 0, f4: parseFloat(p[31]) || 0,
            f5: (parseFloat(p[6]) || 0) * 100, f6: (parseFloat(p[37]) || 0) * 10000, f8: parseFloat(p[38]) || 0,
            f12: toCleanCode(m[1]), f14: p[1] || '',
            f15: parseFloat(p[33]) || 0, f16: parseFloat(p[34]) || 0,
            f17: parseFloat(p[5]) || 0, f18: parseFloat(p[4]) || 0,
          };
        }).filter(Boolean);
        this.json(res, 200, { data: { diff } });
        return;
      }

      if (targetUrl.startsWith('/api/sector-limit')) {
        const r = await httpGetJson('https://data.eastmoney.com/dataapi/bkzj/getbkzj?key=f174&code=m%3A90%2Bt%3A2', 'https://data.eastmoney.com/');
        const list = r?.data?.diff || [];
        const diff = list.map((d: any) => ({
          f12: d.f12, f14: d.f14, f2: d.f2 || 0, f3: d.f3 || 0,
          f20: d.f20 || 0, f62: d.f62 || 0, f104: d.f104 || 0, f105: d.f105 || 0,
          f174: d.f174 || 0,
        }));
        this.json(res, 200, { data: { diff } });
        return;
      }

      if (targetUrl.startsWith('/api/bkzj')) {
        const t = (parsed.query.t as string) || '2';
        const r = await httpGetJson(`https://data.eastmoney.com/dataapi/bkzj/getbkzj?key=f174&code=m%3A90%2Bt%3A${t}`, 'https://data.eastmoney.com/');
        const list = r?.data?.diff || [];
        this.json(res, 200, { data: { diff: list } });
        return;
      }

      // 板块资金流 (Sina) - fenlei=0行业, fenlei=1概念
      if (targetUrl.startsWith('/api/sina-bkzj')) {
        const fenlei = (parsed.query.fenlei as string) || '1';
        const txt = await httpsGetText(`https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/MoneyFlow.ssl_bkzj_bk?page=1&num=50&sort=netamount&asc=0&fenlei=${fenlei}`, 'https://finance.sina.com.cn/', 'utf8');
        try {
          const list = JSON.parse(txt);
          this.json(res, 200, { data: { list } });
        } catch { this.json(res, 200, { data: { list: [] } }); }
        return;
      }

      if (targetUrl.startsWith('/api/zt-pool')) {
        const date = (parsed.query.date as string) || '';
        const d = date || new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const ut = '7eea3edcaed734bea9cbfc24409ed989';
        const r = await httpGetJson(`https://push2ex.eastmoney.com/getTopicZTPool?ut=${ut}&dpt=wz.ztzt&Pageindex=0&pagesize=200&sort=fbt%3Aasc&date=${d}`, 'https://quote.eastmoney.com/ztb/detail.html');
        const pool = r?.data?.pool || [];
        this.json(res, 200, { data: { pool } });
        return;
      }

      if (targetUrl.startsWith('/api/lhb')) {
        const r = await httpGetJson('https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_DAILYBILLBOARD_DETAILSNEW&columns=SECURITY_CODE,SECURITY_NAME_ABBR,CLOSE_PRICE,CHANGE_RATE,EXPLAIN,EXPLANATION,TRADE_DATE,BILLBOARD_NET_AMT,BUY_SEAT,SELL_SEAT,ACCUM_AMOUNT,BILLBOARD_BUY_AMT,BILLBOARD_SELL_AMT&pageNumber=1&pageSize=30&sortColumns=TRADE_DATE&sortTypes=-1&source=WEB&client=WEB');
        const list = r?.result?.data || [];
        this.json(res, 200, { data: { list } });
        return;
      }

      if (targetUrl.startsWith('/api/stock-changes')) {
        const ut = '7eea3edcaed734bea9cbfc24409ed989';
        const r = await httpGetJson(`http://push2ex.eastmoney.com/getAllStockChanges?type=8201,8202,8193,4,32,64,8207,8209,8211,8213,8215,8204,8203,8194,8,16,128,8208,8210,8212,8214,8216&pageindex=0&pagesize=100&ut=${ut}&dpt=wzchanges`, 'https://quote.eastmoney.com/');
        const list = r?.data?.allstock || [];
        this.json(res, 200, { data: { list } });
        return;
      }

      if (targetUrl.startsWith('/api/limit-up-today') || targetUrl.startsWith('/api/dragon-tiger')) {
        this.json(res, 200, { data: { diff: [] } });
        return;
      }

      if (targetUrl.startsWith('/api/fund-flow/intraday')) {
        this.json(res, 200, { data: { trends: [] } });
        return;
      }

      if (targetUrl.startsWith('/api/fund-flow/sectors')) {
        this.json(res, 200, { data: { diff: [] } });
        return;
      }

      if (targetUrl.startsWith('/api/stock-news')) {
        const code = toCleanCode(toSinaCode((parsed.query.code as string) || ''));
        const keyword = code;
        const param = JSON.stringify({"uid":"","keyword":keyword,"type":["cmsArticleWebOld"],"client":"web","clientType":"web","clientVersion":"curr","param":{"cmsArticleWebOld":{"searchScope":"default","sort":"default","pageIndex":1,"pageSize":10,"preTag":"","postTag":""}}});
        const r = await httpsGetText(`https://search-api-web.eastmoney.com/search/jsonp?cb=x&param=${encodeURIComponent(param)}`, 'https://www.eastmoney.com/', 'utf8');
        const json = stripJsonp(r as any);
        const list = (json?.result?.cmsArticleWebOld || []).map((a: any) => ({
          title: a.title || '',
          url: a.articleUrl || `https://finance.eastmoney.com/a/${a.code || ''}.html`,
          time: a.date || '',
          source: '资讯',
          content: (a.content || '').replace(/<[^>]+>/g, '').slice(0, 100),
        }));
        this.json(res, 200, { data: { list } });
        return;
      }

      if (targetUrl.startsWith('/api/stock-notice')) {
        const code = toCleanCode(toSinaCode((parsed.query.code as string) || ''));
        const r = await httpsGetText(`https://np-anotice-stock.eastmoney.com/api/security/ann?cb=x&sr=-1&page_size=10&page_index=1&ann_type=A&client_source=web&f_node=0&s_node=0&stock_list=${code}`, 'https://data.eastmoney.com/', 'utf8');
        const json = stripJsonp(r as any);
        const list = (json?.data?.list || []).map((a: any) => ({ title: a.title || '', url: `https://data.eastmoney.com/notices/detail/${code}/${a.art_code || ''}.html`, time: a.notice_date || '', source: '公告' }));
        this.json(res, 200, { data: { list } });
        return;
      }

      if (targetUrl.startsWith('/api/stock-essential')) {
        const code = toCleanCode(toSinaCode((parsed.query.code as string) || ''));
        const prefix = /^(60|68|90|11|13|50|56|51|58)/.test(code) ? 'SH' : 'SZ';
        const r = await httpGetJson(`https://emweb.securities.eastmoney.com/PC_HSF10/CompanySurvey/PageAjax?code=${prefix}${code}`, 'https://emweb.securities.eastmoney.com/');
        const json = typeof r === 'string' ? (() => { try { return JSON.parse(r); } catch { return null; } })() : r;
        const jb = json?.jbzl?.[0] || {};
        const info = {
          items: [
            { label: '股票代码', value: jb.SECURITY_CODE || code },
            { label: '公司全称', value: jb.ORG_NAME || '' },
            { label: '英文名称', value: jb.ORG_NAME_EN || '' },
            { label: '曾用名', value: jb.FORMERNAME || '' },
            { label: '公司类型', value: jb.SECURITY_TYPE || '' },
            { label: '上市交易所', value: jb.TRADE_MARKET || '' },
            { label: '所属行业', value: jb.INDUSTRYCSRC1 || '' },
            { label: '董事长', value: jb.CHAIRMAN || '' },
            { label: '总经理', value: jb.PRESIDENT || '' },
            { label: '董事会秘书', value: jb.SECRETARY || '' },
            { label: '法人代表', value: jb.LEGAL_PERSON || '' },
            { label: '独立董事', value: jb.INDEDIRECTORS || '' },
            { label: '联系电话', value: jb.ORG_TEL || '' },
            { label: '电子邮箱', value: jb.ORG_EMAIL || '' },
            { label: '传真', value: jb.ORG_FAX || '' },
            { label: '公司网址', value: jb.ORG_WEB || '' },
            { label: '办公地址', value: jb.ADDRESS || '' },
            { label: '注册地址', value: jb.REG_ADDRESS || '' },
            { label: '办公邮编', value: jb.ADDRESS_POSTCODE || '' },
            { label: '注册资本(万)', value: jb.REG_CAPITAL || '' },
            { label: '统一信用代码', value: jb.REG_NUM || '' },
            { label: '员工人数', value: jb.EMP_NUM || '' },
            { label: '法律顾问', value: jb.LAW_FIRM || '' },
            { label: '审计机构', value: jb.ACCOUNTFIRM_NAME || '' },
            { label: '公司简介', value: (jb.ORG_PROFILE || '').slice(0, 200) },
            { label: '经营范围', value: (jb.BUSINESS_SCOPE || '').slice(0, 200) },
          ]
        };
        this.json(res, 200, { data: { info } });
        return;
      }

      if (targetUrl.startsWith('/api/stock-finance')) {
        const code = toCleanCode(toSinaCode((parsed.query.code as string) || ''));
        const r = await httpGetJson(`https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_F10_FINANCE_MAINFINADATA&columns=ALL&filter=(SECURITY_CODE=%22${code}%22)&pageSize=4&sortColumns=REPORT_DATE&sortTypes=-1&source=HSF10&client=PC`, 'https://data.eastmoney.com/');
        const list = r?.result?.data || [];
        const latest = list[0] || {};
        const prev = list[1] || {};
        const fmtNum = (v: any, d = 2) => v != null ? Number(v).toFixed(d) : '-';
        const fmtAmt = (v: any) => {
          const n = Number(v || 0);
          if (n >= 1e12) return (n / 1e12).toFixed(2) + '万亿';
          if (n >= 1e8) return (n / 1e8).toFixed(2) + '亿';
          if (n >= 1e4) return (n / 1e4).toFixed(2) + '万';
          return n.toFixed(2);
        };
        const yoy = (cur: any, prv: any) => {
          if (cur == null || prv == null || Number(prv) === 0) return '-';
          const r = ((Number(cur) - Number(prv)) / Math.abs(Number(prv)) * 100);
          return (r >= 0 ? '+' : '') + r.toFixed(2) + '%';
        };
        const items = [
          { label: '报告期', value: latest.REPORT_DATE_NAME || '-' },
          { label: '每股收益', value: fmtNum(latest.EPSJB), color: Number(latest.EPSJB) >= 0 ? '#ff4d4f' : '#23c343' },
          { label: '每股净资产', value: fmtNum(latest.BPS) },
          { label: '每股经营现金流', value: fmtNum(latest.MGJYXJJE) },
          { label: '营业总收入', value: fmtAmt(latest.TOTALOPERATEREVE) },
          { label: '营收同比增长', value: yoy(latest.TOTALOPERATEREVE, prev.TOTALOPERATEREVE), color: Number(latest.TOTALOPERATEREVE) >= Number(prev.TOTALOPERATEREVE) ? '#ff4d4f' : '#23c343' },
          { label: '归母净利润', value: fmtAmt(latest.PARENTNETPROFIT) },
          { label: '净利润同比增长', value: yoy(latest.PARENTNETPROFIT, prev.PARENTNETPROFIT), color: Number(latest.PARENTNETPROFIT) >= Number(prev.PARENTNETPROFIT) ? '#ff4d4f' : '#23c343' },
          { label: '净资产收益率', value: fmtNum(latest.ROEJQ) + '%' },
          { label: '毛利率', value: fmtNum(latest.XSMLL) + '%' },
          { label: '净利率', value: fmtNum(latest.XSJLL) + '%' },
          { label: '资产负债率', value: fmtNum(latest.ZCFZL) + '%' },
          { label: '流动比率', value: fmtNum(latest.LD) },
          { label: '速动比率', value: fmtNum(latest.SD) },
          { label: '总资产周转率', value: fmtNum(latest.ZZCZZTS) + '次' },
          { label: '应收账款周转天数', value: fmtNum(latest.YSZKZZTS) + '天' },
        ];
        this.json(res, 200, { data: { items } });
        return;
      }

      if (targetUrl.startsWith('/api/stock-profile')) {
        const code = toCleanCode(toSinaCode((parsed.query.code as string) || ''));
        const sub = (parsed.query.sub as string) || 'essential';
        if (sub === 'company' || sub === 'essential') {
          const prefix = /^(60|68|90|11|13|50|56|51|58)/.test(code) ? 'SH' : 'SZ';
          const r = await httpGetJson(`https://emweb.securities.eastmoney.com/PC_HSF10/CompanySurvey/PageAjax?code=${prefix}${code}`, 'https://emweb.securities.eastmoney.com/');
          const json = typeof r === 'string' ? (() => { try { return JSON.parse(r); } catch { return null; } })() : r;
          const jb = json?.jbzl?.[0] || {};
          const items = sub === 'essential' ? [
            { label: '股票代码', value: jb.SECURITY_CODE || code },
            { label: '公司全称', value: jb.ORG_NAME || '' },
            { label: '英文名称', value: jb.ORG_NAME_EN || '' },
            { label: '曾用名', value: jb.FORMERNAME || '' },
            { label: '公司类型', value: jb.SECURITY_TYPE || '' },
            { label: '上市交易所', value: jb.TRADE_MARKET || '' },
            { label: '所属行业', value: jb.INDUSTRYCSRC1 || '' },
            { label: '董事长', value: jb.CHAIRMAN || '' },
            { label: '总经理', value: jb.PRESIDENT || '' },
            { label: '董事会秘书', value: jb.SECRETARY || '' },
            { label: '法人代表', value: jb.LEGAL_PERSON || '' },
            { label: '联系电话', value: jb.ORG_TEL || '' },
            { label: '电子邮箱', value: jb.ORG_EMAIL || '' },
            { label: '公司网址', value: jb.ORG_WEB || '' },
            { label: '办公地址', value: jb.ADDRESS || '' },
            { label: '注册资本(万)', value: jb.REG_CAPITAL || '' },
            { label: '员工人数', value: jb.EMP_NUM || '' },
            { label: '公司简介', value: (jb.ORG_PROFILE || '').slice(0, 300) },
            { label: '经营范围', value: (jb.BUSINESS_SCOPE || '').slice(0, 300) },
          ] : [
            { label: '公司全称', value: jb.ORG_NAME || '' },
            { label: '英文名称', value: jb.ORG_NAME_EN || '' },
            { label: '公司类型', value: jb.SECURITY_TYPE || '' },
            { label: '上市交易所', value: jb.TRADE_MARKET || '' },
            { label: '所属行业', value: jb.INDUSTRYCSRC1 || '' },
            { label: '成立日期', value: jb.FOUND_DATE || '' },
            { label: '上市日期', value: jb.LISTING_DATE || '' },
            { label: '注册资本(万)', value: jb.REG_CAPITAL || '' },
            { label: '法人代表', value: jb.LEGAL_PERSON || '' },
            { label: '董事长', value: jb.CHAIRMAN || '' },
            { label: '总经理', value: jb.PRESIDENT || '' },
            { label: '董事会秘书', value: jb.SECRETARY || '' },
            { label: '独立董事', value: jb.INDEDIRECTORS || '' },
            { label: '主办券商', value: jb.HOST_BROKER || '' },
            { label: '联系电话', value: jb.ORG_TEL || '' },
            { label: '电子邮箱', value: jb.ORG_EMAIL || '' },
            { label: '传真', value: jb.ORG_FAX || '' },
            { label: '公司网址', value: jb.ORG_WEB || '' },
            { label: '办公地址', value: jb.ADDRESS || '' },
            { label: '注册地址', value: jb.REG_ADDRESS || '' },
            { label: '办公邮编', value: jb.ADDRESS_POSTCODE || '' },
            { label: '统一信用代码', value: jb.REG_NUM || '' },
            { label: '员工人数', value: jb.EMP_NUM || '' },
            { label: '法律顾问', value: jb.LAW_FIRM || '' },
            { label: '审计机构', value: jb.ACCOUNTFIRM_NAME || '' },
            { label: '实际控股人', value: jb.ACTUAL_HOLDER || '' },
            { label: '公司简介', value: (jb.ORG_PROFILE || '').slice(0, 500) },
            { label: '经营范围', value: (jb.BUSINESS_SCOPE || '').slice(0, 500) },
          ];
          this.json(res, 200, { data: { items } });
          return;
        }
        if (sub === 'holder') {
          const r = await httpGetJson(`https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_F10_EH_FREEHOLDERS&columns=SECURITY_CODE,HOLDER_NAME,HOLD_NUM,FREE_HOLDNUM_RATIO,HOLD_RATIO,HOLD_NUM_CHANGE,CHANGE_RATIO,HOLD_DATE&filter=(SECURITY_CODE=%22${code}%22)&pageSize=10&sortColumns=HOLD_DATE,HOLD_NUM&sortTypes=-1,-1&source=HSF10&client=PC`, 'https://data.eastmoney.com/');
          const list = r?.result?.data || [];
          if (!list.length) {
            this.json(res, 200, { data: { items: [{ label: '提示', value: '暂无股东数据' }] } });
            return;
          }
          const items = list.map((h: any) => ({
            label: h.HOLDER_NAME || '',
            value: `持股${fmtHoldNum(h.HOLD_NUM)} 占比${h.HOLD_RATIO != null ? Number(h.HOLD_RATIO).toFixed(2) : '-'}%`,
          }));
          this.json(res, 200, { data: { items } });
          return;
        }
        if (sub === 'industry') {
          const r = await httpGetJson(`https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_F10_FINANCE_MAINFINADATA&columns=SECURITY_CODE,SECURITY_NAME_ABBR,TOTALOPERATEREVE,PARENTNETPROFIT,ROEJQ,XSMLL,XSJLL&filter=(SECURITY_CODE=%22${code}%22)&pageSize=1&sortColumns=REPORT_DATE&sortTypes=-1&source=HSF10&client=PC`, 'https://data.eastmoney.com/');
          const row = r?.result?.data?.[0] || {};
          const items = [
            { label: '公司名称', value: row.SECURITY_NAME_ABBR || '' },
            { label: '营业总收入', value: fmtAmt(row.TOTALOPERATEREVE) },
            { label: '归母净利润', value: fmtAmt(row.PARENTNETPROFIT) },
            { label: '净资产收益率', value: row.ROEJQ != null ? Number(row.ROEJQ).toFixed(2) + '%' : '-' },
            { label: '毛利率', value: row.XSMLL != null ? Number(row.XSMLL).toFixed(2) + '%' : '-' },
            { label: '净利率', value: row.XSJLL != null ? Number(row.XSJLL).toFixed(2) + '%' : '-' },
            { label: '', value: '' },
            { label: '注：行业对比数据', value: '请参考东方财富F10页面' },
          ];
          this.json(res, 200, { data: { items } });
          return;
        }
        this.json(res, 200, { data: { items: [] } });
        return;
      }

      this.json(res, 404, { error: 'not found' });
    } catch {
      this.json(res, 500, { error: 'proxy error' });
    }
  }
}
