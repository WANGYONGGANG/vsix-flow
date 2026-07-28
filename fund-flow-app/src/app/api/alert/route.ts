import { NextResponse } from 'next/server'
import { fetchWithRetry } from '@/lib/fetchWithRetry'

const PUSH2 = 'https://push2.eastmoney.com/api/qt'
const PUSH2HIS = 'https://push2his.eastmoney.com/api/qt/stock/kline/get'

async function push2Fetch(path: string) {
  return fetchWithRetry(`${PUSH2}${path}`)
}

async function klineFetch(secid: string, klt: number, lmt: number) {
  const url = `${PUSH2HIS}?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=${klt}&fqt=1&beg=0&end=20500101&lmt=${lmt}&_=${Date.now()}`
  return fetchWithRetry(url)
}

interface AlertItem {
  type: 'up' | 'down'
  text: string
  time: string
  code?: string
}

interface IndexQuote {
  code: string
  name: string
  price: number
  change: number
  changeRate: number
  volume: number
  amount: number
}

export async function GET() {
  const now = new Date()
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const indexAlerts: AlertItem[] = []
  const stockAlerts: AlertItem[] = []
  const indexQuotes: IndexQuote[] = []

  // ========== 1. 大盘指数实时行情 ==========
  const indexList = [
    { secid: '1.000001', code: '000001', name: '上证指数' },
    { secid: '0.399001', code: '399001', name: '深证成指' },
    { secid: '0.399006', code: '399006', name: '创业板指' },
    { secid: '0.399005', code: '399005', name: '中小100' },
    { secid: '1.000016', code: '000016', name: '上证50' },
    { secid: '1.000300', code: '000300', name: '沪深300' },
    { secid: '1.000688', code: '000688', name: '科创50' },
  ]

  const indexCodes = indexList.map(i => i.secid).join(',')
  try {
    const idxJson = await push2Fetch(`/ulist.np/get?secids=${indexCodes}&fields=f2,f3,f4,f5,f6,f12,f14&_=${Date.now()}`)
    const idxData: any[] = idxJson?.data?.diff || []
    for (const d of idxData) {
      const changeRate = d.f3 || 0
      const change = d.f4 || 0
      const price = d.f2 || 0
      const name = d.f14 || ''
      const code = d.f12 || ''
      const volume = d.f5 || 0
      const amount = d.f6 || 0

      indexQuotes.push({ code, name, price, change, changeRate, volume, amount })

      if (Math.abs(changeRate) >= 0.5) {
        indexAlerts.push({
          type: changeRate > 0 ? 'up' : 'down',
          text: `${name} ${changeRate > 0 ? '上涨' : '下跌'} ${Math.abs(changeRate).toFixed(2)}%`,
          time: timeStr,
          code,
        })
      }
    }
  } catch { /* 忽略 */ }

  // ========== 2. 大盘5分钟K线异动（只查前3个指数） ==========
  try {
    const klineResults = await Promise.all(
      indexList.slice(0, 3).map(async (idx) => {
        try {
          const json = await klineFetch(idx.secid, 5, 3)
          const klines: string[] = json?.data?.klines || []
          if (klines.length >= 2) {
            const prev = klines[klines.length - 2].split(',')
            const curr = klines[klines.length - 1].split(',')
            if (prev.length >= 5 && curr.length >= 5) {
              const prevClose = parseFloat(prev[2])
              const currClose = parseFloat(curr[2])
              const change = prevClose > 0 ? ((currClose - prevClose) / prevClose) * 100 : 0
              if (Math.abs(change) >= 0.3) {
                return {
                  type: change > 0 ? 'up' : 'down' as 'up' | 'down',
                  text: `${idx.name} 5分钟${change > 0 ? '拉升' : '跳水'} ${Math.abs(change).toFixed(2)}%`,
                  time: timeStr,
                  code: idx.code,
                } as AlertItem
              }
            }
          }
        } catch { /* 忽略 */ }
        return null
      })
    )
    for (const r of klineResults) {
      if (r) indexAlerts.push(r)
    }
  } catch { /* 忽略 */ }

  // ========== 3. 个股涨跌幅异动 ==========
  const stockFs = 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23'
  let stockList: any[] = []
  try {
    const stockJson = await push2Fetch(
      `/clist/get?pn=1&pz=200&np=1&fltt=2&invt=2&po=1&fid=f3&fs=${stockFs}&fields=f2,f3,f4,f5,f6,f12,f14&_=${Date.now()}`
    )
    stockList = stockJson?.data?.diff || []
  } catch { /* 忽略，返回已有的指数异动 */ }

  const noStFilter = (s: any) => {
    const name = s.f14 || ''
    return !name.includes('ST')
  }

  // 3a. 涨幅榜异动（> +8%，过滤ST）
  const gainers = stockList
    .filter((s: any) => (s.f3 || 0) >= 8 && noStFilter(s))
    .sort((a: any, b: any) => (b.f3 || 0) - (a.f3 || 0))
    .slice(0, 15)

  for (const s of gainers) {
    const code = s.f12
    const name = s.f14 || code
    const price = s.f2 || 0
    const change = s.f3 || 0
    const isLimitUp = change >= 19.8 || ((code.startsWith('6') || code.startsWith('0')) && change >= 9.8)
    stockAlerts.push({
      type: 'up',
      text: `${name} ${isLimitUp ? '涨停' : '大涨'} ${change.toFixed(2)}%  现价${price.toFixed(2)}`,
      time: timeStr,
      code,
    })
  }

  // 3b. 跌幅榜异动（< -8%，过滤ST）
  const losers = stockList
    .filter((s: any) => (s.f3 || 0) <= -8 && noStFilter(s))
    .sort((a: any, b: any) => (a.f3 || 0) - (b.f3 || 0))
    .slice(0, 10)

  for (const s of losers) {
    const code = s.f12
    const name = s.f14 || code
    const price = s.f2 || 0
    const change = s.f3 || 0
    const isLimitDown = change <= -19.8 || ((code.startsWith('6') || code.startsWith('0')) && change <= -9.8)
    stockAlerts.push({
      type: 'down',
      text: `${name} ${isLimitDown ? '跌停' : '大跌'} ${change.toFixed(2)}%  现价${price.toFixed(2)}`,
      time: timeStr,
      code,
    })
  }

  // 去重
  const seen = new Set<string>()
  const uniqueStockAlerts: AlertItem[] = []
  for (const a of stockAlerts) {
    if (!seen.has(a.text)) {
      seen.add(a.text)
      uniqueStockAlerts.push(a)
    }
  }

  const seenIdx = new Set<string>()
  const uniqueIndexAlerts: AlertItem[] = []
  for (const a of indexAlerts) {
    if (!seenIdx.has(a.text)) {
      seenIdx.add(a.text)
      uniqueIndexAlerts.push(a)
    }
  }

  return NextResponse.json({
    indexQuotes,
    indexAlerts: uniqueIndexAlerts,
    stockAlerts: uniqueStockAlerts,
  })
}
