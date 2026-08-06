// ============================================================
// 本地 19101 API Server（Vercel Functions 兼容适配层）
// 作用：把 Vercel Serverless Functions（/workspace/api/*.ts）动态
// 加载，并用原生 Node http 模拟成 VercelRequest / VercelResponse。
// 这样 vite dev 的 server.proxy 指向 http://localhost:19101 就能看到
// 真实行情数据，而不是 401/ECONNREFUSED 占位。
//
// 用法：node scripts/dev-api-server.cjs   (因为要 require @vercel/node 的类型)
//     或者用 tsx：但 Vercel functions 用的是 import TS，我们这里用 ts-node
//     不现实，改用动态 import() ESM + 纯 Node 写 polyfill。
//
// 注意：API 文件 export default async function handler(req, res) {...}
// 我们需要把 Node 的 IncomingMessage / ServerResponse 包装成
// 符合 @vercel/node 签名的对象（添加 query, status, setHeader, json,
// cookie 等方法）。
// ============================================================

const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 19101);
const API_DIR = process.env.API_DIR || path.resolve(__dirname, '..', 'api');
const tsnode = process.env.TS_NODE_TRANSPILE_ONLY;

// --------- 简单的 require TS 支持 ---------
// 尝试用 tsx (esbuild-kit) 跑 .ts 文件。如果没有 tsx，则走
// dynamic import 要求 ESM / ts-node。这里我们让用户自己安装好 tsx，
// 然后这个脚本要求：npx tsx scripts/dev-api-server.ts (ESM)，
// 但为了零依赖，改用另一个更直接办法：
// 直接用 Node 22 支持的 --experimental-strip-types + --experimental-detect-module。
// 但 Node 22 不稳定。我们改用 esbuild 转译 .ts 为 .js：
let transform;
try {
  const esbuild = require('esbuild');
  transform = (code, filepath) =>
    esbuild.transformSync(code, {
      loader: 'ts',
      target: 'node20',
      format: 'cjs',
      sourcefile: filepath,
    }).code;
} catch (_e) {
  console.warn('[dev-api-server] esbuild 未安装，TS 文件将无法加载：npm i -D esbuild');
  transform = () => '';
}

// --------- 动态 require TS（Module 钩子） ---------
function requireTs(filepath) {
  const tsSrc = fs.readFileSync(filepath, 'utf8');
  const js = transform(tsSrc, filepath);
  const Module = module.constructor;
  const m = new Module(filepath, module);
  m.filename = filepath;
  m.paths = Module._nodeModulePaths(path.dirname(filepath)).concat(
    Module._nodeModulePaths(process.cwd())
  );
  const ext = path.extname(filepath);
  const origHandler = require.extensions[ext] || require.extensions['.js'];
  // 直接通过 _compile 执行
  try {
    m._compile(js, filepath);
  } catch (e) {
    // 如果 export default / 顶层 import 语法 CJS 不能跑，报错提示
    console.error('[dev-api-server] TS 编译失败:', filepath, '\n', e.message);
    throw e;
  }
  return m.exports;
}

// --------- 路由匹配 ---------
// 支持 /api/xxx → API_DIR/xxx.ts
//     /api/xxx/yyy → API_DIR/xxx/yyy.ts
//     /api/xxx?query
function resolveHandler(urlpath) {
  // 去掉开头 /api/
  if (!urlpath.startsWith('/api/')) return null;
  const rel = urlpath.slice('/api/'.length).split('?')[0].replace(/\/+$/, '');
  if (!rel) return null;
  const candidates = [
    path.join(API_DIR, rel + '.ts'),
    path.join(API_DIR, rel, 'index.ts'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// --------- Vercel request/response 适配 ---------
function polyfillRequest(req) {
  const u = new URL(req.url, 'http://localhost');
  req.query = Object.fromEntries(u.searchParams.entries());
  req.cookies = {};
  const c = req.headers.cookie;
  if (c) {
    c.split(';').forEach((s) => {
      const [k, v] = s.split('=');
      if (k) req.cookies[k.trim()] = decodeURIComponent((v || '').trim());
    });
  }
  // body 解析：简单起见支持 JSON
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try {
        if (raw) {
          const contentType = req.headers['content-type'] || '';
          if (contentType.includes('application/json')) req.body = JSON.parse(raw);
          else req.body = raw;
        } else req.body = undefined;
        resolve(req);
      } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function polyfillResponse(res) {
  res.status = function (code) { res.statusCode = code; return res; };
  res.json = function (obj) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.end(JSON.stringify(obj));
    return res;
  };
  res.send = function (s) { res.end(s); return res; };
  res.setHeader = res.setHeader || function (k, v) { res._headers = res._headers || {}; res._headers[k] = v; };
  res.redirect = function (codeOrUrl, urlOrUndef) {
    const code = typeof codeOrUrl === 'number' ? codeOrUrl : 302;
    const url = typeof codeOrUrl === 'string' ? codeOrUrl : (urlOrUndef || '/');
    res.statusCode = code;
    res.setHeader('Location', url);
    res.end();
    return res;
  };
  res.cookie = function (name, value, opts) {
    const parts = [`${name}=${encodeURIComponent(value)}`];
    if (opts?.httpOnly) parts.push('HttpOnly');
    if (opts?.secure) parts.push('Secure');
    if (opts?.path) parts.push('Path=' + opts.path);
    if (opts?.maxAge != null) parts.push('Max-Age=' + opts.maxAge);
    if (opts?.sameSite) parts.push('SameSite=' + opts.sameSite);
    res.setHeader('Set-Cookie', (res.getHeader('Set-Cookie') || []).concat(parts.join('; ')));
    return res;
  };
  return res;
}

// --------- 缓存 handlers ---------
const handlerCache = new Map();
function loadHandler(tsfile) {
  if (handlerCache.has(tsfile)) return handlerCache.get(tsfile);
  const mod = requireTs(tsfile);
  const fn = (mod && (mod.default || mod)) || null;
  if (typeof fn !== 'function') {
    throw new Error(tsfile + ' 没有导出 default 函数');
  }
  handlerCache.set(tsfile, fn);
  return fn;
}

// --------- HTTP server ---------
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
    const u = new URL(req.url, 'http://localhost');
    const tsfile = resolveHandler(u.pathname);
    if (!tsfile) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('[dev-api-server] 404: ' + u.pathname + ' 没有匹配的 API 文件\n可用 endpoints:\n' + listApiRoutes());
      return;
    }
    const start = Date.now();
    const [vr] = await Promise.all([polyfillRequest(req)]);
    const vs = polyfillResponse(res);
    const handler = loadHandler(tsfile);
    await handler(vr, vs);
    // 未写响应时兜底
    if (!res.headersSent) vs.status(200).json({ ok: true });
    console.log('[api]', Date.now() - start + 'ms', req.method, u.pathname, '→', res.statusCode);
  } catch (e) {
    console.error('[api] 500:', req.url, '\n', e && e.stack ? e.stack : e);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify({ error: 'Internal Server Error', message: String(e && e.message || e) }));
  }
});

function listApiRoutes() {
  const out = [];
  const scan = (dir, prefix = '') => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const s = fs.statSync(full);
      if (s.isDirectory() && name !== '_shared' && name !== 'node_modules') scan(full, prefix + name + '/');
      else if (name.endsWith('.ts') && !name.startsWith('_')) out.push('/api/' + prefix + name.replace(/\.ts$/, ''));
    }
  };
  try { scan(API_DIR); } catch {}
  return out.join('\n');
}

server.listen(PORT, '0.0.0.0', () => {
  console.log('✅ StockExt dev API server listening on http://localhost:' + PORT);
  console.log('Routes:\n' + listApiRoutes().split('\n').map(s => '  ' + s).join('\n'));
});
