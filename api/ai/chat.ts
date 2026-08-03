// ============================================
// AI Chat 代理 - 兼容 OpenAI v1/chat/completions 协议
// 用户请求体中携带：
//   {
//     baseURL: "https://api.openai.com/v1" | 其他兼容地址,
//     apiKey:  "用户自己的 key",
//     model:   "gpt-4o" / "deepseek-chat" / ...,
//     temperature?: 0.7,
//     messages: [{role,content}, ...],
//     stream?: true   // 默认开启 SSE 流式
//   }
// 服务端只做透传，不保存任何 key（用户本地 localStorage 自己保存）
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as https from 'https';
import * as url from 'url';

function readBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => resolve(data));
  });
}

function ensureSlash(u: string): string {
  return u.endsWith('/') ? u : u + '/';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method not allowed' }); return; }

  let body: any = {};
  try { body = JSON.parse(await readBody(req)); } catch { /* empty */ }

  const baseURL = String(body.baseURL || '').trim();
  const apiKey = String(body.apiKey || '').trim();
  const model = String(body.model || '').trim();
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const stream = body.stream !== false;   // 默认开启流式
  const temperature = Number(body.temperature) || 0.7;

  if (!baseURL || !apiKey || !model || !messages.length) {
    res.status(400).json({ error: 'missing baseURL / apiKey / model / messages' });
    return;
  }

  const upstream = `${ensureSlash(baseURL)}chat/completions`;
  const parsed = url.parse(upstream);
  const payload = JSON.stringify({
    model, messages, stream, temperature,
  });

  const options: https.RequestOptions = {
    hostname: parsed.hostname,
    port: parsed.port || 443,
    path: parsed.path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Content-Length': Buffer.byteLength(payload),
    },
    timeout: 120_000,
  };

  if (stream) {
    // SSE 流式
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
  } else {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }

  const upstreamReq = https.request(options, (upstreamRes) => {
    res.status(upstreamRes.statusCode || 502);
    upstreamRes.on('data', (chunk) => {
      res.write(chunk);
    });
    upstreamRes.on('end', () => { res.end(); });
    upstreamRes.on('error', () => {
      try { res.status(502); res.end(JSON.stringify({ error: 'upstream error' })); } catch { /* empty */ }
    });
  });

  upstreamReq.on('error', (e) => {
    try {
      if (stream) {
        res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
        res.end();
      } else {
        res.status(502).json({ error: e.message });
      }
    } catch { /* empty */ }
  });

  upstreamReq.on('timeout', () => { upstreamReq.destroy(); });
  upstreamReq.write(payload);
  upstreamReq.end();
}
