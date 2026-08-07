// ============================================================
// StockExt 本地代理服务器
// - 托管 webapp 构建产物（webapp/dist）
// - 代理 /api/* 到东方财富/新浪/腾讯等数据源
// - SPA fallback 到 index.html
// - 绑定 0.0.0.0:5000，手机浏览器可直接访问
//
// 启动：npx tsx scripts/server.ts
// ============================================================

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const API_DIR = path.resolve(ROOT, 'api');
const WEBAPP_DIST = path.resolve(ROOT, 'webapp/dist');
const PORT = Number(process.env.PORT || 5000);

// ============ MIME types ============
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
};

// ============ API handler loading (ESM dynamic import) ============
const CACHE = new Map<string, any>();

function listApiRoutes(): string[] {
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

// ============ Request/Response polyfills (Vercel compat) ============
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

// ============ Static file serving ============
function serveStatic(filePath: string, res: http.ServerResponse): boolean {
  if (!fs.existsSync(filePath)) return false;
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) return false;
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  res.statusCode = 200;
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Length', stat.size);
  if (ext === '.js' || ext === '.mjs' || ext === '.css') {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  fs.createReadStream(filePath).pipe(res);
  return true;
}

// ============ Main server ============
const server = http.createServer(async (req, res) => {
  const url = req.url || '/';
  const pathname = new URL(url, 'http://localhost').pathname;

  // CORS preflight
  if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.end();
    return;
  }

  // API routes → proxy to data sources
  if (pathname.startsWith('/api/')) {
    const tsfile = resolveHandler(pathname);
    if (!tsfile) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Not Found', path: pathname }));
      return;
    }
    const t0 = Date.now();
    try {
      const vr = await polyfillRequest(req as Req);
      const vs = polyfillResponse(res as Res);
      const handler = await loadHandler(tsfile);
      await handler(vr, vs);
      if (!res.headersSent) {
        (vs as Res).status!(200).json!({ ok: true });
      }
      console.log('[api]', (Date.now() - t0) + 'ms', req.method, pathname, '→', res.statusCode);
    } catch (e: any) {
      console.error('[api] 500:', url, '\n', e && e.stack ? e.stack : e);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({ error: 'Internal Server Error', message: String(e && e.message || e) }));
    }
    return;
  }

  // Static files from webapp/dist
  let filePath = path.join(WEBAPP_DIST, pathname);
  if (serveStatic(filePath, res)) return;

  // Try index.html for directory paths
  if (pathname.endsWith('/')) {
    const indexPath = path.join(WEBAPP_DIST, pathname, 'index.html');
    if (serveStatic(indexPath, res)) return;
  }

  // SPA fallback → index.html
  const indexPath = path.join(WEBAPP_DIST, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    fs.createReadStream(indexPath).pipe(res);
    return;
  }

  res.statusCode = 404;
  res.end('Not Found. Make sure webapp is built: cd webapp && npm run build');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 StockExt 本地代理服务器已启动`);
  console.log(`   地址: http://0.0.0.0:${PORT}`);
  console.log(`   静态文件: ${WEBAPP_DIST}`);
  console.log(`   API 路由:`);
  for (const r of listApiRoutes()) console.log(`     ${r}`);
  console.log();
});
