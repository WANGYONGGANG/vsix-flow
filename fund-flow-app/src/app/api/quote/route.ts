import { NextRequest, NextResponse } from 'next/server'
import { fetchWithRetry } from '@/lib/fetchWithRetry'

const PUSH2 = 'https://push2.eastmoney.com/api/qt'

async function push2Fetch(path: string) {
  return fetchWithRetry(`${PUSH2}${path}`)
}

interface StockQuote {
  code: string
  name: string
  price: number
  changeRate: number
  changeAmount: number
  volume: number
  amount: number
  turnover: number
  high: number
  low: number
  open: number
  preClose: number
  amplitude: number
  pe: number
  pb: number
  totalMarketValue: number
  circulateMarketValue: number
  speed: number // 涨速
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const codesParam = searchParams.get('codes')

  if (!codesParam) {
    return NextResponse.json({ error: 'missing codes parameter' }, { status: 400 })
  }

  const codes = codesParam.split(',').filter(Boolean)
  if (!codes.length) {
    return NextResponse.json({ error: 'codes is empty' }, { status: 400 })
  }

  // 构造 secid 列表
  const secids = codes
    .map((code) => {
      const trimmed = code.trim()
      return trimmed.startsWith('6') ? `1.${trimmed}` : `0.${trimmed}`
    })
    .join(',')

  // 完整字段列表
  const fields = 'f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13,f14,f15,f16,f17,f18,f20,f21,f22,f23,f24,f25,f152,f161,f167,f168,f169,f170,f171,f292'

  try {
    const json = await push2Fetch(
      `/ulist.np/get?ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&secids=${secids}&fields=${fields}&_=${Date.now()}`
    )

    const quotes: StockQuote[] = (json?.data?.diff || []).map((q: any) => ({
      code: q.f12 || '',
      name: q.f14 || '',
      price: q.f2 || 0,
      changeRate: q.f3 || 0,
      changeAmount: q.f4 || 0,
      volume: q.f5 || 0,
      amount: q.f6 || 0,
      turnover: q.f8 || 0,
      high: q.f15 || 0,
      low: q.f16 || 0,
      open: q.f17 || 0,
      preClose: q.f18 || 0,
      amplitude: q.f7 || 0,
      pe: q.f9 || 0,
      pb: q.f23 || 0,
      totalMarketValue: q.f20 || 0,
      circulateMarketValue: q.f21 || 0,
      speed: q.f292 || 0,
    }))

    return NextResponse.json({ data: quotes })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}
