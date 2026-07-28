import { NextRequest, NextResponse } from 'next/server'

// 通用东方财富代理
async function proxyFetch(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const target = searchParams.get('url')
  if (!target) return NextResponse.json({ error: 'missing url' }, { status: 400 })

  // 安全校验：只允许东方财富域名
  const url = new URL(target)
  const allowed = [
    'push2.eastmoney.com',
    'push2his.eastmoney.com',
    'datacenter-web.eastmoney.com',
    'push2.eastmoney.com',
    'data.eastmoney.com',
    'quote.eastmoney.com',
    'exdata.eastmoney.com',
    'fund.eastmoney.com',
    '59.push2.eastmoney.com',
    '60.push2.eastmoney.com',
  ]
  if (!allowed.some(h => url.hostname === h || url.hostname.endsWith('.' + h))) {
    return NextResponse.json({ error: 'domain not allowed' }, { status: 403 })
  }

  // 转发请求
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://data.eastmoney.com/',
  }
  if (req.headers.get('content-type')) {
    headers['Content-Type'] = req.headers.get('content-type')!
  }

  try {
    const res = await fetch(target, {
      headers,
      signal: AbortSignal.timeout(15000),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}

export { proxyFetch as GET, proxyFetch as POST }
