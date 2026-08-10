// ============================================================
// Vite 插件：在 dev 模式下接管 /api/*，直接调用 Vercel Functions
// 解决痛点：tsx/ESM 在 CJS + 相对路径下 import ../../_shared/response 失败
// 做法：使用 vite + esbuild 在运行时把 TS 转成 JS，并写个临时 require shim
// 让相对 import 能在当前文件目录下解析。
// ============================================================
import type { Plugin } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

type AnyObj = Record<string, any>;

function vercelShimMiddleware(rootDir: string) {
  const API_DIR = path.resolve(rootDir, 'api');
  const CACHE = new Map<string, AnyObj>(); // 缓存 esbuild 编译结果

  function readBody(req: any): Promise<any> {
    return new Promise((resolve, reject) => {
      let raw = '';
      req.on('data', (c: Buffer) => { raw += c; });
      req.on('end', () => {
        try {
          if (!raw) return resolve(undefined);
          const ct = req.headers['content-type'] || '';
          if (ct.includes('application/json')) resolve(JSON.parse(raw));
          else resolve(raw);
        } catch (e) { reject(e); }
      });
      req.on('error', reject);
    });
  }

  function parseCookies(req: any): AnyObj {
    const out: AnyObj = {};
    const c = req.headers.cookie;
    if (!c) return out;
    c.split(';').forEach((s: string) => {
      const [k, v] = s.split('=');
      if (k) out[k.trim()] = decodeURIComponent((v || '').trim());
    });
    return out;
  }

  async function loadHandler(tsfile: string) {
    if (CACHE.has(tsfile)) return CACHE.get(tsfile);
    // 用 esbuild 把 TS 转成 CJS — 关键是处理 TS 的 relative import
    const { transform } = await import('esbuild');
    const src = fs.readFileSync(tsfile, 'utf8');
    // 1) 在 TS 源码里做相对路径修正：把所有 from '../_shared/xxx' 改成绝对路径
    const apiDir = API_DIR;
    const sharedDir = path.join(apiDir, '_shared');
    let rewritten = src;
    // 处理所有 import ... from 'RELATIVE_PATH' 或 export ... from 'RELATIVE_PATH'
    rewritten = rewritten.replace(/(from\s+['"])(\.[^'"]+)(['"])/g, (m, pre, rel, post) => {
      const abs = path.resolve(path.dirname(tsfile), rel);
      // 如果 abs.ts 不存在，试试 abs.js / abs/index.ts
      let real = abs;
      for (const ext of ['.ts', '.js', '/index.ts', '/index.js', '']) {
        if (fs.existsSync(abs + ext)) { real = abs + ext; break; }
      }
      // 返回绝对路径 + 带 file ext 的 require 路径（CJS）
      // Windows 下把反斜杠统一为正斜杠，避免生成 JS 字符串时被转义成控制字符
      const out = pre + real.replace(/\\/g, '/') + post;
      console.log('[vercel-dev] rewrite import:', rel, '->', out);
      return out;
    });
    // 2) 把 '@vercel/node' 的 type-only 导入去掉（不影响运行）
    rewritten = rewritten.replace(/^\s*import\s+type\s+[^;]+;\s*$/gm, '');
    // 3) esbuild 转成 CJS（去掉 TS 的 export default 语法）
    const result = await transform(rewritten, {
      loader: 'ts',
      target: 'node20',
      format: 'cjs',
      sourcefile: tsfile,
    });
    const code = result.code;
    // 4) 用 Node Module API 编译 require
    const Module = module.constructor as any;
    const mod = new Module(tsfile, module);
    mod.filename = tsfile;
    mod.paths = Module._nodeModulePaths(path.dirname(tsfile)).concat(
      Module._nodeModulePaths(process.cwd())
    );
    // 注册 .ts 后缀 handler：直接调用 _compile
    const orig = require.extensions['.ts'];
    if (!require.extensions['.ts']) {
      require.extensions['.ts'] = function (m: any, fname: string) {
        // 这个路径不会走到，因为我们都在 mod._compile 里处理了
        m._compile(fs.readFileSync(fname, 'utf8'), fname);
      };
    }
    mod._compile(code, tsfile);
    const fn = (mod.exports && (mod.exports.default || mod.exports)) || null;
    if (typeof fn !== 'function') {
      throw new Error(tsfile + ' 没有导出 default 函数 (got: ' + typeof fn + ')');
    }
    CACHE.set(tsfile, fn);
    return fn;
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

  return async (req: any, res: any, next: any) => {
    const url = req.url || '/';
    const pathname = url.split('?')[0];
    // 处理 OPTIONS
    if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.end();
      return;
    }
    const tsfile = resolveHandler(pathname);
    if (!tsfile) return next();
    const t0 = Date.now();
    try {
      const u = new URL(url, 'http://localhost');
      const query: AnyObj = {};
      u.searchParams.forEach((v, k) => {
        if (k in query) { query[k] = [].concat(query[k], v); }
        else query[k] = v;
      });
      const body = await readBody(req);
      const vercelReq: any = req;
      vercelReq.query = query;
      vercelReq.cookies = parseCookies(req);
      vercelReq.body = body;
      const vercelRes: any = res;
      vercelRes.status = (code: number) => { res.statusCode = code; return vercelRes; };
      vercelRes.json = (obj: any) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.end(JSON.stringify(obj));
        return vercelRes;
      };
      vercelRes.send = (s: any) => { res.end(s); return vercelRes; };
      vercelRes.redirect = (a: any, b: any) => {
        const code = typeof a === 'number' ? a : 302;
        const target = typeof a === 'string' ? a : (b || '/');
        res.statusCode = code;
        res.setHeader('Location', target);
        res.end();
        return vercelRes;
      };
      vercelRes.cookie = (name: string, value: any, opts: any) => {
        const parts = [`${name}=${encodeURIComponent(value)}`];
        if (opts?.httpOnly) parts.push('HttpOnly');
        if (opts?.secure) parts.push('Secure');
        if (opts?.path) parts.push('Path=' + opts.path);
        if (opts?.maxAge != null) parts.push('Max-Age=' + opts.maxAge);
        if (opts?.sameSite) parts.push('SameSite=' + opts.sameSite);
        const prev = res.getHeader('Set-Cookie') as any[] || [];
        res.setHeader('Set-Cookie', prev.concat(parts.join('; ')));
        return vercelRes;
      };
      const handler = await loadHandler(tsfile);
      await handler(vercelReq, vercelRes);
      if (!res.headersSent) { vercelRes.status(200).json({ ok: true }); }
      console.log('[api]', (Date.now() - t0) + 'ms', req.method, pathname, '→', res.statusCode);
    } catch (e: any) {
      console.error('[api] 500:', pathname, '\n', e && e.stack ? e.stack : e);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.end(JSON.stringify({ error: 'Internal Server Error', message: String(e && e.message || e) }));
    }
  };
}

export default function vercelFunctionsPlugin(): Plugin {
  const root = process.cwd();
  return {
    name: 'vite-plugin-vercel-functions-dev',
    configureServer(server) {
      server.middlewares.use(vercelShimMiddleware(root));
    },
    configurePreviewServer(server) {
      server.middlewares.use(vercelShimMiddleware(root));
    },
  };
}
