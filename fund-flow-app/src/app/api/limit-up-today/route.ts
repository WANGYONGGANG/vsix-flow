import { NextResponse } from 'next/server'

const DC = 'https://datacenter-web.eastmoney.com/api/data/v1/get'
const PUSH2 = 'https://push2.eastmoney.com/api/qt'

function getYesterdayTradeDate(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 3 : day === 1 ? 4 : 1
  const d = new Date(now); d.setDate(d.getDate() - diff)
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), dd = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${dd}`
}

// 获取最近 N 个交易日日期（不含周末）
function getLastTradeDates(count: number): string[] {
  const dates: string[] = []
  const now = new Date()
  const day = now.getDay()
  let diff = day === 0 ? 3 : day === 1 ? 4 : 1 // 昨天
  while (dates.length < count) {
    const d = new Date(now)
    d.setDate(d.getDate() - diff)
    const wd = d.getDay()
    if (wd !== 0 && wd !== 6) {
      const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), dd = String(d.getDate()).padStart(2,'0')
      dates.push(`${y}-${m}-${dd}`)
    }
    diff++
  }
  return dates
}

async function dcFetch(params: Record<string,string>) {
  const res = await fetch(`${DC}?${new URLSearchParams({source:'WEB',client:'WEB',...params}).toString()}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://data.eastmoney.com/' },
    signal: AbortSignal.timeout(15000),
  })
  return res.json()
}

async function push2Fetch(path: string) {
  const res = await fetch(`${PUSH2}${path}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(15000),
  })
  return res.json()
}

// 通过批量查询历史涨停数据计算连板数
async function calcLimitUpDays(codes: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  // 获取最近 10 个交易日
  const dates = getLastTradeDates(10)

  // 建立 code -> 涨停日期Set
  const codeToDates = new Map<string, Set<string>>()

  // 批量查询每天的涨停股
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
    } catch { /* 忽略单天错误 */ }
  }

  // 计算连续涨停天数：从昨天往回数
  const yesterday = dates[0]
  for (const code of codes) {
    const dateSet = codeToDates.get(code)
    if (!dateSet || !dateSet.has(yesterday)) {
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
  const yesterday = getYesterdayTradeDate()
  const fd = yesterday

  // 1. 获取昨日涨停股
  const ztRes = await dcFetch({
    sortColumns: 'CHANGE_RATE', sortTypes: '-1', pageSize: '500', pageNumber: '1',
    reportName: 'RPT_DAILYBILLBOARD_DETAILSNEW',
    columns: 'SECURITY_CODE,SECURITY_NAME_ABBR,CLOSE_PRICE,CHANGE_RATE,EXPLANATION',
    filter: `(TRADE_DATE='${yesterday}')(CHANGE_RATE>=9.8)`,
  })
  const list: any[] = ztRes?.result?.data || []
  const seen = new Set<string>()
  const ztList: { c:string; n:string; p:number; zdp:number; hy:string }[] = []
  for (const item of list) {
    const code = item.SECURITY_CODE
    const name = item.SECURITY_NAME_ABBR || ''
    if (!code || seen.has(code)) continue
    // 过滤 ST/*ST
    if (name.includes('ST')) continue
    seen.add(code)
    ztList.push({ c: code, n: name, p: item.CLOSE_PRICE||0, zdp: item.CHANGE_RATE||0, hy: item.EXPLANATION||'' })
  }
  if (!ztList.length) return NextResponse.json([])

  // 2. 计算连板数 + 获取今日行情（并行）
  const codes = ztList.map(s => s.c).filter(Boolean)
  const secids = codes.map(c => c.startsWith('6') ? `1.${c}` : `0.${c}`).join(',')
  const quoteUrl = `/ulist.np/get?ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&secids=${secids}&fields=f12,f14,f2,f3,f5,f6,f15,f16,f13&_=${Date.now()}`

  const [quoteJson, klineMap] = await Promise.all([
    push2Fetch(quoteUrl),
    calcLimitUpDays(codes),
  ])
  const quoteMap = new Map<string,any>()
  ;(quoteJson?.data?.diff || []).forEach((q: any) => quoteMap.set(q.f12, q))

  const stocks = ztList.map(s => {
    const q = quoteMap.get(s.c)
    return {
      code: s.c, name: s.n || q?.f14 || '',
      yesterdayClose: s.p, yesterdayChangeRate: s.zdp,
      todayPrice: q?.f2 || 0, todayChangeRate: q?.f3 || 0,
      todayHigh: q?.f15 || 0, todayLow: q?.f16 || 0,
      volume: q?.f5 || 0, amount: q?.f6 || 0,
      sector: s.hy, limitUpDays: klineMap.get(s.c) || 1,
    }
  })

  return NextResponse.json(stocks.sort((a: any, b: any) => b.limitUpDays - a.limitUpDays))
}
