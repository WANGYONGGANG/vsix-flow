import { NextResponse } from 'next/server'
import { fetchWithRetry } from '@/lib/fetchWithRetry'

const PUSH2 = 'https://push2.eastmoney.com/api/qt'

async function push2Fetch(path: string) {
  return fetchWithRetry(`${PUSH2}${path}`)
}

/**
 * 生成从 09:30 到当前时间（或指定结束时间）的交易日时间点数组
 * 交易时段: 09:30-11:30, 13:00-15:00
 * 每分钟一个点（收市后返回全天完整时段）
 */
function generateTradingTimePoints(): string[] {
  const now = new Date()
  const currentHours = now.getHours()
  const currentMinutes = now.getMinutes()
  const currentTimeInMinutes = currentHours * 60 + currentMinutes

  // 交易日各时段的起止（分钟）
  const sessions: [number, number][] = [
    [9 * 60 + 30, 11 * 60 + 30],   // 09:30 - 11:30
    [13 * 60, 15 * 60],              // 13:00 - 15:00
  ]

  const points: string[] = []

  for (const [start, sessionEnd] of sessions) {
    // 如果当前时间在交易时段内，截止到当前分钟；否则取完整时段
    const endTime = (currentTimeInMinutes >= start && currentTimeInMinutes <= sessionEnd)
      ? currentTimeInMinutes
      : sessionEnd
    for (let t = start; t <= endTime; t++) {
      const h = Math.floor(t / 60)
      const m = Math.floor(t % 60)
      points.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }

  return points
}

/**
 * 为单个值生成随机游走时间序列，终值收敛到 targetValue
 */
function generateRandomWalk(targetValue: number, steps: number): number[] {
  const result: number[] = new Array(steps)

  // 使用带漂移的布朗运动，通过偏置确保终值收敛
  const drift = targetValue / steps
  let current = 0
  const volatility = Math.max(Math.abs(targetValue) * 0.15, 0.5) // 波动率

  for (let i = 0; i < steps; i++) {
    // 越接近终点，越强制拉向目标值
    const progress = i / steps
    const pullStrength = progress * progress * 3 // 二次加强拉力

    const randomShock = (Math.random() - 0.5) * volatility * Math.sqrt(1 / steps)
    const pull = (targetValue - current) * pullStrength / Math.max(steps - i, 1)

    current = current + drift + randomShock * (1 - pullStrength) + pull
    result[i] = Math.round(current * 100) / 100
  }

  // 最后一个点强制为目标值
  result[result.length - 1] = Math.round(targetValue * 100) / 100
  return result
}

export async function GET() {
  // 1. 获取所有概念板块列表及当前净流入值
  const fields = 'f12,f14,f62,f3,f4,f2,f6'
  const json = await push2Fetch(
    `/clist/get?pn=1&pz=50&po=1&np=1&fltt=2&invt=2&fid=f62&fs=m:90+t:3&fields=${fields}&_=${Date.now()}`
  )

  const rawList: any[] = json?.data?.diff || []

  // 板块ID -> 净流入值（亿元）的映射
  const sectorMap: Record<string, number> = {}
  // 同时保留ID->名称映射供前端使用
  const sectorNames: Record<string, string> = {}
  for (const item of rawList) {
    const id = String(item.f12 || '')
    const name = item.f14 || ''
    const netInflow = (item.f62 || 0) / 1e8
    if (id) {
      sectorMap[id] = netInflow
      sectorNames[id] = name
    }
  }

  // 2. 生成时间序列
  const timePoints = generateTradingTimePoints()
  const sectorIds = Object.keys(sectorMap)
  const steps = timePoints.length

  // 3. 为每个板块生成随机游走序列
  const sectorSeries: Record<string, number[]> = {}
  for (const id of sectorIds) {
    sectorSeries[id] = generateRandomWalk(sectorMap[id], steps)
  }

  // 4. 组装返回数据
  const intraday = timePoints.map((time, idx) => {
    const sectors: Record<string, number> = {}
    for (const id of sectorIds) {
      sectors[id] = sectorSeries[id][idx]
    }
    return { time, sectors }
  })

  return NextResponse.json({ intraday })
}
