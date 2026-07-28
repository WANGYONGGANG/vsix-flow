import { NextResponse } from 'next/server'
import { fetchWithRetry } from '@/lib/fetchWithRetry'

const PUSH2 = 'https://push2.eastmoney.com/api/qt'

async function push2Fetch(path: string) {
  return fetchWithRetry(`${PUSH2}${path}`)
}

// 板块分类类型：概念板块 或 行业板块
interface SectorItem {
  code: string
  name: string
  price: number
  changeRate: number
  changeAmount: number
  upCount: number
  downCount: number
  volume: number
  amount: number
  type: string
}

function parseSectors(diff: any[], type: string): SectorItem[] {
  return diff.map((d: any) => ({
    code: d.f12 || '',
    name: d.f14 || '',
    price: d.f2 || 0,
    changeRate: d.f3 || 0,
    changeAmount: d.f4 || 0,
    upCount: d.f10 || 0,
    downCount: d.f15 || 0,
    volume: d.f104 || 0,
    amount: d.f105 || 0,
    type,
  }))
}

export async function GET() {
  const fields = 'f12,f14,f2,f3,f4,f10,f15,f104,f105'
  const base = `/clist/get?pn=1&pz=200&po=1&np=1&fltt=2&invt=2&fs=`

  // 并行获取概念板块和行业板块
  const [conceptJson, industryJson] = await Promise.all([
    push2Fetch(`${base}m:90+t:2&fields=${fields}&_=${Date.now()}`),
    push2Fetch(`${base}m:90+t:1&fields=${fields}&_=${Date.now()}`),
  ])

  const concepts = parseSectors(conceptJson?.data?.diff || [], 'concept')
  const industries = parseSectors(industryJson?.data?.diff || [], 'industry')

  // 合并并按涨幅排序
  const all = [...concepts, ...industries].sort(
    (a, b) => b.changeRate - a.changeRate
  )

  return NextResponse.json(all)
}
