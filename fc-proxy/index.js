/**
 * 阿里云函数计算 (FC) - CORS 代理
 * 部署到阿里云后，请求走国内 IP，不会被 WAF 拦截
 */

'use strict';

const http = require('http');
const https = require('https');
const url = require('url');

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

function proxyRequest(targetUrl, reqHeaders) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(targetUrl);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.path,
      method: 'GET',
      headers: reqHeaders,
      timeout: 15000,
    };

    const protocol = parsed.protocol === 'https:' ? https : http;
    const proxyReq = protocol.request(options, (proxyRes) => {
      let data = '';
      proxyRes.setEncoding('utf8');
      proxyRes.on('data', chunk => data += chunk);
      proxyRes.on('end', () => {
        resolve({ status: proxyRes.statusCode, headers: proxyRes.headers, body: data });
      });
    });

    proxyReq.on('error', reject);
    proxyReq.on('timeout', () => { proxyReq.destroy(); reject(new Error('timeout')); });
    proxyReq.end();
  });
}

exports.handler = async (req, res, context) => {
  const origin = req.headers['origin'] || '*';

  // CORS 预检
  if (req.method === 'OPTIONS') {
    res.setStatusCode(204);
    Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.setHeader(k, v));
    res.send('');
    return;
  }

  const parsedUrl = url.parse(req.url, true);

  if (!parsedUrl.pathname.startsWith('/proxy')) {
    res.setStatusCode(404);
    res.setHeader('content-type', 'text/plain');
    res.send('Not Found. Use /proxy?url=https://example.com');
    return;
  }

  const targetUrl = parsedUrl.query.url;

  if (!targetUrl) {
    res.setStatusCode(400);
    Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader('content-type', 'application/json');
    res.send(JSON.stringify({ error: 'Missing target URL' }));
    return;
  }

  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    res.setStatusCode(400);
    Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader('content-type', 'application/json');
    res.send(JSON.stringify({ error: 'Invalid target URL' }));
    return;
  }

  if (!ALLOWED_HOSTS.some(h => parsedTarget.hostname === h || parsedTarget.hostname.endsWith('.' + h))) {
    res.setStatusCode(403);
    Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader('content-type', 'application/json');
    res.send(JSON.stringify({ error: `Domain ${parsedTarget.hostname} not allowed` }));
    return;
  }

  // 构建请求头
  const headers = {
    'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': parsedTarget.origin + '/',
    'Accept': req.headers['accept'] || 'application/json, text/plain, */*',
    'Accept-Language': req.headers['accept-language'] || 'zh-CN,zh;q=0.9',
    'Cookie': req.headers['cookie'] || '',
  };

  if (headers.Cookie) {
    const xqatMatch = headers.Cookie.match(/xq_a_token=([^;]+)/);
    if (xqatMatch) headers['X-Access-Token'] = xqatMatch[1];
  }

  try {
    const result = await proxyRequest(targetUrl, headers);

    Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.setHeader(k, v));
    const ct = result.headers['content-type'];
    if (ct) res.setHeader('content-type', ct);

    res.setStatusCode(result.status || 200);
    res.send(result.body);
  } catch (e) {
    res.setStatusCode(502);
    Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader('content-type', 'application/json');
    res.send(JSON.stringify({ error: 'Proxy failed: ' + e.message }));
  }
};