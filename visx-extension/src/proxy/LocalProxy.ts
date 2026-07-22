/**
 * VS Code 扩展内置本地代理服务
 * 启动后监听 localhost，Webview 请求走这里，绕过 WAF
 */

import * as http from 'http';
import * as https from 'https';

const ALLOWED_HOSTS = [
  'xueqiu.com',
  'stock.xueqiu.com',
  'www.taoguba.com.cn',
  'taoguba.com.cn',
];

function corsHeaders(origin: string = '*') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };
}

export class LocalProxy {
  private server: http.Server | null = null;
  public port: number;
  public url: string;

  constructor(port: number = 0) {
    this.port = port;
    this.url = `http://localhost:${port}`;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        const origin = req.headers.origin || '*';

        if (req.method === 'OPTIONS') {
          res.writeHead(204, corsHeaders(origin));
          res.end();
          return;
        }

        const reqUrl = new URL(req.url || '/', `http://localhost:${this.port}`);

        if (!reqUrl.pathname.startsWith('/proxy')) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }

        const targetUrl = reqUrl.searchParams.get('url');
        if (!targetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json', ...corsHeaders(origin) });
          res.end(JSON.stringify({ error: 'Missing target URL' }));
          return;
        }

        let parsedTarget: URL;
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

        const headers: Record<string, string> = {
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

        const protocol = parsedTarget.protocol === 'https:' ? https : http;
        const proxyReq = protocol.request(targetUrl, {
          method: 'GET',
          headers,
          timeout: 15000,
        }, (proxyRes) => {
          const respHeaders: Record<string, string> = corsHeaders(origin);
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

      this.server.listen(this.port, '127.0.0.1', () => {
        const addr = this.server?.address();
        if (addr && typeof addr === 'object') {
          this.port = addr.port;
          this.url = `http://localhost:${this.port}`;
          console.log(`[LocalProxy] 启动成功: ${this.url}`);
        }
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log('[LocalProxy] 已停止');
    }
  }
}