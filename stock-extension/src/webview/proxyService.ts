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

function httpsGetText(fullUrl: string, referer: string): Promise<string> {
  return new Promise((resolve) => {
    const headers: Record<string, string> = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
    if (referer) headers['Referer'] = referer;
    const req = https.get(fullUrl, { headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(gbDec.decode(Buffer.concat(chunks))));
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
    const volume = parseFloat(p[8]) || 0;
    const amount = parseFloat(p[9]) || 0;
    const change = price - yestclose;
    const rate = yestclose ? (change / yestclose) * 100 : 0;
    diff.push({
      f2: price, f3: rate, f4: change, f12: toCleanCode(code), f14: name,
      f15: high, f16: low, f17: open, f18: yestclose, f47: volume, f48: amount,
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
      if (targetUrl.startsWith('/api/quote') || targetUrl.startsWith('/api/market-overview')) {
        const codes = targetUrl.startsWith('/api/market-overview')
          ? 'sh000001,sz399001,sz399006,sh000016,sh000688,sh000300,sz399005'
          : ((parsed.query.codes as string) || '');
        const list = codes.split(',').filter(Boolean).map(toSinaCode).join(',');
        if (!list) { this.json(res, 200, { data: { diff: [] } }); return; }
        const text = await httpsGetText(`https://hq.sinajs.cn/list=${list}`, 'http://finance.sina.com.cn/');
        const lines = text.split('\n').filter((l) => l.trim());
        this.json(res, 200, { data: { diff: sinaToDiff(lines) } });
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
        const code = toTencentCode((parsed.query.code as string) || 'sh000001');
        const period = (parsed.query.period as string) || 'day';
        const fq = 'qfq';
        const r = await httpGetJson(`https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${code},${period},,,320,${fq}`);
        const data = r?.data?.[code];
        const key = data?.[`qfq${period}`] ? `qfq${period}` : (data?.[period] ? period : '');
        const rows: string[] = (data?.[key] || []).map((row: any[]) => `${row[0]},${row[1]},${row[3]},${row[4]},${row[2]},${row[5] || 0}`);
        this.json(res, 200, { data: { klines: rows } });
        return;
      }

      if (targetUrl.startsWith('/api/hot-stocks')) {
        const hot = 'sh600519,sz000858,sh601318,sh600036,sz300750,sh688981,sz000001,sh601899,sz002594,sh600900';
        const text = await httpsGetText(`https://hq.sinajs.cn/list=${hot}`, 'http://finance.sina.com.cn/');
        const lines = text.split('\n').filter((l) => l.trim());
        this.json(res, 200, { data: { diff: sinaToDiff(lines) } });
        return;
      }

      if (targetUrl.startsWith('/api/sector-limit')) {
        const r = await httpGetJson('https://data.eastmoney.com/dataapi/bkzj/getbkzj?key=f174&code=m%3A90%2Bt%3A2', 'https://data.eastmoney.com/');
        const list = r?.data?.diff || [];
        const diff = list.map((d: any) => ({
          f12: d.f12, f14: d.f14, f2: d.f2 || 0, f3: d.f3 || 0,
          f20: d.f20 || 0, f62: d.f62 || 0, f104: d.f104 || 0, f105: d.f105 || 0,
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

      this.json(res, 404, { error: 'not found' });
    } catch {
      this.json(res, 500, { error: 'proxy error' });
    }
  }
}
