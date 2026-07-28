// ==================== API 层 ====================

/**
 * 基础请求函数，保留原有签名与行为
 * @param path 以 / 开头的路径，会拼接到 /api 前缀下
 * @param opts 标准 RequestInit
 */
export async function api<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
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
 * - 上交所(sh)：6 开头（主板 600/601/603/605）、688（科创板）、900（B 股）、11/13（债券）、50/56（期权）
 * - 深交所(sz)：000/001/002/003（主板及中小板）、300/301（创业板）、200（B 股）、12（债券）、15/16/18（基金）
 * - 北交所(bj)：43/83/87/92 开头、8 开头（老三板/北交所）
 */
export function getSecuritiesMarket(code: string): 'sh' | 'sz' | 'bj' {
  const c = code.trim()
  if (/^(60|68|90|11|13|50|56|51|58)/.test(c)) return 'sh'
  if (/^(00|30|20|12|15|16|18|159)/.test(c)) return 'sz'
  if (/^(43|83|87|92|88|8)/.test(c)) return 'bj'
  // 兜底：默认沪市
  return 'sh'
}

/**
 * 构建东方财富 API URL
 * @param base 基础 URL，例如 https://push2.eastmoney.com/api/qt/clist/get
 * @param params 查询参数对象
 */
export function buildEastMoneyUrl(
  base: string,
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue
    sp.append(k, String(v))
  }
  const qs = sp.toString()
  return qs ? `${base}${base.includes('?') ? '&' : '?'}${qs}` : base
}

/**
 * 格式化东方财富的大数字
 * 东方财富返回的金额通常以"元"为单位，成交量以"手"为单位
 * 该函数将其转换为带"亿/万"单位的可读字符串（不含"元/手"后缀）
 */
export function formatEastMoneyNumber(val: number): string {
  if (val === undefined || val === null || isNaN(val)) return '--'
  const abs = Math.abs(val)
  if (abs >= 1e8) return (val / 1e8).toFixed(2) + '亿'
  if (abs >= 1e4) return (val / 1e4).toFixed(2) + '万'
  return val.toFixed(0)
}

// ==================== 格式化工具 ====================
export const fmt = {
  /** 金额（元）：亿/万 */
  amt: (n: number) => {
    if (n >= 1e8) return (n / 1e8).toFixed(2) + '亿'
    if (n >= 1e4) return (n / 1e4).toFixed(1) + '万'
    return n.toFixed(0)
  },
  /** 成交量（手）：亿手/万手/手 */
  vol: (n: number) => {
    if (n >= 1e8) return (n / 1e8).toFixed(2) + '亿手'
    if (n >= 1e4) return (n / 1e4).toFixed(1) + '万手'
    return n.toFixed(0) + '手'
  },
  /** 成交量（手），不含"手"单位：亿/万 */
  barVol: (n: number) => {
    if (n >= 1e8) return (n / 1e8).toFixed(2) + '亿'
    if (n >= 1e4) return (n / 1e4).toFixed(1) + '万'
    return n.toFixed(0)
  },
  /** 涨跌幅：保留正号 + 两位小数 + % */
  rate: (n: number) => (n > 0 ? '+' : '') + n.toFixed(2) + '%',
  /** 涨跌幅（别名）：与 rate 一致，语义更明确 */
  pctChange: (n: number) => (n > 0 ? '+' : '') + n.toFixed(2) + '%',
  /** 价格：两位小数 */
  price: (n: number) => n.toFixed(2),
}
