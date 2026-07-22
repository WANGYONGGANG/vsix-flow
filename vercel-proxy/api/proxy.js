/**
 * Vercel Edge Function - CORS 代理
 * 使用 Edge Runtime 获得不同的 IP 段，降低被 WAF 拦截的概率
 */

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

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const origin = request.headers.get('origin') || '*';

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
    // 构建高度伪装的请求头，模拟真实浏览器
    const headers = new Headers();

    // 从客户端转发的头
    const forwardHeaders = ['cookie', 'user-agent', 'referer', 'accept', 'accept-language'];
    for (const h of forwardHeaders) {
      const val = request.headers.get(h);
      if (val) headers.set(h, val);
    }

    // 浏览器标准头（模拟 Chrome）
    headers.set('sec-ch-ua', '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"');
    headers.set('sec-ch-ua-mobile', '?0');
    headers.set('sec-ch-ua-platform', '"Windows"');
    headers.set('sec-fetch-dest', 'empty');
    headers.set('sec-fetch-mode', 'cors');
    headers.set('sec-fetch-site', 'same-site');
    headers.set('accept-encoding', 'gzip, deflate, br');

    if (!headers.has('user-agent')) {
      headers.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    }
    if (!headers.has('referer')) {
      headers.set('referer', parsedTarget.origin + '/');
    }
    if (!headers.has('accept')) {
      headers.set('accept', 'application/json, text/plain, */*');
    }
    if (!headers.has('accept-language')) {
      headers.set('accept-language', 'zh-CN,zh;q=0.9,en;q=0.8');
    }

    // 雪球特有：添加 xqat token（如果 cookie 里有）
    const cookie = headers.get('cookie') || '';
    const xqatMatch = cookie.match(/xq_a_token=([^;]+)/);
    if (xqatMatch) {
      headers.set('X-Access-Token', xqatMatch[1]);
    }

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      redirect: 'follow',
    });

    const respHeaders = new Headers(corsHeaders(origin));
    const ct = response.headers.get('content-type');
    if (ct) respHeaders.set('content-type', ct);

    // 透传 set-cookie（如果有）
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) respHeaders.set('x-proxy-set-cookie', setCookie);

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