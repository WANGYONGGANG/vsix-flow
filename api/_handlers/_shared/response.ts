// ============================================
// API 层共享工具 - Vercel Serverless 通用
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

export function json(res: VercelResponse, status: number, body: unknown) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=60');
  res.status(status).json(body);
}

export function handleOptions(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.status(204).end('');
    return true;
  }
  return false;
}

export function getQuery(req: VercelRequest, key: string, fallback = ''): string {
  const v = req.query[key];
  if (v == null) return fallback;
  return Array.isArray(v) ? v[0] : String(v);
}
