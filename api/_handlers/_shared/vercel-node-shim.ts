// ============================================================
// @vercel/node 类型 shim（本地开发不需要真的 @vercel/node）
// 让 import type { VercelRequest, VercelResponse } 不报错
// ============================================================
import type { IncomingMessage, ServerResponse } from 'http';

export type VercelRequest = IncomingMessage & {
  query: Record<string, string | string[] | undefined>;
  cookies: Record<string, string>;
  body?: any;
};

export type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (obj: any) => VercelResponse;
  send: (body: any) => VercelResponse;
  redirect: (statusOrUrl: number | string, url?: string) => VercelResponse;
  cookie: (name: string, value: any, opts?: any) => VercelResponse;
  setHeader: (name: string, value: any) => VercelResponse;
  getHeader: (name: string) => any;
};
