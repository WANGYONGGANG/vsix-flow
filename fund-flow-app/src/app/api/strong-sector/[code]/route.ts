import { NextResponse } from 'next/server'
import { fetchWithRetry } from '@/lib/fetchWithRetry'

const PUSH2 = 'https://push2.eastmoney.com/api/qt'

async function push2Fetch(path: string) {
  return fetchWithRetry(`${PUSH2}${path}`)
}

interface StockItem {
  code: string
  name: string
  price: number
  changeRate: number
  changeAmount: number
  volume: number
  amount: number
  high: number
  low: number
  turnoverRate: number
  pe: number
  marketCap: number
  totalShares: number
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const fields = 'f12,f14,f2,f3,f4,f5,f6,f7,f8,f15,f16,f17,f20,f21'
  const json = await push2Fetch(
    `/clist/get?pn=1&pz=30&po=1&np=1&fltt=2&invt=2&fid=f3&fs=b:BK${code}+t:3&fields=${fields}&_=${Date.now()}`
  )

  const rawList: any[] = json?.data?.diff || []

  const stocks: StockItem[] = rawList.map((item: any) => ({
    code: String(item.f12 || ''),
    name: item.f14 || '',
    price: item.f2 || 0,
    changeRate: item.f3 || 0,
    changeAmount: item.f4 || 0,
    volume: item.f5 || 0,
    amount: item.f6 || 0,
    high: item.f7 || 0,
    low: item.f8 || 0,
    turnoverRate: item.f16 || 0,
    pe: item.f17 || 0,
    marketCap: item.f20 || 0,
    totalShares: item.f21 || 0,
  }))

  return NextResponse.json({ stocks })
}
