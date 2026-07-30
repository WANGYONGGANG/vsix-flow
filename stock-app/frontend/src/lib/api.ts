// ==================== API 层 ====================
// 注：v3 架构：所有股票数据（新闻除外）通过 Python (FastAPI + akshare) 后端提供
// 通过环境变量 NEXT_PUBLIC_API_BASE 指向后端根 URL（例如 https://xxx.railway.app）

export const API_BASE: string = (() => {
  const env =
    (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_API_BASE) ||
    (typeof window !== 'undefined' && (window as any).__API_BASE__) ||
    ''
  const base = String(env || '').trim().replace(/\/+$/, '')
  return base
})()

const FETCH_TIMEOUT = 180_000

/**
 * 基础请求函数，保留原有签名与行为
 * @param path 以 / 开头的路径，会拼接到 ${API_BASE}/api 前缀下
 * @param opts 标准 RequestInit
 */
export async function api<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const prefix = API_BASE ? `${API_BASE}/api` : '/api'
  const url = `${prefix}${path}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    const res = await fetch(url, {
      ...opts,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...opts?.headers },
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    return res.json()
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 便捷 GET 函数，自动拼接查询参数
 * @param path 以 / 开头的路径
 * @param params 查询参数对象，值为 undefined / null 的键会被忽略
 */
export async function apiGet<T = any>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): Promise<T> {
  let url = path
  if (params) {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue
      sp.append(k, String(v))
    }
    const qs = sp.toString()
    if (qs) url += (url.includes('?') ? '&' : '?') + qs
  }
  return api<T>(url)
}

// ==================== 市场与 URL 工具 ====================

/**
 * 根据证券代码判断所属市场
 */
export function getSecuritiesMarket(code: string): 'sh' | 'sz' | 'bj' {
  const c = code.trim()
  if (/^(60|68|90|11|13|50|56|51|58)/.test(c)) return 'sh'
  if (/^(00|30|20|12|15|16|18|159)/.test(c)) return 'sz'
  if (/^(43|83|87|92|88|8)/.test(c)) return 'bj'
  return 'sh'
}

// ==================== 格式化工具 ====================
export const fmt = {
  amt: (n: number) => {
    if (!isFinite(n)) return '--'
    const abs = Math.abs(n)
    if (abs >= 1e8) return (n / 1e8).toFixed(2) + '亿'
    if (abs >= 1e4) return (n / 1e4).toFixed(1) + '万'
    return n.toFixed(0)
  },
  vol: (n: number) => {
    if (!isFinite(n)) return '--'
    const abs = Math.abs(n)
    if (abs >= 1e8) return (n / 1e8).toFixed(2) + '亿手'
    if (abs >= 1e4) return (n / 1e4).toFixed(1) + '万手'
    return n.toFixed(0) + '手'
  },
  barVol: (n: number) => {
    if (!isFinite(n)) return '--'
    const abs = Math.abs(n)
    if (abs >= 1e8) return (n / 1e8).toFixed(2) + '亿'
    if (abs >= 1e4) return (n / 1e4).toFixed(1) + '万'
    return n.toFixed(0)
  },
  rate: (n: number) => (!isFinite(n) ? '--' : (n > 0 ? '+' : '') + n.toFixed(2) + '%'),
  pctChange: (n: number) => (!isFinite(n) ? '--' : (n > 0 ? '+' : '') + n.toFixed(2) + '%'),
  price: (n: number) => (!isFinite(n) ? '--' : n.toFixed(2)),
}
