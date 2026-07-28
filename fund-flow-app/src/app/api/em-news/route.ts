import { NextResponse } from 'next/server'
import { fetchWithRetry } from '@/lib/fetchWithRetry'

interface NewsItem {
  id: string
  title: string
  content: string
  time: string
  source: string
}

async function fetchPrimary(): Promise<{ news: NewsItem[] } | null> {
  const ts = Date.now()
  const url = `https://np-weblist.eastmoney.com/comm/web/getFastNewsList?client=web&biz=web_724&fastColumn=102&sortEnd=&pageSize=50&page_index=1&req_trace=${ts}&_=${ts}`
  try {
    const json = await fetchWithRetry(url)
    const list: any[] = json?.data?.fastNewsList || []

    return {
      news: list.map((item: any) => ({
        id: String(item.code || item.id || ''),
        title: (item.title || '').slice(0, 50),
        content: item.summary || item.title || '',
        time: item.showTime || '',
        source: '东方财富',
      })),
    }
  } catch {
    return null
  }
}

async function fetchBackup(): Promise<{ news: NewsItem[] } | null> {
  // 备用：东方财富 wap 接口
  const url = `https://np-listapi.eastmoney.com/comm/wap/getListInfo?client=wap&type=1&mession=asf&fc=1&ps=50&p=1&needKline=0&req_trace=${Date.now()}`
  try {
    const json = await fetchWithRetry(url)
    const list: any[] = json?.data?.list || []

    return {
      news: list.map((item: any) => ({
        id: String(item.id || item.news_id || ''),
        title: (item.title || item.content || '').slice(0, 50),
        content: item.content || item.digest || '',
        time: item.showtime || item.ptime || item.time || '',
        source: '东方财富',
      })),
    }
  } catch {
    return null
  }
}

export async function GET() {
  let result = await fetchPrimary()

  if (!result || !result.news || result.news.length === 0) {
    result = await fetchBackup()
  }

  if (!result || !result.news) {
    return NextResponse.json({ news: [] })
  }

  return NextResponse.json(result)
}
