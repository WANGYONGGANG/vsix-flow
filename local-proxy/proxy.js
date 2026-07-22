/**
 * 本地 CORS 代理服务
 * 运行: node proxy.js
 * 访问: http://localhost:3001/proxy?url=https://xueqiu.com/xxx
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3001;

const ALLOWED_HOSTS = [
  'xueqiu.com',
  'stock.xueqiu.com',
  'www.taoguba.com.cn',
  'taoguba.com.cn',
];

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin || '*';

  // CORS 预检
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(origin));
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);

  // 只处理 /proxy 路径
  if (!parsedUrl.pathname.startsWith('/proxy')) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found. Use /proxy?url=https://example.com');
    return;
  }

  const targetUrl = parsedUrl.query.url;

  if (!targetUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders(origin) });
    res.end(JSON.stringify({ error: 'Missing target URL' }));
    return;
  }

  // 安全校验
  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders(origin) });
    res.end(JSON.stringify({ error: 'Invalid target URL' }));
    return;
  }

  if (!ALLOWED_HOSTS.some(h => parsedTarget.hostname === h || parsedTarget.hostname.endsWith('.' + h))) {
    res.writeHead(403, { 'Content-Type': 'application/json', ...corsHeaders(origin) });
    res.end(JSON.stringify({ error: `Domain ${parsedTarget.hostname} not allowed` }));
    return;
  }

  // 构建请求头
  const headers = {
    'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': parsedTarget.origin + '/',
    'Accept': req.headers['accept'] || 'application/json, text/plain, */*',
    'Accept-Language': req.headers['accept-language'] || 'zh-CN,zh;q=0.9',
    'Cookie': req.headers['cookie'] || '',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
  };

  // 雪球特有：X-Access-Token
  if (headers.Cookie) {
    const xqatMatch = headers.Cookie.match(/xq_a_token=([^;]+)/);
    if (xqatMatch) headers['X-Access-Token'] = xqatMatch[1];
  }

  const protocol = parsedTarget.protocol === 'https:' ? https : http;

  const proxyReq = protocol.request(targetUrl, {
    method: 'GET',
    headers,
    timeout: 15000,
  }, (proxyRes) => {
    const respHeaders = corsHeaders(origin);
    const ct = proxyRes.headers['content-type'];
    if (ct) respHeaders['content-type'] = ct;

    res.writeHead(proxyRes.statusCode || 200, respHeaders);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json', ...corsHeaders(origin) });
    res.end(JSON.stringify({ error: 'Proxy failed: ' + err.message }));
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    res.writeHead(504, { 'Content-Type': 'application/json', ...corsHeaders(origin) });
    res.end(JSON.stringify({ error: 'Proxy timeout' }));
  });

  proxyReq.end();
});

server.listen(PORT, () => {
  console.log(`本地代理已启动: http://localhost:${PORT}`);
  console.log(`测试: http://localhost:${PORT}/proxy?url=https://xueqiu.com`);
  console.log('按 Ctrl+C 停止');
});