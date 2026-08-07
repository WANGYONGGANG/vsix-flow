import { defineConfig, type Plugin, type Connect } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const _require = createRequire(import.meta.url);

// ============================================================
// 内嵌 vercel functions shim：vite middleware 在 /api/* 时，
// 用 esbuild 把 TS 转成 CJS 并按 Vercel request/response 调用。
// 注意：插件 config 文件是 TS → vite 自己会用 esbuild-register 转，
// 所以我们用 CJS 风格写 shim，直接 fs.read + esbuild.transformSync。
// ============================================================

function listApiRoutes(apiDir: string): string[] {
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
  try { scan(apiDir); } catch {}
  return out;
}

function resolveHandler(apiDir: string, urlpath: string): string | null {
  if (!urlpath.startsWith('/api/')) return null;
  const rel = urlpath.slice('/api/'.length).split('?')[0].replace(/\/+$/, '');
  if (!rel) return null;
  const candidates = [
    path.join(apiDir, rel + '.ts'),
    path.join(apiDir, rel, 'index.ts'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

// 同步版 esbuild transform：用 createRequire 拿到 ESM 下可用的 require
let _esbuild: any = null;
function ensureESBuild(): any {
  if (_esbuild) return _esbuild;
  try { _esbuild = _require('esbuild'); } catch { _esbuild = null; }
  return _esbuild;
}

// 转义 require（相对路径 → 绝对路径） + compile CJS
const COMPILE_CACHE = new Map<string, any>();
function compileHandler(tsfile: string): any {
  if (COMPILE_CACHE.has(tsfile)) return COMPILE_CACHE.get(tsfile);
  const esbuild = ensureESBuild();
  if (!esbuild) throw new Error('esbuild 未安装：请 npm i -D esbuild');
  const src = fs.readFileSync(tsfile, 'utf8');
  // 改写所有 import/export 里的相对路径为绝对路径，保证 CJS require.resolve 能找到
  let rewritten = src
    // 1) 去掉 import type 行（纯类型）
    .replace(/^\s*import\s+type\s+[^;]*?;\s*$/gm, '')
    // 2) import X from '相对路径'
    .replace(/(import\s+[^'"]+?from\s+['"])(\.[^'"]+)(['"])/g,
      (_m: any, pre: string, rel: string, post: string) => pre + resolveRelAbs(tsfile, rel) + post)
    // 3) export { X } from '相对路径' / export * from '相对路径'
    .replace(/(export\s+(?:\{[^}]*\}|\*)\s+from\s+['"])(\.[^'"]+)(['"])/g,
      (_m: any, pre: string, rel: string, post: string) => pre + resolveRelAbs(tsfile, rel) + post);
  const { code } = esbuild.transformSync(rewritten, {
    loader: 'ts',
    target: 'node20',
    format: 'cjs',
    sourcefile: tsfile,
  });
  // ESM 下无 module/require：通过 createRequire 访问 Module 构造器
  const ModuleCtor: any = _require('module').Module;
  const mod = new ModuleCtor(tsfile);
  mod.filename = tsfile;
  mod.paths = ModuleCtor._nodeModulePaths(path.dirname(tsfile)).concat(
    ModuleCtor._nodeModulePaths(process.cwd())
  );
  // 注册 .ts 后缀避免 CJS 不识别：被 require 的 .ts 也要走 esbuild 转译 + 相对路径修正
  if (!_require.extensions['.ts']) {
    _require.extensions['.ts'] = function (m: any, fname: string) {
      const esb = ensureESBuild();
      const src = fs.readFileSync(fname, 'utf8');
      const rewritten = src
        .replace(/^\s*import\s+type\s+[^;]*?;\s*$/gm, '')
        .replace(/(import\s+[^'"]+?from\s+['"])(\.[^'"]+)(['"])/g,
          (_m: any, pre: string, rel: string, post: string) => pre + resolveRelAbs(fname, rel) + post)
        .replace(/(export\s+(?:\{[^}]*\}|\*)\s+from\s+['"])(\.[^'"]+)(['"])/g,
          (_m: any, pre: string, rel: string, post: string) => pre + resolveRelAbs(fname, rel) + post);
      const { code } = esb.transformSync(rewritten, {
        loader: 'ts', target: 'node20', format: 'cjs', sourcefile: fname,
      });
      m._compile(code, fname);
    };
  }
  mod._compile(code, tsfile);
  const fn: any = (mod.exports && (mod.exports.default || mod.exports)) || null;
  if (typeof fn !== 'function') throw new Error(tsfile + ' 没有 default async 函数');
  COMPILE_CACHE.set(tsfile, fn);
  return fn;
}

function resolveRelAbs(tsfile: string, rel: string): string {
  const base = path.dirname(tsfile);
  const abs = path.resolve(base, rel);
  // 尝试文件后缀 / index
  for (const ext of ['.ts', '.js', '/index.ts', '/index.js', '']) {
    if (fs.existsSync(abs + ext)) return abs + ext;
  }
  return abs;
}

function readBody(req: Connect.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c: Buffer) => { raw += c; });
    req.on('end', () => {
      try {
        if (!raw) return resolve(undefined);
        const ct = String(req.headers['content-type'] || '');
        if (ct.includes('application/json')) resolve(JSON.parse(raw));
        else resolve(raw);
      } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function parseCookies(req: Connect.IncomingMessage): any {
  const out: any = {};
  const c = req.headers.cookie;
  if (!c) return out;
  c.split(';').forEach((s: string) => {
    const [k, v] = s.split('=');
    if (k) out[k.trim()] = decodeURIComponent((v || '').trim());
  });
  return out;
}

function vercelFunctionsPlugin(rootDir: string): Plugin {
  const apiDir = path.resolve(rootDir, 'lib', 'handlers');

  const mw: Connect.NextHandleFunction = async (req, res, next) => {
    const url = req.url || '/';
    const pathname = url.split('?')[0];
    if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.end();
      return;
    }
    const tsfile = resolveHandler(apiDir, pathname);
    if (!tsfile) return next();
    const t0 = Date.now();
    try {
      const u = new URL(url, 'http://localhost');
      const query: any = {};
      u.searchParams.forEach((v, k) => {
        if (k in query) { query[k] = [].concat(query[k], v); }
        else query[k] = v;
      });
      const body = await readBody(req);
      const vreq: any = req; vreq.query = query; vreq.cookies = parseCookies(req); vreq.body = body;
      const vres: any = res;
      vres.status = (code: number) => { res.statusCode = code; return vres; };
      vres.json = (obj: any) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.end(JSON.stringify(obj));
        return vres;
      };
      vres.send = (s: any) => { res.end(s); return vres; };
      vres.redirect = (a: any, b: any) => {
        const code = typeof a === 'number' ? a : 302;
        const target = typeof a === 'string' ? a : (b || '/');
        res.statusCode = code; res.setHeader('Location', target); res.end();
        return vres;
      };
      vres.cookie = (name: string, value: any, opts: any) => {
        const parts = [`${name}=${encodeURIComponent(value)}`];
        if (opts?.httpOnly) parts.push('HttpOnly');
        if (opts?.secure) parts.push('Secure');
        if (opts?.path) parts.push('Path=' + opts.path);
        if (opts?.maxAge != null) parts.push('Max-Age=' + opts.maxAge);
        if (opts?.sameSite) parts.push('SameSite=' + opts.sameSite);
        const prev = res.getHeader('Set-Cookie') as any[] || [];
        res.setHeader('Set-Cookie', prev.concat(parts.join('; ')));
        return vres;
      };
      const fn = compileHandler(tsfile);
      await fn(vreq, vres);
      if (!res.headersSent) vres.status(200).json({ ok: true });
      console.log('[api]', (Date.now() - t0) + 'ms', req.method, pathname, '→', res.statusCode);
    } catch (e: any) {
      console.error('[api] 500:', pathname, e && e.stack ? e.stack : e);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({ error: 'Internal Server Error', message: String(e && e.message || e) }));
    }
  };

  return {
    name: 'vite-plugin-vercel-functions-inline',
    configureServer(server) {
      // 中间件必须在 vite 的 HTML 回退中间件之前插入，才能处理 /api（否则被 SPA fallback 吞）
      server.middlewares.use(mw);
    },
    configurePreviewServer(server) {
      server.middlewares.use(mw);
    },
  };
}

const ROOT = process.cwd();
console.log('[vite] Handlers dir resolved:', path.resolve(ROOT, '..', 'lib', 'handlers'));
console.log('[vite] API routes:\n  ' + listApiRoutes(path.resolve(ROOT, '..', 'lib', 'handlers')).join('\n  '));

export default defineConfig({
  plugins: [
    react(),
    vercelFunctionsPlugin(path.resolve(ROOT, '..')),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'favicon.svg'],
      manifest: {
        name: 'StockExt 行情中心',
        short_name: 'StockExt',
        description: 'A股行情追踪 - 实时行情/自选/板块/龙虎/快讯/AI分析',
        theme_color: '#0a0c10',
        background_color: '#0a0c10',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
        shortcuts: [
          {
            name: '自选股',
            short_name: '自选',
            description: '查看自选股行情',
            url: '/?tab=watchlist',
            icons: [{ src: 'icon-192.png', sizes: '192x192' }],
          },
          {
            name: '大盘概况',
            short_name: '概况',
            description: '查看大盘指数',
            url: '/?tab=overview',
            icons: [{ src: 'icon-192.png', sizes: '192x192' }],
          },
          {
            name: '资金流向',
            short_name: '资金',
            description: '查看资金流向',
            url: '/?tab=capital',
            icons: [{ src: 'icon-192.png', sizes: '192x192' }],
          },
          {
            name: '快讯',
            short_name: '快讯',
            description: '查看最新快讯',
            url: '/?tab=flash',
            icons: [{ src: 'icon-192.png', sizes: '192x192' }],
          },
        ],
        share_target: {
          action: '/share',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
          },
        },
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', expiration: { maxEntries: 200, maxAgeSeconds: 60 } },
          },
        ],
      },
    }),
  ],
  server: {
    // 用内置插件接管 /api；如需 VSCode 扩展本地代理：VITE_API_PROXY=http://localhost:19101 npm run dev
    proxy: process.env.VITE_API_PROXY
      ? { '/api': { target: process.env.VITE_API_PROXY, changeOrigin: true } }
      : undefined,
  },
});
