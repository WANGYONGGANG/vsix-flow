// ============================================
// VSCode 扩展 - 统一数据请求入口
// 优先云端 apiBaseUrl（配置的 Vercel 域名），兜底本地 Node 代理
// ============================================

import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import { getProxyPort } from './proxyPort';

let cachedApiBase: string | null = null;
let cachedApiBaseExpires = 0;

/** 从 VSCode 配置读取云端 API base；无则返回空字符串 */
export function getConfiguredApiBase(): string {
  try {
    if (Date.now() < cachedApiBaseExpires && cachedApiBase !== null) return cachedApiBase;
    const cfg = vscode.workspace.getConfiguration('stock-ext');
    const v = String(cfg.get<string>('apiBaseUrl') || '').trim().replace(/\/$/, '');
    cachedApiBase = v;
    cachedApiBaseExpires = Date.now() + 2000;
    return v;
  } catch { return ''; }
}

/** 构造请求 URL：如果配置了云端 API，用它；否则用 localhost 代理 */
export function resolveApiUrl(path: string): { mode: 'cloud' | 'local'; url: string } {
  const cloud = getConfiguredApiBase();
  if (cloud) return { mode: 'cloud', url: cloud + path };
  return { mode: 'local', url: `http://localhost:${getProxyPort()}${path}` };
}

/** 统一 GET JSON 请求（支持 https） */
export function apiGet<T = any>(path: string, timeoutMs = 12000): Promise<T | null> {
  const { mode, url } = resolveApiUrl(path);
  return new Promise((resolve) => {
    const headers: Record<string, string> = {
      'User-Agent': 'StockExt/5.0 (+https://github.com/stockext)',
    };
    if (mode === 'cloud') headers['Accept'] = 'application/json';
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers, timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(data) as T); }
        catch { resolve(null); }
      });
    });
    req.on('error', (e) => {
      console.warn(`[StockExt] apiGet fail ${mode} ${path}: ${e.message}`);
      // cloud 失败时自动回退本地
      if (mode === 'cloud') {
        const fallback = `http://localhost:${getProxyPort()}${path}`;
        const r2 = http.get(fallback, { timeout: timeoutMs }, (r2) => {
          let d = '';
          r2.on('data', (c) => { d += c; });
          r2.on('end', () => {
            try { resolve(JSON.parse(d) as T); } catch { resolve(null); }
          });
        });
        r2.on('error', () => resolve(null));
        r2.setTimeout(timeoutMs, () => { r2.destroy(); resolve(null); });
      } else {
        resolve(null);
      }
    });
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve(null); });
  });
}
