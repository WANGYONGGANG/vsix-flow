// ============================================
// API 层 HTTP 请求工具 + 代码转换（来自 VSCode 扩展）
// ============================================

import * as https from 'https';
import * as http from 'http';

const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export function httpGetJson(fullUrl: string, referer?: string): Promise<any> {
  return new Promise((resolve) => {
    const headers: Record<string, string> = { 'User-Agent': DEFAULT_UA };
    if (referer) headers['Referer'] = referer;
    const mod = fullUrl.startsWith('https') ? https : http;
    const req = mod.get(fullUrl, { headers, timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

export function httpsGetText(fullUrl: string, referer?: string): Promise<string> {
  return new Promise((resolve) => {
    const headers: Record<string, string> = { 'User-Agent': DEFAULT_UA };
    if (referer) headers['Referer'] = referer;
    const req = https.get(fullUrl, { headers, timeout: 15000 }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        try { resolve(buf.toString('utf8')); } catch { resolve(''); }
      });
    });
    req.on('error', () => resolve(''));
    req.on('timeout', () => { req.destroy(); resolve(''); });
  });
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
  const m1 = t.match(/=\(([\s\S]+)\)$/);
  if (m1) { try { return JSON.parse(m1[1]); } catch { /* empty */ } }
  const m2 = t.match(/^\w+\(([\s\S]+)\)$/);
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
    };
    return result;
  }).filter(Boolean);
}
