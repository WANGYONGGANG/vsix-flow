/**
 * 带自动重试的 fetch 工具，解决东财API间歇性断开连接问题
 * 保持与原工作代码相同的请求头，避免被东财服务器拒绝
 */

const HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': 'https://data.eastmoney.com/',
}

/**
 * 带重试的 fetch，遇到网络错误自动重试
 * @param url 完整URL
 * @param retries 重试次数（默认2次）
 * @param timeout 超时毫秒（默认10秒）
 */
export async function fetchWithRetry(
  url: string,
  retries = 2,
  timeout = 10000,
): Promise<any> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(timeout),
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      return await res.json()
    } catch (err) {
      lastError = err as Error
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  throw lastError || new Error('fetch failed after retries')
}
