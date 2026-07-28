import { NextResponse } from 'next/server'
import { fetchWithRetry } from '@/lib/fetchWithRetry'

const PUSH2 = 'https://push2.eastmoney.com/api/qt'

async function push2Fetch(path: string) {
  return fetchWithRetry(`${PUSH2}${path}`)
}

export async function GET() {
  // 1. 先从概念板块列表中找到"东方财富热股"的板块代码
  const boardJson = await push2Fetch(
    `/clist/get?pn=1&pz=500&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:90+t:3&fields=f12,f14&_=${Date.now()}`
  )
  const boardList: any[] = boardJson?.data?.diff || []
  const hotBoard = boardList.find((b) => b.f14 === '东方财富热股')

  if (!hotBoard) {
    return NextResponse.json([])
  }

  const boardCode = hotBoard.f12

  // 2. 获取该板块的成分股，按涨幅排序
  const stockJson = await push2Fetch(
    `/clist/get?pn=1&pz=100&po=1&np=1&fltt=2&invt=2&fid=f3&fs=b:${boardCode}&fields=f2,f3,f4,f5,f6,f12,f14,f15,f16&_=${Date.now()}`
  )
  const stockList: any[] = stockJson?.data?.diff || []

  const stocks = stockList
    .filter((s) => {
      const name = s.f14 || ''
      return !name.includes('ST')
    })
    .map((s) => ({
      code: String(s.f12 || ''),
      name: s.f14 || '',
      price: s.f2 || 0,
      changeRate: s.f3 || 0,
      changeAmount: s.f4 || 0,
      volume: s.f5 || 0,
      amount: s.f6 || 0,
      high: s.f15 || 0,
      low: s.f16 || 0,
    }))

  return NextResponse.json(stocks)
}
