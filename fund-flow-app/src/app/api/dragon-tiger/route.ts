import { NextRequest, NextResponse } from 'next/server'

const DC = 'https://datacenter-web.eastmoney.com/api/data/v1/get'

function dcParams(params: Record<string, string>) {
  return new URLSearchParams({ source: 'WEB', client: 'WEB', ...params }).toString()
}

async function dcFetch(params: Record<string, string>) {
  const res = await fetch(`${DC}?${dcParams(params)}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://data.eastmoney.com/',
    },
    signal: AbortSignal.timeout(15000),
  })
  return res.json()
}

function getYesterdayTradeDate(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 3 : day === 1 ? 4 : 1
  const d = new Date(now)
  d.setDate(d.getDate() - diff)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${dd}`
}

function classifySeat(name: string): { type: string; tag: string } {
  if (name.includes('机构专用')) return { type: '机构', tag: '机构专用' }
  
  // 量化
  const quantKw = ['量化', '中国国际金融', '中金公司']
  for (const kw of quantKw) { if (name.includes(kw)) return { type: '量化', tag: kw.includes('中金') ? '中金' : '量化' } }
  
  // 敢死队
  const gangKw = ['中山东路', '上塘路', '涅盘重升', '瑞鹤仙', '赵老哥', '炒股养家', '章盟主', '方新侠',
    '孙哥', '作手新一', '小鳄鱼', 'Asking', 'asking', '欢乐海岸', '深南哥', '金田路',
    '著名刺客', '流沙河', '桑田路', '佛山系', '无影脚', '解放南路', '粉葛',
    '北京炒家', '一瞬流光', '陈小群', '交易猿', '退学炒股', '爱在冰川']
  for (const kw of gangKw) { if (name.includes(kw)) return { type: '敢死队', tag: kw } }
  
  // 拉萨天团
  if (name.includes('拉萨') || name.includes('团结路') || name.includes('东环路')) {
    return { type: '游资', tag: '拉萨天团' }
  }
  
  // 知名营业部
  const seats: [string, string][] = [
    ['武定路', '武定路'], ['益田路', '益田路'], ['溧阳路', '溧阳路'],
    ['太平南路', '太平南路'], ['江苏路', '江苏路'], ['福华三路', '福华三路'],
    ['绍兴', '绍兴赵老哥'], ['阜成路', '阜成路'], ['绿景路', '佛山绿景路'],
    ['体育场路', '体育场路'], ['杭大路', '杭大路'], ['深南东路', '深南东'],
    ['建国西路', '建国西路'], ['南广济街', '南广济街'], ['红宝石路', '红宝石路'],
    ['宛平南路', '宛平南路'], ['大钟亭', '大钟亭'], ['武珞路', '武珞路'],
    ['生态大街', '生态大街'], ['福中三路', '福中三路'], ['虹桥路', '虹桥路'],
  ]
  for (const [kw, tag] of seats) { if (name.includes(kw)) return { type: '游资', tag } }
  
  // 兜底券商
  const brokers = ['中信证券', '华泰证券', '国泰君安', '招商证券', '海通证券', '广发证券',
    '银河证券', '申万宏源', '国信证券', '光大证券', '平安证券', '兴业证券',
    '中泰证券', '安信证券', '方正证券', '长江证券', '国金证券', '天风证券',
    '财通证券', '浙商证券', '华鑫证券', '华福证券', '民生证券', '南京证券',
    '中金公司', '国盛证券', '东兴证券', '华安证券', '东北证券', '国元证券']
  for (const b of brokers) { if (name.includes(b)) return { type: '游资', tag: b.replace('证券', '').replace('股份有限公司', '').replace('有限责任公司', '') } }
  
  return { type: '其他', tag: '其他' }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tradeDate = searchParams.get('date') || getYesterdayTradeDate()
  const formattedDate = `${tradeDate.slice(0, 4)}-${tradeDate.slice(4, 6)}-${tradeDate.slice(6, 8)}`

  // 1. 获取龙虎榜汇总
  const summary = await dcFetch({
    sortColumns: 'NET_BUY_AMT,TRADE_DATE,SECURITY_CODE',
    sortTypes: '-1,-1,1', pageSize: '500', pageNumber: '1',
    reportName: 'RPT_ORGANIZATION_TRADE_DETAILS', columns: 'ALL',
    filter: `(TRADE_DATE='${formattedDate}')`,
  })
  const list: any[] = summary?.result?.data || []
  if (!list.length) return NextResponse.json([])

  // 2. 批量获取席位明细（每批 5 只，避免超时）
  const entries = []
  for (let i = 0; i < list.length; i += 5) {
    const batch = list.slice(i, i + 5)
    const results = await Promise.all(batch.map(async (item: any) => {
      const code = item.SECURITY_CODE
      let seats: any[] = []
      try {
        const [buyRes, sellRes] = await Promise.all([
          dcFetch({
            sortColumns: 'BUY', sortTypes: '-1', pageSize: '50', pageNumber: '1',
            reportName: 'RPT_BILLBOARD_DAILYDETAILSBUY', columns: 'ALL',
            filter: `(TRADE_DATE='${formattedDate}')(SECURITY_CODE='${code}')`,
          }),
          dcFetch({
            sortColumns: 'SELL', sortTypes: '-1', pageSize: '50', pageNumber: '1',
            reportName: 'RPT_BILLBOARD_DAILYDETAILSSELL', columns: 'ALL',
            filter: `(TRADE_DATE='${formattedDate}')(SECURITY_CODE='${code}')`,
          }),
        ])
        const buyList: any[] = buyRes?.result?.data || []
        const sellList: any[] = sellRes?.result?.data || []
        const seatMap = new Map<string, { buy: number; sell: number }>()
        for (const b of buyList) {
          const n = b.OPERATEDEPT_NAME || ''
          if (!n) continue
          const e = seatMap.get(n) || { buy: 0, sell: 0 }
          e.buy += b.BUY ? b.BUY / 10000 : 0
          seatMap.set(n, e)
        }
        for (const s of sellList) {
          const n = s.OPERATEDEPT_NAME || ''
          if (!n) continue
          const e = seatMap.get(n) || { buy: 0, sell: 0 }
          e.sell += s.SELL ? s.SELL / 10000 : 0
          seatMap.set(n, e)
        }
        seats = [...seatMap.entries()].map(([seatName, amt]) => {
          const { type, tag } = classifySeat(seatName)
          return { seatName, buyAmt: +amt.buy.toFixed(2), sellAmt: +amt.sell.toFixed(2), netAmt: +(amt.buy - amt.sell).toFixed(2), type, tag }
        }).sort((a, b) => b.netAmt - a.netAmt)
      } catch { /* skip */ }

      return {
        code: code || '',
        name: item.SECURITY_NAME_ABBR || '',
        tradeDate: formattedDate,
        closePrice: item.CLOSE_PRICE || 0,
        changeRate: item.CHANGE_RATE ? item.CHANGE_RATE / 100 : 0,
        netBuyAmt: item.NET_BUY_AMT ? item.NET_BUY_AMT / 10000 : 0,
        buyTimes: item.BUY_TIMES || 0,
        sellTimes: item.SELL_TIMES || 0,
        reason: item.EXPLANATION || '',
        seats,
      }
    }))
    entries.push(...results)
  }

  return NextResponse.json(entries.sort((a: any, b: any) => b.netBuyAmt - a.netBuyAmt))
}
