import { NextRequest, NextResponse } from 'next/server'
import { fetchWithRetry } from '@/lib/fetchWithRetry'

const PUSH2HIS = 'https://push2his.eastmoney.com/api/qt/stock/kline/get'

// 周期映射：东方财富 klt 参数
const PERIOD_MAP: Record<string, number> = {
  '5min': 5,
  '15min': 15,
  '30min': 30,
  '60min': 60,
  'day': 101,
  'week': 102,
  'month': 103,
}

interface KlineItem {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  amount: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const period = searchParams.get('period') || 'day'

  if (!code) {
    return NextResponse.json({ error: 'missing code parameter' }, { status: 400 })
  }

  const klt = PERIOD_MAP[period]
  if (klt === undefined) {
    return NextResponse.json({ error: `invalid period: ${period}. Supported: 5min,15min,30min,60min,day,week,month` }, { status: 400 })
  }

  // 构造 secid：6开头为上交所(1.xxx)，其他为深交所(0.xxx)
  const secid = code.startsWith('6') ? `1.${code}` : `0.${code}`

  // K线数量：分钟K取120根，日/周/月取120根
  const lmt = klt < 100 ? 120 : 120

  const url = `${PUSH2HIS}?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=${klt}&fqt=1&beg=0&end=20500101&lmt=${lmt}&_=${Date.now()}`

  try {
    const json = await fetchWithRetry(url)

    const name = json?.data?.name || ''
    const klines: string[] = json?.data?.klines || []

    const parsed: KlineItem[] = klines.map((line: string) => {
      const parts = line.split(',')
      return {
        time: parts[0] || '',
        open: parseFloat(parts[1]) || 0,
        close: parseFloat(parts[2]) || 0,
        high: parseFloat(parts[3]) || 0,
        low: parseFloat(parts[4]) || 0,
        volume: parseFloat(parts[5]) || 0,
        amount: parseFloat(parts[6]) || 0,
      }
    })

    return NextResponse.json({
      code,
      name,
      period,
      klines: parsed,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 })
  }
}
