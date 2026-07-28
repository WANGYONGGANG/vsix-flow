import { NextResponse } from 'next/server'
import { fetchWithRetry } from '@/lib/fetchWithRetry'

const PUSH2 = 'https://push2.eastmoney.com/api/qt'

async function push2Fetch(path: string) {
  return fetchWithRetry(`${PUSH2}${path}`)
}

// 非真正概念板块的名称黑名单
const EXCLUDED_SECTORS = new Set([
  '融资融券', '富时罗素', 'MSCI中国', '沪股通', '深股通', '百元股',
  '昨日高振幅', '昨日涨停', '昨日连板', '昨日上榜', '昨日首板',
  '大盘股', '中盘股', '小盘股', 'HS300_', '上证50_', '科创50',
  '基金重仓', '社保重仓', 'QFII重仓', '机构重仓', '标准普尔',
  '低价股', '高质押', '破净', '破发', '超跌股', '参股新股',
  '含H股', '含B股', 'AH股', '大盘成长', '中盘成长', '小盘成长',
  '科技风格', '长江三角', '创业成份', '权重股',
])

interface SectorItem {
  id: string
  name: string
  netInflow: number
  changeRate: number
  changeAmount: number
  price: number
  amount: number
}

export async function GET() {
  const fields = 'f12,f14,f62,f3,f4,f2,f6'
  const json = await push2Fetch(
    `/clist/get?pn=1&pz=50&po=1&np=1&fltt=2&invt=2&fid=f62&fs=m:90+t:3&fields=${fields}&_=${Date.now()}`
  )

  const rawList: any[] = json?.data?.diff || []

  const sectors: SectorItem[] = rawList
    .filter((item: any) => {
      const name = item.f14 || ''
      // 过滤掉非真正概念板块（精确匹配或前缀匹配）
      for (const excluded of EXCLUDED_SECTORS) {
        if (name === excluded || name.startsWith(excluded)) {
          return false
        }
      }
      return true
    })
    .map((item: any) => ({
      id: String(item.f12 || ''),
      name: item.f14 || '',
      netInflow: (item.f62 || 0) / 1e8,      // 元 -> 亿元
      changeRate: item.f3 || 0,
      changeAmount: item.f4 || 0,
      price: item.f2 || 0,
      amount: item.f6 || 0,
    }))
    .sort((a, b) => b.netInflow - a.netInflow)

  return NextResponse.json({ sectors })
}
