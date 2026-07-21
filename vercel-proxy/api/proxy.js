/**
 * Vercel Edge Function - CORS 代理
 * 用于代理雪球和淘股吧的 API 请求
 *
 * 部署步骤：
 * 1. 安装 Vercel CLI: npm i -g vercel
 * 2. 登录: vercel login
 * 3. 部署: vercel --prod
 * 4. 拿到 URL（如 https://xxx.vercel.app）填入扩展设置
 */

// 安全校验：只允许代理白名单域名
const ALLOWED_HOSTS = [
  'xueqiu.com',
  'stock.xueqiu.com',
  'www.taoguba.com.cn',
  'taoguba.com.cn',
];

// CORS 头
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };
}

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const origin = request.headers.get('origin') || '*';

  // 处理 CORS 预检
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response(JSON.stringify({
      error: 'Missing target URL. Usage: /proxy?url=https://example.com',
      status: 'ok',
      time: new Date().toISOString(),
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
  }

  // 安全校验
  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid target URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
  }

  if (!ALLOWED_HOSTS.some(h => parsedTarget.hostname === h || parsedTarget.hostname.endsWith('.' + h))) {
    return new Response(JSON.stringify({ error: `Domain ${parsedTarget.hostname} not allowed` }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
  }

  try {
    // 构建代理请求头：从客户端转发
    const headers = new Headers();
    const forwardHeaders = ['cookie', 'user-agent', 'referer', 'accept', 'accept-language'];
    for (const h of forwardHeaders) {
      const val = request.headers.get(h);
      if (val) headers.set(h, val);
    }
    if (!headers.has('user-agent')) {
      headers.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    }
    if (!headers.has('referer')) {
      headers.set('referer', parsedTarget.origin + '/');
    }

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      redirect: 'follow',
    });

    const respHeaders = new Headers(corsHeaders(origin));
    const ct = response.headers.get('content-type');
    if (ct) respHeaders.set('content-type', ct);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: respHeaders,
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: 'Proxy fetch failed: ' + (e.message || String(e)),
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    });
  }
}