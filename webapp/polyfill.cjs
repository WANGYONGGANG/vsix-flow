// Node 16 polyfills：crypto.getRandomValues + fetch/Response/Headers/Request
const crypto = require('crypto');
if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== 'function') {
  globalThis.crypto = crypto.webcrypto;
}
if (typeof crypto.getRandomValues !== 'function') {
  crypto.getRandomValues = crypto.webcrypto.getRandomValues.bind(crypto.webcrypto);
}

if (typeof fetch !== 'function') {
  const http = require('http');
  const https = require('https');
  const { URL } = require('url');

  class HeadersPolyfill {
    constructor(init = {}) {
      this._map = {};
      Object.entries(init).forEach(([k, v]) => this.set(k, v));
    }
    get(name) { return this._map[String(name).toLowerCase()]; }
    set(name, value) { this._map[String(name).toLowerCase()] = String(value); }
  }

  class ResponsePolyfill {
    constructor(body, init = {}) {
      this.status = init.status || 200;
      this.ok = this.status >= 200 && this.status < 300;
      this.headers = new HeadersPolyfill(init.headers);
      this._body = Buffer.from(body || []);
    }
    async text() { return this._body.toString('utf-8'); }
    async json() { return JSON.parse(await this.text()); }
    async arrayBuffer() { return this._body.buffer.slice(this._body.byteOffset, this._body.byteOffset + this._body.byteLength); }
  }

  // GET/HEAD 用 get()（与 https.get 行为一致，规避部分站点 request() socket hang up），支持自动重定向
  globalThis.fetch = function fetchPolyfill(url, init = {}) {
    return new Promise((resolve, reject) => {
      const signal = init.signal;
      if (signal && signal.aborted) { reject(new Error('AbortError')); return; }
      const method = String(init.method || 'GET').toUpperCase();
      const headers = Object.assign({}, init.headers || {});
      let settled = false;
      const ok = (v) => { if (!settled) { settled = true; resolve(v); } };
      const fail = (e) => { if (!settled) { settled = true; reject(e); } };

      const attempt = (target, redirects) => {
        let u;
        try { u = new URL(target); } catch (e) { fail(e); return; }
        const mod = u.protocol === 'https:' ? https : http;
        const onRes = (res) => {
          const sc = res.statusCode || 0;
          if ([301, 302, 303, 307, 308].indexOf(sc) >= 0 && res.headers.location && redirects > 0) {
            res.resume();
            attempt(new URL(res.headers.location, target).toString(), redirects - 1);
            return;
          }
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => ok(new ResponsePolyfill(Buffer.concat(chunks), { status: sc, headers: res.headers })));
          res.on('error', fail);
        };
        const req = (method === 'GET' || method === 'HEAD')
          ? mod.get(u, { method, headers }, onRes)
          : mod.request(u, { method, headers }, onRes);
        req.on('error', fail);
        req.setTimeout(30000, () => { req.destroy(new Error('timeout')); });
        if (signal) signal.addEventListener('abort', () => { req.destroy(); fail(new Error('AbortError')); });
        if (method !== 'GET' && method !== 'HEAD') {
          if (init.body) req.write(init.body);
          req.end();
        }
      };
      attempt(String(url), 3);
    });
  };
  globalThis.Response = ResponsePolyfill;
  globalThis.Headers = HeadersPolyfill;
}
