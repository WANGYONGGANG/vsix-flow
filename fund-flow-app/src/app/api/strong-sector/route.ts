import { NextResponse } from 'next/server'
import { fetchWithRetry } from '@/lib/fetchWithRetry'

const PUSH2 = 'https://push2.eastmoney.com/api/qt'

async function push2Fetch(path: string) {
  return fetchWithRetry(`${PUSH2}${path}`)
}

interface TopStock {
  name: string
  code: string
  changeRate: number
}

interface StrongSector {
  code: string
  name: string
  changeRate: number
  price: number
  volume: number
  amount: number
  upCount: number
  maxLimitDays: number
  topStocks: TopStock[]
}

export async function GET() {
  // 1. 获取所有概念板块，按涨幅降序，取前30
  const sectorFields = 'f12,f14,f2,f3,f5,f6,f104,f105'
  const sectorJson = await push2Fetch(
    `/clist/get?pn=1&pz=30&po=1&np=1&fltt=2&invt=2&fs=m:90+t:2&fields=${sectorFields}&fid=f3&po=1&ndd=1&_=${Date.now()}`
  )

  const sectors: any[] = sectorJson?.data?.diff || []
  if (!sectors.length) return NextResponse.json([])

  // 2. 对每个板块获取成分股，计算涨停家数、最大连板高度、领涨股
  const results: StrongSector[] = []

  for (let i = 0; i < sectors.length; i += 5) {
    const batch = sectors.slice(i, i + 5)
    const batchResults = await Promise.all(
      batch.map(async (s: any) => {
        const sectorCode = s.f12
        const sectorName = s.f14 || ''
        const stockFields = 'f12,f14,f3,f2'
        // 获取该板块成分股（涨幅降序，最多100只）
        const stockJson = await push2Fetch(
          `/clist/get?pn=1&pz=100&po=1&np=1&fltt=2&invt=2&fs=b:${sectorCode}+f:!50&fields=${stockFields}&fid=f3&po=1&ndd=1&_=${Date.now()}`
        )
        const stockList: any[] = stockJson?.data?.diff || []

        // 涨停股（涨幅 >= 9.8%）
        const limitUpStocks = stockList.filter((st: any) => st.f3 >= 9.8)
        const upCount = limitUpStocks.length

        // 领涨股（涨幅前3）
        const topStocks: TopStock[] = stockList.slice(0, 3).map((st: any) => ({
          name: st.f14 || '',
          code: st.f12 || '',
          changeRate: st.f3 || 0,
        }))

        // 计算最大连板高度（从涨停股中取连板数最高的）
        let maxLimitDays = 0
        if (limitUpStocks.length > 0) {
          // 简化：通过K线计算每只涨停股的连板数
          const limitDayPromises = limitUpStocks.slice(0, 10).map(async (st: any) => {
            const code = st.f12
            const secid = code.startsWith('6') ? `1.${code}` : `0.${code}`
            try {
              const klineJson = await push2Fetch(
                `/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57&klt=101&fqt=1&lmt=10&_=${Date.now()}`
              )
              const klines: string[] = klineJson?.data?.klines || []
              let count = 0
              for (let j = klines.length - 1; j >= 0; j--) {
                const p = klines[j].split(',')
                if (p.length < 6) continue
                const open = parseFloat(p[1])
                const close = parseFloat(p[2])
                const preClose = j > 0 ? parseFloat(klines[j - 1].split(',')[2]) : open
                const change = preClose > 0 ? ((close - preClose) / preClose) * 100 : 0
                if (change >= 9.5) count++
                else break
              }
              return count
            } catch {
              return 1
            }
          })
          const limitDaysArr = await Promise.all(limitDayPromises)
          maxLimitDays = Math.max(...limitDaysArr, 0)
        }

        return {
          code: sectorCode,
          name: sectorName,
          changeRate: s.f3 || 0,
          price: s.f2 || 0,
          volume: s.f104 || 0,
          amount: s.f105 || 0,
          upCount,
          maxLimitDays,
          topStocks,
        }
      })
    )
    results.push(...batchResults)
  }

  return NextResponse.json(results)
}
