import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import { TextDecoder } from 'util';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const gbDec = new TextDecoder('gb18030');

const EDGE_TTS_VOICES = [
  { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓（女·亲切）', gender: 'female' },
  { id: 'zh-CN-XiaoyiNeural', name: '晓伊（女·温柔）', gender: 'female' },
  { id: 'zh-CN-XiaochenNeural', name: '晓辰（女·清新）', gender: 'female' },
  { id: 'zh-CN-XiaohanNeural', name: '晓涵（女·知性）', gender: 'female' },
  { id: 'zh-CN-XiaomengNeural', name: '晓梦（女·梦幻）', gender: 'female' },
  { id: 'zh-CN-XiaomoNeural', name: '晓墨（女·沉稳）', gender: 'female' },
  { id: 'zh-CN-XiaoqiuNeural', name: '晓秋（女·秋意）', gender: 'female' },
  { id: 'zh-CN-XiaorouNeural', name: '晓柔（女·柔美）', gender: 'female' },
  { id: 'zh-CN-XiaoshuangNeural', name: '晓双（女·儿童）', gender: 'child' },
  { id: 'zh-CN-XiaoxuanNeural', name: '晓萱（女·活泼）', gender: 'female' },
  { id: 'zh-CN-XiaozhenNeural', name: '晓甄（女·真诚）', gender: 'female' },
  { id: 'zh-CN-YunjianNeural', name: '云健（男·沉稳磁性）', gender: 'male' },
  { id: 'zh-CN-YunxiNeural', name: '云希（男·年轻）', gender: 'male' },
  { id: 'zh-CN-YunxiaNeural', name: '云夏（男·少年）', gender: 'male' },
  { id: 'zh-CN-YunyangNeural', name: '云扬（男·新闻播报）', gender: 'male' },
  { id: 'zh-CN-YunfengNeural', name: '云枫（男·成熟）', gender: 'male' },
  { id: 'zh-CN-YunhaoNeural', name: '云皓（男·浩然）', gender: 'male' },
  { id: 'zh-CN-YunzeNeural', name: '云泽（男·稳重）', gender: 'male' },
];

function httpGetJson(fullUrl: string, referer?: string, timeout?: number): Promise<any> {
  let settled = false;
  return new Promise((resolve) => {
    const done = (val: any) => { if (!settled) { settled = true; resolve(val); } };
    const headers: Record<string, string> = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
    if (referer) headers['Referer'] = referer;
    const mod = fullUrl.startsWith('https') ? https : http;
    const req = mod.get(fullUrl, { headers }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { done(JSON.parse(data)); } catch { done(null); }
      });
    });
    req.on('error', () => done(null));
    req.setTimeout(timeout || 8000, () => { req.destroy(); done(null); });
  });
}

function httpsGetText(fullUrl: string, referer: string, encoding?: string, method?: string, body?: string, contentType?: string): Promise<string> {
  let settled = false;
  return new Promise((resolve) => {
    const done = (val: string) => { if (!settled) { settled = true; resolve(val); } };
    const headers: Record<string, string> = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
    if (referer) headers['Referer'] = referer;
    if (contentType) headers['Content-Type'] = contentType;
    if (body) headers['Content-Length'] = Buffer.byteLength(body).toString();
    const req = https.request(fullUrl, { method: method || 'GET', headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        done(encoding === 'utf8' ? buf.toString('utf8') : gbDec.decode(buf));
      });
    });
    req.on('error', () => done(''));
    req.setTimeout(8000, () => { req.destroy(); done(''); });
    if (body) req.write(body);
    req.end();
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
  // Strip trailing semicolon that Sina appends (e.g. "=([...]);")
  t = t.replace(/;\s*$/, '');
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
      // 详情页行情：腾讯盘口（实时）+ 东方财富财务字段（振幅/市盈/市净/市值/行业）
      if (targetUrl.startsWith('/api/quote-detail')) {
        const rawCode = String(parsed.query.code || '');
        if (!rawCode) { this.json(res, 200, { data: { diff: [] } }); return; }
        const cleanCode = rawCode.replace(/^(sh|sz|bj)/i, '');
        const isSh = /^(60|68|90|11|13|50|56|51|58)/.test(cleanCode);
        const secid = `${isSh ? 1 : 0}.${cleanCode}`;
        const ulistFields = 'f7,f9,f20,f21,f23'; // 振幅/市盈/总市值/流通市值/市净
        // 并行：腾讯盘口 + 东财 ulist 财务 + 东财 stock/get 行业
        const [tencentText, u, s] = await Promise.all([
          httpsGetText(`https://qt.gtimg.cn/q=${toTencentCode(rawCode)}`, 'https://finance.qq.com/'),
          httpGetJson(`https://push2.eastmoney.com/api/qt/ulist.np/get?secids=${secid}&fields=${ulistFields}&fltt=2&invt=2`, 'https://quote.eastmoney.com/'),
          httpGetJson(`https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=f127&fltt=2&invt=2`, 'https://quote.eastmoney.com/'),
        ]);
        // 腾讯盘口
        const tqLine = tencentText.split('\n').filter((l) => l.trim()).map((line) => {
          const m = line.match(/v_([a-z]{2}\d+)="(.*)"/);
          if (!m) return null;
          const p = m[2].split('~');
          return {
            f2: parseFloat(p[3]) || 0, f3: parseFloat(p[32]) || 0, f4: parseFloat(p[31]) || 0,
            f5: (parseFloat(p[6]) || 0) * 100, f6: (parseFloat(p[37]) || 0) * 10000,
            f8: parseFloat(p[38]) || 0, f12: toCleanCode(m[1]), f14: p[1] || '',
            f15: parseFloat(p[33]) || 0, f16: parseFloat(p[34]) || 0,
            f17: parseFloat(p[5]) || 0, f18: parseFloat(p[4]) || 0,
            // 腾讯也返回估值字段：p[39]=PE动态 p[43]=振幅 p[44]=总市值(亿) p[45]=流通市值(亿) p[46]=PB
            _tqPE: parseFloat(p[39]) || 0, _tqAmplitude: parseFloat(p[43]) || 0,
            _tqTotalCap: parseFloat(p[44]) || 0, _tqFloatCap: parseFloat(p[45]) || 0,
            _tqPB: parseFloat(p[46]) || 0,
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
        }).filter(Boolean)[0];
        if (!tqLine) { this.json(res, 200, { data: { diff: [] } }); return; }
        const ud = u?.data?.diff?.[0] || {};
        const sd = s?.data || {};
        const diff = [{
          // 腾讯实时盘口
          f2: tqLine.f2 ?? 0, f3: tqLine.f3 ?? 0, f4: tqLine.f4 ?? 0, f5: tqLine.f5 ?? 0, f6: tqLine.f6 ?? 0,
          f8: tqLine.f8 ?? 0, f12: tqLine.f12 ?? cleanCode, f14: tqLine.f14 || '',
          f15: tqLine.f15 ?? 0, f16: tqLine.f16 ?? 0, f17: tqLine.f17 ?? 0, f18: tqLine.f18 ?? 0,
          buy1: tqLine.buy1, buy1vol: tqLine.buy1vol, buy2: tqLine.buy2, buy2vol: tqLine.buy2vol,
          buy3: tqLine.buy3, buy3vol: tqLine.buy3vol, buy4: tqLine.buy4, buy4vol: tqLine.buy4vol,
          buy5: tqLine.buy5, buy5vol: tqLine.buy5vol,
          sell1: tqLine.sell1, sell1vol: tqLine.sell1vol, sell2: tqLine.sell2, sell2vol: tqLine.sell2vol,
          sell3: tqLine.sell3, sell3vol: tqLine.sell3vol, sell4: tqLine.sell4, sell4vol: tqLine.sell4vol,
          sell5: tqLine.sell5, sell5vol: tqLine.sell5vol,
          // 财务字段：东财优先，腾讯兜底（东财被墙时腾讯数据有效）
          f7: ud.f7 || tqLine._tqAmplitude || 0,
          f9: ud.f9 || tqLine._tqPE || 0,
          f20: ud.f20 || (tqLine._tqTotalCap ? tqLine._tqTotalCap * 1e8 : 0),
          f21: ud.f21 || (tqLine._tqFloatCap ? tqLine._tqFloatCap * 1e8 : 0),
          f23: ud.f23 || tqLine._tqPB || 0,
          f127: sd.f127 ?? '',
        }];
        this.json(res, 200, { data: { diff } });
        return;
      }
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
            f72: parseInt(p[72]) || 0,
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
        // 1. 腾讯指数数据 - 获取成交额
        let shAmt = 0, szAmt = 0, cybAmt = 0;
        try {
          const idxText = await httpsGetText('https://qt.gtimg.cn/q=sh000001,sz399001,sz399006', 'https://finance.qq.com/');
          idxText.split('\n').filter((l: string) => l.trim()).forEach((line: string) => {
            const m = line.match(/v_([a-z]{2}\d+)="(.*)"/);
            if (!m) return;
            const p = m[2].split('~');
            const amt = (parseFloat(p[37]) || 0) * 10000;
            if (m[1] === 'sh000001') { shAmt = amt; }
            else if (m[1] === 'sz399001') { szAmt = amt; }
            else if (m[1] === 'sz399006') { cybAmt = amt; }
          });
        } catch {}
        // 深市用综指(sz399001成指 vs 399106综指)：为准确呈现三市，用总成交额=沪+深
        // 创业板(sz399006)是深市子集，不重复计入total，仅作展示
        const totalTrade = shAmt + szAmt;
        // 2. 获取昨日同期成交额（沪+深，用腾讯day/query分时精确取昨日同刻，与今日total口径一致）
        let yesterdayTrade = 0;
        try {
          // 本地日期回退到最近交易日
          const lastT = new Date();
          do { lastT.setDate(lastT.getDate() - 1); } while (lastT.getDay() === 0 || lastT.getDay() === 6);
          const ymd = `${lastT.getFullYear()}${String(lastT.getMonth() + 1).padStart(2, '0')}${String(lastT.getDate()).padStart(2, '0')}`;
          // 沪、深 两个指数分别取昨日同刻累计成交额（分时累值,单位元）
          for (const tc of ['sh000001', 'sz399001']) {
            const qUrl = `https://web.ifzq.gtimg.cn/appstock/app/day/query?code=${tc}`;
            const qData = await httpsGetText(qUrl, 'https://gu.qq.com/', 'utf8');
            if (!qData) continue;
            try {
              const qJ = JSON.parse(qData);
              const qDataObj = qJ?.data?.[tc] || {};
              const days = qDataObj.data || [];
              for (const day of days) {
                if (day?.date !== ymd) continue;
                const rows: string[] = day?.data || [];
                // 分时行: 'hhmm 现价 累计量 累计额'；取小于等于当前时点的最新一行累计额
                if (rows.length) {
                  const now2 = new Date();
                  const hh = now2.getHours(), mm = now2.getMinutes();
                  const curMin = hh * 60 + mm;
                  let bestAmt = 0;
                  let lastAmt = 0;
                  for (const line of rows) {
                    const p = line.split(' ');
                    const t = p[0] || '';
                    const hm = (parseInt(t.slice(0, 2)) || 0) * 60 + (parseInt(t.slice(2, 4)) || 0);
                    lastAmt = parseFloat(p[3]) || 0;
                    if (hm <= curMin) bestAmt = lastAmt;
                  }
                  // 若当前已收盘(>=15:00)取全天额
                  yesterdayTrade += bestAmt > 0 ? bestAmt : lastAmt;
                }
                break;
              }
            } catch {}
          }
        } catch {}
        // 3. 计算量比（今日总成交/昨日同期总成交）
        let volumeRatio = 0;
        if (yesterdayTrade > 0 && totalTrade > 0) {
          volumeRatio = totalTrade / yesterdayTrade;
        }
        // 4. 涨跌家数 - 多源容错
        let totalUp = 0, totalDown = 0, totalFlat = 0;
        // 方法1: East Money ulist API（push2被阻断时用push2delay镜像）
        // 东财行情中心涨跌家数口径=沪综指+深成指(沪深两市)的 f104/f105/f106
        const ulistHosts = ['https://push2.eastmoney.com', 'https://push2delay.eastmoney.com'];
        for (const host of ulistHosts) {
          if (totalUp > 0 || totalDown > 0) break;
          try {
            const emText = await httpsGetText(`${host}/api/qt/ulist.np/get?fltt=2&secids=1.000001,0.399001&fields=f104,f105,f106`, 'https://quote.eastmoney.com/', 'utf8');
            if (emText) {
              const emData = JSON.parse(emText);
              const diffs = emData?.data?.diff || [];
              for (const d of diffs) {
                totalUp += d.f104 || 0;
                totalDown += d.f105 || 0;
                totalFlat += d.f106 || 0;
              }
            }
          } catch {}
        }
        // 方法2: ulist失败时，用clist获取涨跌统计
        if (totalUp === 0 && totalDown === 0) {
          for (const host of ulistHosts) {
            if (totalUp > 0 || totalDown > 0) break;
            try {
              const clistText = await httpsGetText(`${host}/api/qt/clist/get?pn=1&pz=6000&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f3`, 'https://quote.eastmoney.com/', 'utf8');
              if (clistText) {
                const cj = JSON.parse(clistText);
                const items = cj?.data?.diff || [];
                for (const it of items) {
                  const f3 = it.f3 || 0;
                  if (f3 > 0) totalUp++;
                  else if (f3 < 0) totalDown++;
                  else totalFlat++;
                }
              }
            } catch {}
          }
        }
        // 3. 涨跌分布 - 用真实涨停/跌停数 + 其余按档位估算（与东财对齐）
        let zt = 0, g5 = 0, g1 = 0, g0 = 0, d0 = 0, d1 = 0, d5 = 0, dt = 0;
        let hasZt = false, hasDt = false;
        try {
          const ut = '7eea3edcaed734bea9cbfc24409ed989';
          const today = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`;
          // 今日涨停池
          const ztR = await httpGetJson(`https://push2ex.eastmoney.com/getTopicZTPool?ut=${ut}&dpt=wz.ztzt&Pageindex=0&pagesize=500&sort=fbt%3Aasc&date=${today}`, 'https://quote.eastmoney.com/ztb/detail.html');
          const ztN = ztR?.data?.pool?.length || ztR?.data?.tc || 0;
          if (ztN > 0) { zt = ztN; hasZt = true; }
        } catch {}
        try {
          // 跌停数：优先跌停池，失败时用clist跌幅榜统计(f3<=-9.8近似跌停)
          const ut = '7eea3edcaed734bea9cbfc24409ed989';
          const today = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`;
          const dtR = await httpGetJson(`https://push2ex.eastmoney.com/getTopicDTPool?ut=${ut}&dpt=wz.ztzt&Pageindex=0&pagesize=500&sort=fund%3Aasc&date=${today}`, 'https://quote.eastmoney.com/');
          const dtN = dtR?.data?.pool?.length || dtR?.data?.tc || 0;
          if (dtN > 0) { dt = dtN; hasDt = true; }
          else {
            // 用push2delay clist跌幅榜统计跌停（非ST约-10%、ST约-5%，这里用<=-9.8））
            const dlText = await httpsGetText('https://push2delay.eastmoney.com/api/qt/clist/get?pn=1&pz=200&po=0&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f3', 'https://quote.eastmoney.com/', 'utf8');
            if (dlText) {
              const dlJ = JSON.parse(dlText);
              const dl = dlJ?.data?.diff || [];
              let dtCnt = 0;
              for (const x of dl) { if ((x.f3 ?? 0) <= -9.8) dtCnt++; }
              if (dtCnt > 0) { dt = dtCnt; hasDt = true; }
            }
          }
        } catch {}
        if (totalUp > 0) {
          if (!hasZt) zt = Math.round(totalUp * 0.03);
          const upRemain = Math.max(0, totalUp - zt);
          g5 = Math.round(upRemain * 0.12);
          g1 = Math.round(upRemain * 0.35);
          g0 = Math.max(0, upRemain - g5 - g1);
        }
        if (totalDown > 0) {
          if (!hasDt) dt = Math.round(totalDown * 0.02);
          const downRemain = Math.max(0, totalDown - dt);
          d5 = Math.round(downRemain * 0.10);
          d1 = Math.round(downRemain * 0.35);
          d0 = Math.max(0, downRemain - d5 - d1);
        }
        // 4. 昨日涨停表现（用本地时区回退，getYesterdayZTPool返回今日实时涨跌幅zdp）
        let ztCount = 0, ztUpCount = 0, ztAvgChange = 0;
        try {
          const ut = '7eea3edcaed734bea9cbfc24409ed989';
          const ydayToday = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`;
          const r2 = await httpGetJson(`https://push2ex.eastmoney.com/getYesterdayZTPool?ut=${ut}&dpt=wz.ztzt&Pageindex=0&pagesize=500&sort=zs%3Adesc&date=${ydayToday}`, 'https://quote.eastmoney.com/ztb/detail=zrzt');
          const ztPool = r2?.data?.pool || [];
          ztCount = ztPool.length;
          const valid = ztPool
            .map((x: any) => (x.zdp != null ? Number(x.zdp) : NaN))
            .filter((v: number) => !isNaN(v));
          if (valid.length > 0) {
            ztAvgChange = valid.reduce((a: number, b: number) => a + b, 0) / valid.length;
            ztUpCount = valid.filter((v: number) => v > 0).length;
          }
        } catch {}
        this.json(res, 200, {
          data: {
            distribution: { zt, g5, g1, g0, flat: totalFlat, d0, d1, d5, dt },
            counts: { up: totalUp, down: totalDown, flat: totalFlat },
            trade: { sh: shAmt, sz: szAmt, cyb: cybAmt, total: totalTrade, yesterdayTotal: yesterdayTrade, volumeRatio },
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

      if (targetUrl.startsWith('/api/search')) {
        const kw = String(parsed.query.kw || '').trim();
        if (!kw) { this.json(res, 200, { data: { list: [] } }); return; }
        const sug = await httpsGetText(`https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(kw)}&type=14&token=D43BF722C8E33BDC906FB84D85E326E8&count=10`, 'https://quote.eastmoney.com/', 'utf8');
        let sugJson: any = null;
        try { sugJson = JSON.parse(sug); } catch {}
        const raw = sugJson?.QuotationCodeTable?.Data || [];
        const list = raw
          .filter((x: any) => x.SecurityTypeName === '沪A' || x.SecurityTypeName === '深A' || x.SecurityTypeName === '京A' || x.SecurityTypeName === '北A' || x.SecurityTypeName === '沪深A股')
          .map((x: any) => ({ code: String(x.Code || ''), name: x.Name || '', marketType: x.MarketType }));
        this.json(res, 200, { data: { list } });
        return;
      }

      if (targetUrl.startsWith('/api/futures-search')) {
        const kw = String(parsed.query.kw || '').trim();
        if (!kw) { this.json(res, 200, { data: { list: [] } }); return; }

        // 方案1：suggest API type=30 (期货) - 覆盖国内外期货品种更全
        const token = 'D43BF722C8E33BDC906FB84D85E326E8';
        const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(kw)}&type=30&token=${token}&count=20`;
        try {
          const text = await httpsGetText(url, 'https://quote.eastmoney.com/', 'utf8');
          const r = stripJsonp(text);
          const arr = r?.QuotationCodeTable?.Data || [];
          const list = arr.map((d: any) => {
            const code = d.Code || '';
            return {
              code: 'f_' + code,
              display_code: code,
              name: d.Name || '',
              type: '期货',
              price: d.LastPrice || d.p,
              change: d.ChangePercent || d.zdf,
            };
          }).filter((x: any) => x.code && x.name);
          if (list.length) { this.json(res, 200, { data: { list } }); return; }
        } catch { /* fall through */ }

        // 方案2：回退 futsseapi 列表接口 (增加 SHFE 上期所)
        try {
          const token2 = '58b2fa8f54638b60b87d69b31969089c';
          const r = await httpGetJson(`https://futsseapi.eastmoney.com/list/COMEX,NYMEX,COBOT,SGX,NYBOT,LME,MDEX,TOCOM,IPE,SHFE?orderBy=dm&sort=desc&pageSize=200&pageIndex=0&token=${token2}&field=dm,sc,name,p,zsjd,zde,zdf,f152,o,h,l,zjsj,vol,wp,np,ccl&blockName=callback`);
          const raw = r?.list || r || [];
          const list = raw
            .filter((x: any) => {
              const dm = String(x.dm || '').toLowerCase();
              const name = String(x.name || '').toLowerCase();
              return dm.includes(kw.toLowerCase()) || name.includes(kw.toLowerCase());
            })
            .map((x: any) => ({
              code: 'f_' + String(x.dm || ''),
              name: x.name || '',
              type: '期货',
              price: x.p,
              change: x.zdf,
            }));
          this.json(res, 200, { data: { list } });
          return;
        } catch { /* fall through */ }

        // 方案3：本地常用上期所期货兜底（网络全阻断时）
        const localSHFE: { dm: string; name: string }[] = [
          { dm: 'AO', name: '氧化铝' },
          { dm: 'AL', name: '沪铝' },
          { dm: 'CU', name: '沪铜' },
          { dm: 'ZN', name: '沪锌' },
          { dm: 'PB', name: '沪铅' },
          { dm: 'NI', name: '沪镍' },
          { dm: 'SN', name: '沪锡' },
          { dm: 'RB', name: '螺纹钢' },
          { dm: 'HC', name: '热卷' },
          { dm: 'SS', name: '不锈钢' },
          { dm: 'WR', name: '线材' },
          { dm: 'FU', name: '燃油' },
          { dm: 'BU', name: '沥青' },
          { dm: 'RU', name: '橡胶' },
          { dm: 'NR', name: '20号胶' },
          { dm: 'SP', name: '纸浆' },
          { dm: 'SA', name: '纯碱' },
          { dm: 'PG', name: '液化气' },
          { dm: 'LH', name: '生猪' },
        ];
        const list = localSHFE
          .filter((x) => x.name.toLowerCase().includes(kw.toLowerCase()) || x.dm.toLowerCase().includes(kw.toLowerCase()))
          .map((x) => ({
            code: 'f_' + x.dm,
            display_code: x.dm,
            name: x.name,
            type: '期货',
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
          if (parts.length >= 4) return `${parts[0]},${parts[1]},${parts[2]},${parts[3]}`;
          return parts.length >= 2 ? `${parts[0]},${parts[1]},0,0` : d;
        });
        const qt = r?.data?.[code]?.qt?.[code] || {};
        this.json(res, 200, { data: { minutes: rows, preClose: qt[4] || 0 } });
        return;
      }

      if (targetUrl.startsWith('/api/hot-stocks')) {
        // 东财个股人气榜TOP（真正的热门股），再查腾讯实时行情
        let hotCodes: string[] = [];
        try {
          const rankPayload = JSON.stringify({ appId: 'appId01', globalId: '786e4c21-70dc-435a-93bb-38', marketType: '', pageNo: 1, pageSize: 30 });
          const rankText = await httpsGetText(`https://emappdata.eastmoney.com/stockrank/getAllCurrentList`, 'https://guba.eastmoney.com/rank/', 'utf8', 'POST', rankPayload, 'application/json');
          if (rankText) {
            const rankJ = JSON.parse(rankText);
            (rankJ?.data || []).slice(0, 30).forEach((r: any, idx: number) => {
              const sc = String(r?.sc || '');
              hotCodes.push({ sh: 'sh', sz: 'sz' }[sc.slice(0, 2).toLowerCase()] + sc.slice(2));
            });
          }
        } catch {}
        if (!hotCodes.length) {
          hotCodes = ['sh600519', 'sz000858', 'sh601318', 'sh600036', 'sz300750', 'sh688981', 'sz000001', 'sh601899', 'sz002594', 'sh600900'];
        }
        const text = await httpsGetText(`https://qt.gtimg.cn/q=${hotCodes.join(',')}`, 'https://finance.qq.com/');
        const diff = text.split('\n').filter((l) => l.trim()).map((line) => {
          const m = line.match(/v_([a-z]{2}\d+)="(.*)"/);
          if (!m) return null;
          const p = m[2].split('~');
          const raw = m[1];
          const code = toCleanCode(raw);
          const key = (raw.startsWith('sh') ? 'sh' : 'sz') + code;
          return {
            f2: parseFloat(p[3]) || 0, f3: parseFloat(p[32]) || 0, f4: parseFloat(p[31]) || 0,
            f5: (parseFloat(p[6]) || 0) * 100, f6: (parseFloat(p[37]) || 0) * 10000, f8: parseFloat(p[38]) || 0,
            f12: code, f14: p[1] || '',
            f15: parseFloat(p[33]) || 0, f16: parseFloat(p[34]) || 0,
            f17: parseFloat(p[5]) || 0, f18: parseFloat(p[4]) || 0,
            rank: hotCodes.indexOf(key) + 1,
          };
        }).filter(Boolean).sort((a: any, b: any) => (a.rank || 999) - (b.rank || 999));
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

      // 全市场主力净流入排行（选股报告用）- clist fid=f62, pz 默认100
      if (targetUrl.startsWith('/api/stock-flow-rank')) {
        const pz = (parsed.query.pz as string) || '100';
        const fid = (parsed.query.fid as string) || 'f62';
        const fs = (parsed.query.fs as string) || 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048';
        const fields = 'f12,f14,f2,f3,f6,f9,f20,f23,f8,f62,f66,f72,f100,f124';
        const base = `https://push2delay.eastmoney.com/api/qt/clist/get?pn=1&pz=${pz}&po=1&np=1&fltt=2&invt=2&fid=${fid}`;
        const referer = 'https://quote.eastmoney.com/center/gridlist.html';
        let r = await httpGetJson(`${base}&fs=${encodeURIComponent(fs)}&fields=${fields}`, referer, 12000);
        let diff = r?.data?.diff || [];
        console.log(`[stock-flow-rank] diff.length=${diff.length} total=${r?.data?.total || 0}`);
        this.json(res, 200, { data: { diff, total: r?.data?.total } });
        return;
      }

      // 板块资金流排行（选股报告用）- t=2行业 / t=3概念, 含涨跌家数与领涨股
      if (targetUrl.startsWith('/api/sector-flow-rank')) {
        const t = (parsed.query.t as string) || '2';
        const pz = (parsed.query.pz as string) || '20';
        const fs = t === '3'
          ? 'm:90+t:3+f:!50'
          : 'm:90+t:2+f:!50';
        const fields = 'f12,f14,f3,f62,f104,f105,f100,f204,f205';
        const base = `https://push2delay.eastmoney.com/api/qt/clist/get?pn=1&pz=${pz}&po=1&np=1&fltt=2&invt=2&fid=f62`;
        const referer = 'https://quote.eastmoney.com/center/boardlist.html';
        let r = await httpGetJson(`${base}&fs=${encodeURIComponent(fs)}&fields=${fields}`, referer, 12000);
        let diff = r?.data?.diff || [];
        console.log(`[sector-flow-rank] t=${t} diff.length=${diff.length}`);
        this.json(res, 200, { data: { diff } });
        return;
      }

      // 个股日线资金流历史（选股报告用）- 近N日主力净流入
      if (targetUrl.startsWith('/api/stock-fflow-day')) {
        const code = toCleanCode(toSinaCode((parsed.query.code as string) || ''));
        const lmt = (parsed.query.lmt as string) || '30';
        const secid = (/^(60|68|90|11|13|50|56|51|58)/.test(code) ? '1.' : '0.') + code;
        const fields = 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65';
        console.log(`[StockExt] proxy stock-fflow-day: code=${code} secid=${secid}`);
        const r = await httpGetJson(`https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get?lmt=${lmt}&klt=101&secid=${secid}&fields1=f1,f2,f3,f7&fields2=${fields}`, 'https://data.eastmoney.com/');
        const klines: string[] = r?.data?.klines || [];
        console.log(`[StockExt] proxy stock-fflow-day result: rc=${r?.rc} klines=${klines.length}`);
        const list = klines.map((line: string) => {
          const p = line.split(',');
          // date,close,pct,主力净流入,主力净占比,超大单,超大单占比,大单,大单占比,中单,中单占比,小单,小单占比
          var mr = parseFloat(p[4]) || 0;
          if (Math.abs(mr) > 100) mr = 0; // 异常值清零
          return {
            date: p[0],
            close: parseFloat(p[1]) || 0,
            pct: parseFloat(p[2]) || 0,
            main: parseFloat(p[3]) || 0,
            mainRatio: mr,
            super: parseFloat(p[5]) || 0,
            superRatio: parseFloat(p[6]) || 0,
            big: parseFloat(p[7]) || 0,
            bigRatio: parseFloat(p[8]) || 0,
            mid: parseFloat(p[9]) || 0,
            midRatio: parseFloat(p[10]) || 0,
            small: parseFloat(p[11]) || 0,
            smallRatio: parseFloat(p[12]) || 0,
          };
        });
        // 东财数据为空时用新浪备用接口
        if (!list.length) {
          console.log(`[StockExt] stock-fflow-day: eastmoney returned empty, trying sina fallback`);
          try {
            const daima = toSinaCode((parsed.query.code as string) || '');
            const base = 'https://vip.stock.finance.sina.com.cn/quotes_service/api/json_v2.php/MoneyFlow';
            const lscjfb = await httpGetJson(`${base}.ssl_qsfx_lscjfb?page=1&num=${lmt}&sort=opendate&asc=0&daima=${daima}`, 'https://finance.sina.com.cn/');
            const arr1: any[] = Array.isArray(lscjfb) ? lscjfb : [];
            if (arr1.length) {
              const zjlrqs = await httpGetJson(`${base}.ssl_qsfx_zjlrqs?page=1&num=${lmt}&sort=opendate&asc=0&daima=${daima}`, 'https://finance.sina.com.cn/');
              const arr2: any[] = Array.isArray(zjlrqs) ? zjlrqs : [];
              const byDate = new Map<string, any>();
              for (const x of arr2) { const d = String(x.opendate || ''); if (d) byDate.set(d, x); }
              for (const row of arr1) {
                const date = String(row.opendate || '');
                if (!date) continue;
                const sum = byDate.get(date);
                const r0Net = Math.round(Number(row.r0_net || 0));
                const estSuper = Math.round(r0Net * 0.4);
                const estBig = Math.round(r0Net * 0.6);
                list.push({
                  date, main: r0Net,
                  mainRatio: sum ? Number((Number(sum.r0_ratio || 0) * 100).toFixed(3)) : 0,
                  super: estSuper, superRatio: sum ? Number((Number(sum.r0_ratio || 0) * 100 * 0.4).toFixed(3)) : 0,
                  big: estBig, bigRatio: sum ? Number((Number(sum.r0_ratio || 0) * 100 * 0.6).toFixed(3)) : 0,
                  mid: Math.round(Number(row.r1_net || 0)), midRatio: 0,
                  small: Math.round((Number(row.r2_net || 0) + Number(row.r3_net || 0))), smallRatio: 0,
                  close: Number(row.trade || 0), pct: Number(row.changeratio || 0) * 100,
                });
              }
              console.log(`[StockExt] stock-fflow-day: sina fallback returned ${list.length} items`);
            }
          } catch (e: any) { console.log(`[StockExt] sina fallback error: ${e?.message}`); }
        }
        this.json(res, 200, { data: { list } });
        return;
      }

      // 股东户数（选股报告用）- RPT_HOLDERNUMLATEST
      if (targetUrl.startsWith('/api/stock-holder')) {
        const code = toCleanCode(toSinaCode((parsed.query.code as string) || ''));
        const r = await httpGetJson(`https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_HOLDERNUMLATEST&columns=ALL&filter=(SECURITY_CODE=%22${code}%22)&pageNumber=1&pageSize=5&sortColumns=END_DATE&sortTypes=-1&source=WEB&client=WEB`, 'https://data.eastmoney.com/gdhs/');
        const arr = r?.result?.data || [];
        const list = arr.map((d: any) => ({
          endDate: d.END_DATE || '',
          holderNum: d.HOLDER_NUM,
          preHolderNum: d.PRE_HOLDER_NUM,
          holderNumChange: d.HOLDER_NUM_CHANGE,
          holderNumRatio: d.HOLDER_NUM_RATIO,
          closePrice: d.CLOSE_PRICE,
        }));
        this.json(res, 200, { data: { list } });
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

      if (targetUrl.startsWith('/api/lhb-detail')) {
        const code = (parsed.query.code as string) || '';
        const date = (parsed.query.date as string) || '';
        if (!code || !date) { this.json(res, 200, { data: { list: [] } }); return; }
        const r = await httpGetJson(`https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_BILLBOARD_DAILYDETAILSBUY&columns=ALL&pageSize=100&pageNumber=1&source=WEB&client=WEB&filter=(SECURITY_CODE=%22${code}%22)(TRADE_DATE='${date}')&sortTypes=-1`);
        const list = r?.result?.data || [];
        const r2 = await httpGetJson(`https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_BILLBOARD_DAILYDETAILSSELL&columns=ALL&pageSize=100&pageNumber=1&source=WEB&client=WEB&filter=(SECURITY_CODE=%22${code}%22)(TRADE_DATE='${date}')&sortTypes=-1`);
        const sellList = r2?.result?.data || [];
        this.json(res, 200, { data: { buyList: list, sellList } });
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

      // Edge TTS - 文字转语音
      if (targetUrl.startsWith('/api/tts')) {
        const text = (parsed.query.text as string) || '';
        const voice = (parsed.query.voice as string) || 'zh-CN-XiaoxiaoNeural';
        const rate = parseFloat(parsed.query.rate as string) || 0;
        const pitch = parseFloat(parsed.query.pitch as string) || 0;
        if (!text) { this.json(res, 400, { error: 'text required' }); return; }
        try {
          console.log(`[TTS] voice=${voice} rate=${rate} pitch=${pitch} text=${text.slice(0, 30)}...`);
          const tts = new MsEdgeTTS();
          await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
          const { audioStream } = tts.toStream(text, {
            rate: `${rate >= 0 ? '+' : ''}${rate}%`,
            pitch: `${pitch >= 0 ? '+' : ''}${pitch}%`,
          });
          const chunks: Buffer[] = [];
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => { reject(new Error('TTS timeout after 10s')); }, 10000);
            audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
            audioStream.on('end', () => { clearTimeout(timer); resolve(); });
            audioStream.on('error', (err: any) => { clearTimeout(timer); reject(err); });
          });
          tts.close();
          const buf = Buffer.concat(chunks);
          console.log(`[TTS] success, ${buf.length} bytes`);
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'audio/mpeg',
            'Content-Length': buf.length
          });
          res.end(buf);
        } catch (err: any) {
          console.log(`[TTS] failed: ${err?.message || err}`);
          this.json(res, 500, { error: 'TTS failed: ' + (err?.message || 'unknown') });
        }
        return;
      }

      // Edge TTS - 获取可用语音列表
      if (targetUrl.startsWith('/api/tts-voices')) {
        this.json(res, 200, { data: { voices: EDGE_TTS_VOICES } });
        return;
      }

      this.json(res, 404, { error: 'not found' });
    } catch {
      this.json(res, 500, { error: 'proxy error' });
    }
  }
}
