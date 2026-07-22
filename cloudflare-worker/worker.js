/**
 * Cloudflare Worker - CORS 代理 + 静态资产
 * /proxy 路径走代理逻辑，其他走 H5 静态页面
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 只有 /proxy 路径走代理逻辑
    if (url.pathname.startsWith('/proxy')) {
      return handleProxy(request, env);
    }

    // 其他路径走静态资产（H5 页面）
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function handleProxy(request, env) {
  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }

  const url = new URL(request.url);
  let targetUrl = url.searchParams.get('url');
  const pathProxy = url.pathname.replace(/^\/proxy\/?/, '');

  if (!targetUrl && pathProxy) {
    targetUrl = pathProxy;
  }

  if (!targetUrl) {
    return new Response(JSON.stringify({
      error: 'Missing target URL. Usage: /proxy?url=https://example.com',
      status: 'ok',
      time: new Date().toISOString(),
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
    });
  }

  // 安全校验：只允许代理白名单域名
  const allowedHosts = [
    'xueqiu.com',
    'stock.xueqiu.com',
    'www.taoguba.com.cn',
    'taoguba.com.cn',
  ];
  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid target URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
    });
  }

  if (!allowedHosts.some(h => parsedTarget.hostname === h || parsedTarget.hostname.endsWith('.' + h))) {
    return new Response(JSON.stringify({ error: `Domain ${parsedTarget.hostname} not allowed` }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
    });
  }

  try {
    // 构建高度伪装的请求头
    const headers = new Headers();
    const forwardHeaders = ['cookie', 'user-agent', 'referer', 'accept', 'accept-language'];
    for (const h of forwardHeaders) {
      const val = request.headers.get(h);
      if (val) headers.set(h, val);
    }

    // 浏览器标准头
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

    // 雪球特有：X-Access-Token
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

    const respHeaders = new Headers(corsHeaders(request));
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
      headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
    });
  }
}

function corsHeaders(request) {
  const origin = request.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };
}