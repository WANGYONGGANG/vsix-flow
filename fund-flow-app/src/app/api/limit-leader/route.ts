import { NextResponse } from 'next/server'
import { fetchWithRetry } from '@/lib/fetchWithRetry'

const PUSH2 = 'https://push2.eastmoney.com/api/qt'
const DC = 'https://datacenter-web.eastmoney.com/api/data/v1/get'

async function push2Fetch(path: string) {
  return fetchWithRetry(`${PUSH2}${path}`)
}

async function dcFetch(params: Record<string, string>) {
  const url = `${DC}?${new URLSearchParams({ source: 'WEB', client: 'WEB', ...params }).toString()}`
  return fetchWithRetry(url)
}

// 获取最近 N 个交易日日期（不含周末）
function getLastTradeDates(count: number): string[] {
  const dates: string[] = []
  const now = new Date()
  let diff = 1
  while (dates.length < count) {
    const d = new Date(now)
    d.setDate(d.getDate() - diff)
    const wd = d.getDay()
    if (wd !== 0 && wd !== 6) {
      const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0')
      dates.push(`${y}-${m}-${dd}`)
    }
    diff++
  }
  return dates
}

// 通过批量查询历史涨停数据计算连板数
async function calcLimitUpDays(codes: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  const dates = getLastTradeDates(10)
  const codeToDates = new Map<string, Set<string>>()

  for (const date of dates) {
    try {
      const json = await dcFetch({
        sortColumns: 'CHANGE_RATE',
        sortTypes: '-1',
        pageSize: '500',
        pageNumber: '1',
        reportName: 'RPT_DAILYBILLBOARD_DETAILSNEW',
        columns: 'SECURITY_CODE,CHANGE_RATE',
        filter: `(TRADE_DATE='${date}')(CHANGE_RATE>=9.8)`,
      })
      const list: any[] = json?.result?.data || []
      for (const item of list) {
        const code = item.SECURITY_CODE
        if (!codes.includes(code)) continue
        if (!codeToDates.has(code)) codeToDates.set(code, new Set())
        codeToDates.get(code)!.add(date)
      }
    } catch { /* 忽略 */ }
  }

  // 今天（最近一个交易日）
  const today = dates[0]
  for (const code of codes) {
    const dateSet = codeToDates.get(code)
    if (!dateSet || !dateSet.has(today)) {
      result.set(code, 1)
      continue
    }
    let count = 0
    for (const date of dates) {
      if (dateSet.has(date)) count++
      else break
    }
    result.set(code, Math.max(count, 1))
  }

  return result
}

export async function GET() {
  // 1. 获取今日涨幅>=9.8%的个股（沪深A股，过滤ST）
  const stockFs = 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23'
  const fields = 'f12,f14,f2,f3,f4,f5,f6,f8,f10,f15,f16,f17,f18'
  const json = await push2Fetch(
    `/clist/get?pn=1&pz=500&po=1&np=1&fltt=2&invt=2&fs=${stockFs}&fields=${fields}&fid=f3&po=1&ndd=1&filter=(f3>=9.8)(f8!=1)&_=${Date.now()}`
  )

  const stocks: any[] = json?.data?.diff || []
  // 过滤 ST/*ST 股票
  const filteredStocks = stocks.filter((s: any) => {
    const name = s.f14 || ''
    return !name.includes('ST')
  })
  if (!filteredStocks.length) return NextResponse.json([])

  // 2. 批量计算连板数（并发控制，每批20个）
  const allResults: any[] = []

  for (let i = 0; i < filteredStocks.length; i += 20) {
    const batch = filteredStocks.slice(i, i + 20)
    const codes = batch.map((s: any) => s.f12)

    const [limitUpMap] = await Promise.all([
      calcLimitUpDays(codes),
    ])

    const results = batch.map((s: any) => {
      const code = s.f12
      return {
        code,
        name: s.f14 || '',
        price: s.f2 || 0,
        changeRate: s.f3 || 0,
        changeAmount: s.f4 || 0,
        volume: s.f5 || 0,
        amount: s.f6 || 0,
        turnover: s.f8 || 0,
        upCount: s.f10 || 0,
        high: s.f15 || 0,
        low: s.f16 || 0,
        open: s.f17 || 0,
        preClose: s.f18 || 0,
        limitDays: limitUpMap.get(code) || 1,
      }
    })
    allResults.push(...results)
  }

  // 按连板数排序
  allResults.sort((a, b) => b.limitDays - a.limitDays)

  return NextResponse.json(allResults)
}
