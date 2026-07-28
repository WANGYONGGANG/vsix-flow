import { NextResponse } from 'next/server'
import { fetchWithRetry } from '@/lib/fetchWithRetry'

const PUSH2 = 'https://push2.eastmoney.com/api/qt'

async function push2Fetch(path: string) {
  return fetchWithRetry(`${PUSH2}${path}`)
}

interface IndexData {
  code: string
  name: string
  price: number
  changeRate: number
  changeAmount: number
  volume: number
  amount: number
  upCount?: number
  downCount?: number
  flatCount?: number
}

// 获取最近 N 个交易日日期（不含周末）
function getLastTradeDates(count: number): string[] {
  const dates: string[] = []
  const now = new Date()
  const day = now.getDay()
  let diff = day === 0 ? 3 : day === 1 ? 4 : 1
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

export async function GET() {
  // 1. 获取7大指数行情（f104=上涨家数, f105=下跌家数, f106=平盘家数）
  const indexSecids = '1.000001,0.399001,0.399006,0.399005,1.000016,1.000300,1.000688'
  const indexFields = 'f2,f3,f4,f5,f6,f12,f14,f104,f105,f106'
  const indexJson = await push2Fetch(
    `/ulist.np/get?ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&secids=${indexSecids}&fields=${indexFields}&_=${Date.now()}`
  )

  const indexDiff: any[] = indexJson?.data?.diff || []
  const indices: IndexData[] = indexDiff.map((q: any) => ({
    code: q.f12 || '',
    name: q.f14 || '',
    price: q.f2 || 0,
    changeRate: q.f3 || 0,
    changeAmount: q.f4 || 0,
    volume: q.f5 || 0,
    amount: q.f6 || 0,
    upCount: q.f104 || 0,
    downCount: q.f105 || 0,
    flatCount: q.f106 || 0,
  }))

  // 2. 从上证+深证指数的涨跌平家数汇总全市场统计
  const shIndex = indexDiff.find((q: any) => q.f12 === '000001')
  const szIndex = indexDiff.find((q: any) => q.f12 === '399001')
  const upCount = (shIndex?.f104 || 0) + (szIndex?.f104 || 0)
  const downCount = (shIndex?.f105 || 0) + (szIndex?.f105 || 0)
  const flatCount = (shIndex?.f106 || 0) + (szIndex?.f106 || 0)
  const totalCount = upCount + downCount + flatCount

  // 3. 获取涨停/跌停股（拉涨幅前200名覆盖涨停，跌幅前200名覆盖跌停）
  const stockFs = 'm:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23'

  const [topJson, bottomJson] = await Promise.all([
    push2Fetch(
      `/clist/get?pn=1&pz=200&np=1&fltt=2&invt=2&po=1&fid=f3&fs=${stockFs}&fields=f3,f12,f14&_=${Date.now()}`
    ),
    push2Fetch(
      `/clist/get?pn=1&pz=200&np=1&fltt=2&invt=2&po=0&fid=f3&fs=${stockFs}&fields=f3,f12,f14&_=${Date.now()}`
    ),
  ])

  const topList: any[] = topJson?.data?.diff || []
  const bottomList: any[] = bottomJson?.data?.diff || []

  let limitUpCount = 0
  let limitDownCount = 0

  for (const stock of topList) {
    const changeRate = stock.f3 ?? 0
    const name = stock.f14 || ''
    if (changeRate >= 9.8 && !name.includes('ST')) {
      limitUpCount++
    }
  }

  for (const stock of bottomList) {
    const changeRate = stock.f3 ?? 0
    const name = stock.f14 || ''
    if (changeRate <= -9.8 && !name.includes('ST')) {
      limitDownCount++
    }
  }

  // 4. 获取北向资金（沪股通 + 深股通）
  let northFlow = { sh: 0, sz: 0, total: 0 }
  try {
    const northRes = await fetch(
      'https://push2.eastmoney.com/api/qt/kamtbs.min.js?fields1=f1,f3&fields2=f51,f52,f53,f54,f55,f56',
      { signal: AbortSignal.timeout(10000) }
    )
    const northText = await northRes.text()
    const startIdx = northText.indexOf('"')
    const endIdx = northText.lastIndexOf('"')
    if (startIdx >= 0 && endIdx > startIdx) {
      const raw = northText.slice(startIdx + 1, endIdx)
      const northJson = JSON.parse(raw)
      const d = northJson?.data || {}
      const sh = d.f51 || 0
      const sz = d.f54 || 0
      northFlow = { sh, sz, total: sh + sz }
    }
  } catch {}

  return NextResponse.json({
    indices,
    limitUpCount,
    limitDownCount,
    upCount,
    downCount,
    flatCount,
    totalCount,
    northFlow,
  })
}
