/**
 * Cloudflare Worker - CORS 代理
 * 用于代理雪球和淘股吧的 API 请求
 *
 * 部署步骤：
 * 1. 登录 https://dash.cloudflare.com
 * 2. 进入 Workers & Pages → 创建 Worker
 * 3. 将此文件内容粘贴到 Worker 编辑器中
 * 4. 部署后获取 URL（如 https://your-worker.your-name.workers.dev）
 * 5. 在扩展设置中填入 Worker URL
 */

export default {
  async fetch(request, env, ctx) {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return handleCORS(request);
    }

    const url = new URL(request.url);
    // 路由: /proxy?url=xxx 或者 /proxy/xxx
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
      // 构建代理请求头
      const headers = new Headers();
      // 从客户端转发指定头
      const forwardHeaders = ['cookie', 'user-agent', 'referer', 'accept', 'accept-language'];
      for (const h of forwardHeaders) {
        const val = request.headers.get(h);
        if (val) headers.set(h, val);
      }
      // 默认头
      if (!headers.has('user-agent')) {
        headers.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      }
      if (!headers.has('referer')) {
        headers.set('referer', parsedTarget.origin + '/');
      }

      const response = await fetch(targetUrl, {
        method: request.method,
        headers,
        redirect: 'follow',
      });

      // 构建响应
      const respHeaders = new Headers(corsHeaders(request));
      // 转发内容类型
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
  },
};

function corsHeaders(request) {
  const origin = request.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };
}

function handleCORS(request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}