// ============================================
// API 层 HTTP 请求工具：统一用 Node 20 内置 fetch
// 原因：容器内 HTTP_PROXY 通过 NODE_OPTIONS preload 打补丁，只有 fetch(undici) 兼容
// 编码：自动从 Content-Type 解析 charset，支持 GBK/GB2312/Big5/UTF-8
// 使用 iconv-lite 做可靠解码（规避 Vite/esbuild 转译环境下 TextDecoder gbk 失败问题）
// ============================================

import iconv from 'iconv-lite';
import https from 'node:https';
import http from 'node:http';

const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// 从 Content-Type 头解析 charset，默认 utf-8
function parseCharset(contentType: string | null): string {
  if (!contentType) return 'utf-8';
  const m = contentType.match(/charset=([\w-]+)/i);
  if (m) {
    const cs = m[1].toLowerCase();
    if (cs === 'gbk' || cs === 'gb2312' || cs === 'gb18030' || cs === 'hz-gb-2312') return 'gbk';
    if (cs === 'big5' || cs === 'big5-hkscs') return 'big5';
    return cs;
  }
  return 'utf-8';
}

// 读取响应为 ArrayBuffer 并按正确 charset 解码为字符串
// 优先使用 iconv-lite（支持 gbk/big5），其他编码用 TextDecoder 兜底
async function responseToText(r: Response): Promise<string> {
  const buf = await r.arrayBuffer();
  const bytes = Buffer.from(buf);
  const charset = parseCharset(r.headers.get('content-type'));
  if (charset === 'gbk' || charset === 'big5' || iconv.encodingExists(charset)) {
    try {
      return iconv.decode(bytes, charset);
    } catch {
      // fall through
    }
  }
  try {
    const dec = new TextDecoder(charset, { fatal: false });
    return dec.decode(buf);
  } catch {
    return bytes.toString('utf-8');
  }
}

// 按 charset 解码 Buffer（iconv-lite 优先，支持 gbk/big5）
function decodeBytes(bytes: Buffer, contentType: string | null): string {
  const charset = parseCharset(contentType);
  if (iconv.encodingExists(charset)) {
    try { return iconv.decode(bytes, charset); } catch { /* fall through */ }
  }
  try {
    return new TextDecoder(charset, { fatal: false }).decode(bytes);
  } catch {
    return bytes.toString('utf-8');
  }
}

// Node 内置 http(s).get 兜底：fetch 不可用/出错（如 Node16 polyfill 对部分站点 socket hang up）时使用
function nativeGetText(fullUrl: string, headers: Record<string, string>, redirects = 3): Promise<string> {
  return new Promise((resolve) => {
    try {
      const u = new URL(fullUrl);
      const mod: any = u.protocol === 'https:' ? https : http;
      const req = mod.get(u, { headers }, (res: any) => {
        const sc = res.statusCode || 0;
        if ([301, 302, 303, 307, 308].includes(sc) && res.headers.location && redirects > 0) {
          res.resume();
          resolve(nativeGetText(new URL(res.headers.location, fullUrl).toString(), headers, redirects - 1));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve(decodeBytes(Buffer.concat(chunks), res.headers['content-type'] || null)));
        res.on('error', () => resolve(''));
      });
      req.on('error', () => resolve(''));
      req.setTimeout(15000, () => req.destroy());
    } catch { resolve(''); }
  });
}

// push2/push2his 主站在部分网络下会被阻断（socket hang up），自动切换延时镜像（接口格式完全一致）
function withPush2Mirror(url: string): string {
  if (/^https?:\/\/push2\.eastmoney\.com\//.test(url)) return url.replace('//push2.eastmoney.com/', '//push2delay.eastmoney.com/');
  if (/^https?:\/\/push2his\.eastmoney\.com\//.test(url)) return url.replace('//push2his.eastmoney.com/', '//push2delay.eastmoney.com/');
  return url;
}

// 统一文本获取：优先 fetch（Vercel Node20 原生），失败自动回退原生 http(s).get；push2 失败再切镜像
async function fetchText(fullUrl: string, referer?: string): Promise<string> {
  const headers: Record<string, string> = { 'User-Agent': DEFAULT_UA, ...(referer ? { Referer: referer } : {}) };
  const targets = [fullUrl];
  const mirror = withPush2Mirror(fullUrl);
  if (mirror !== fullUrl) targets.push(mirror);
  for (const target of targets) {
    try {
      if (typeof fetch === 'function') {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 15000);
        const r = await fetch(target, { headers, signal: ctrl.signal } as any);
        clearTimeout(t);
        if (r && typeof (r as any).arrayBuffer === 'function') return await responseToText(r as Response);
      }
    } catch { /* fall through to native get */ }
    const text = await nativeGetText(target, headers);
    if (text) return text;
  }
  return '';
}

export async function httpGetJson(fullUrl: string, referer?: string): Promise<any> {
  const text = await fetchText(fullUrl, referer);
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

// 原生 http(s) POST 兜底
function nativePost(fullUrl: string, body: string, headers: Record<string, string>): Promise<string> {
  return new Promise((resolve) => {
    try {
      const u = new URL(fullUrl);
      const mod: any = u.protocol === 'https:' ? https : http;
      const req = mod.request(u, { method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(body) } }, (res: any) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve(decodeBytes(Buffer.concat(chunks), res.headers['content-type'] || null)));
        res.on('error', () => resolve(''));
      });
      req.on('error', () => resolve(''));
      req.setTimeout(15000, () => req.destroy());
      req.write(body);
      req.end();
    } catch { resolve(''); }
  });
}

// POST JSON：优先 fetch，失败回退原生 request
export async function httpPostJson(fullUrl: string, body: any, referer?: string): Promise<any> {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  const headers: Record<string, string> = { 'User-Agent': DEFAULT_UA, 'Content-Type': 'application/json', ...(referer ? { Referer: referer } : {}) };
  try {
    if (typeof fetch === 'function') {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const r = await fetch(fullUrl, { method: 'POST', headers, body: payload, signal: ctrl.signal } as any);
      clearTimeout(t);
      const text = await responseToText(r as Response);
      if (text) return JSON.parse(text);
    }
  } catch { /* fall through */ }
  const text = await nativePost(fullUrl, payload, headers);
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

export async function httpsGetText(fullUrl: string, referer?: string): Promise<string> {
  return fetchText(fullUrl, referer);
}

// ============ 代码格式转换 ============
export function toSinaCode(code: string): string {
  const c = code.replace(/[.$\s]/g, '').toLowerCase();
  if (/^(sh|sz|bj)/.test(c)) return c;
  if (/^(60|68|90|11|13|50|56|51|58)/.test(c)) return `sh${c}`;
  if (/^(00|30|20|12|15|16|18|159)/.test(c)) return `sz${c}`;
  if (/^(43|83|87|92|88)/.test(c)) return `bj${c}`;
  return `sh${c}`;
}
export function toTencentCode(code: string): string { return toSinaCode(code); }
export function toCleanCode(sinaCode: string): string { return sinaCode.replace(/^(sh|sz|bj)/, ''); }

// ============ JSONP 解析 ============
export function stripJsonp(text: string): any {
  let t = String(text || '').replace(/^\/\*<script>[\s\S]*?<\/script>\*\/\s*/, '');
  // Sina JSONP: =([...]);  东财 JSONP: callback({...})  普通JSON: {...}
  const m1 = t.match(/=\(([\s\S]+)\)\s*;?\s*$/);
  if (m1) { try { return JSON.parse(m1[1]); } catch { /* empty */ } }
  const m2 = t.match(/^\w+\(([\s\S]+)\)\s*;?\s*$/);
  if (m2) { try { return JSON.parse(m2[1]); } catch { /* empty */ } }
  try { return JSON.parse(t); } catch { return null; }
}

// ============ 腾讯行情文本 -> diff 数组（f2/f3/... 格式） ============
export function tencentTextToDiff(text: string): any[] {
  return text.split('\n').filter((l) => l.trim()).map((line) => {
    const m = line.match(/v_([a-z]{2}\d+)="(.*)"/);
    if (!m) return null;
    const p = m[2].split('~');
    const result: any = {
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
      // 五档盘口
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
      // 腾讯估值字段：p[39]=PE动态 p[43]=振幅 p[44]=总市值(亿) p[45]=流通市值(亿) p[46]=PB
      _tqPE: parseFloat(p[39]) || 0, _tqAmplitude: parseFloat(p[43]) || 0,
      _tqTotalCap: parseFloat(p[44]) || 0, _tqFloatCap: parseFloat(p[45]) || 0,
      _tqPB: parseFloat(p[46]) || 0,
    };
    return result;
  }).filter(Boolean);
}
