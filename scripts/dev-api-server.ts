// ============================================================
// 本地 19101 API Server - ESM 版本（配合 tsx 执行）
//   npx tsx scripts/dev-api-server.ts
// 目的：把 /workspace/api/*.ts 的 Vercel Functions 按 ESM 方式动态
// import，避免 CJS 下 `import X from './relative'` 失效。
// ============================================================

import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 19101);
const API_DIR = path.resolve(__dirname, '..', 'lib', 'handlers');

const CACHE = new Map();

function listApiRoutes() {
  const out: string[] = [];
  const scan = (dir: string, prefix = '') => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const s = fs.statSync(full);
      if (s.isDirectory() && name !== '_shared' && name !== 'node_modules') {
        scan(full, prefix + name + '/');
      } else if (name.endsWith('.ts') && !name.startsWith('_')) {
        out.push('/api/' + prefix + name.replace(/\.ts$/, ''));
      }
    }
  };
  try { scan(API_DIR); } catch {}
  return out;
}

function resolveHandler(urlpath: string): string | null {
  if (!urlpath.startsWith('/api/')) return null;
  const rel = urlpath.slice('/api/'.length).split('?')[0].replace(/\/+$/, '');
  if (!rel) return null;
  const candidates = [
    path.join(API_DIR, rel + '.ts'),
    path.join(API_DIR, rel, 'index.ts'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

async function loadHandler(tsfile: string) {
  if (CACHE.has(tsfile)) return CACHE.get(tsfile);
  const url = pathToFileURL(tsfile).toString() + '?t=' + Date.now();
  const mod = await import(url);
  const fn: any = (mod && (mod.default || mod)) || null;
  if (typeof fn !== 'function') {
    throw new Error(tsfile + ' 没有导出 default async function handler(req, res)');
  }
  CACHE.set(tsfile, fn);
  return fn;
}

type Req = http.IncomingMessage & { query?: any; cookies?: any; body?: any };
type Res = http.ServerResponse & {
  status?: (code: number) => Res;
  json?: (obj: any) => Res;
  send?: (s: any) => Res;
  redirect?: (a: any, b?: any) => Res;
  cookie?: (name: string, value: any, opts?: any) => Res;
};

function polyfillRequest(req: Req): Promise<Req> {
  return new Promise((resolve, reject) => {
    const u = new URL(req.url || '/', 'http://localhost');
    req.query = Object.fromEntries(u.searchParams.entries());
    req.cookies = {};
    const c = req.headers.cookie;
    if (c) {
      c.split(';').forEach((s) => {
        const [k, v] = s.split('=');
        if (k) req.cookies![k.trim()] = decodeURIComponent((v || '').trim());
      });
    }
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try {
        if (raw) {
          const ct = req.headers['content-type'] || '';
          if (ct.includes('application/json')) req.body = JSON.parse(raw);
          else req.body = raw;
        } else req.body = undefined;
        resolve(req);
      } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function polyfillResponse(res: Res): Res {
  const origSetHeader = res.setHeader.bind(res);
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj: any) => {
    origSetHeader('Content-Type', 'application/json; charset=utf-8');
    origSetHeader('Access-Control-Allow-Origin', '*');
    origSetHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    origSetHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.end(JSON.stringify(obj));
    return res;
  };
  res.send = (s) => { res.end(s); return res; };
  res.redirect = (a, b) => {
    const code = typeof a === 'number' ? a : 302;
    const url = typeof a === 'string' ? a : (b || '/');
    res.statusCode = code;
    origSetHeader('Location', url as string);
    res.end();
    return res;
  };
  res.cookie = (name, value, opts) => {
    const parts = [`${name}=${encodeURIComponent(value)}`];
    if (opts?.httpOnly) parts.push('HttpOnly');
    if (opts?.secure) parts.push('Secure');
    if (opts?.path) parts.push('Path=' + opts.path);
    if (opts?.maxAge != null) parts.push('Max-Age=' + opts.maxAge);
    if (opts?.sameSite) parts.push('SameSite=' + opts.sameSite);
    const prev = res.getHeader('Set-Cookie') as any[] || [];
    res.setHeader('Set-Cookie', prev.concat(parts.join('; ')));
    return res;
  };
  return res;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.end();
      return;
    }
    const u = new URL(req.url || '/', 'http://localhost');
    const tsfile = resolveHandler(u.pathname);
    if (!tsfile) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('[dev-api-server] 404: ' + u.pathname + '\n可用 endpoints:\n' + listApiRoutes().join('\n'));
      return;
    }
    const t0 = Date.now();
    const vr = await polyfillRequest(req);
    const vs = polyfillResponse(res);
    const handler = await loadHandler(tsfile);
    await handler(vr, vs);
    if (!res.headersSent) vs.status!(200).json!({ ok: true });
    console.log('[api]', (Date.now() - t0) + 'ms', req.method, u.pathname, '→', res.statusCode);
  } catch (e: any) {
    console.error('[api] 500:', req.url, '\n', e && e.stack ? e.stack : e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify({ error: 'Internal Server Error', message: String(e && e.message || e) }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('✅ StockExt dev API server listening on http://localhost:' + PORT);
  console.log('Routes:\n  ' + listApiRoutes().join('\n  '));
});
