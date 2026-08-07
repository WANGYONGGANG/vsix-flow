// 新闻搜索：东财 search JSONP，失败回退到东财资讯列表 + 新浪滚动新闻，保证 Web 端有数据
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from '../shared/response';
import { httpsGetText, httpGetJson, stripJsonp } from '../shared/http';

/** 从东财搜索 JSONP 抽取结果列表 */
function tryEastmoneyJsonp(text: string, pageSize: number): any[] {
  const jsonData = stripJsonp(text);
  const arr: any[] = jsonData?.result?.cmsArticleWebOld || [];
  if (!Array.isArray(arr) || !arr.length) return [];
  return arr.slice(0, pageSize).map((a: any) => ({
    title: a.title || '',
    content: String(a.content || '').replace(/<[^>]+>/g, '').slice(0, 120),
    url: a.articleUrl || '',
    time: a.date || '',
    source: a.mediaName || '东方财富',
    showtime: a.date || '',
  }));
}

/** 从东财快讯 (em-news) 映射为 新闻列表 */
function fallbackFromEastmoneyKuaiXun(raw: any, pageSize: number): any[] {
  const news: any[] = raw?.news || raw?.data?.list || raw?.list || [];
  if (!Array.isArray(news) || !news.length) return [];
  return news.slice(0, pageSize).map((n: any) => ({
    title: n.title || n.Art_Title || '',
    content: String(n.digest || n.content || n.simdigest || '').replace(/<[^>]+>/g, '').slice(0, 120),
    url: n.url_w || n.url_m || n.url_unique || '',
    time: n.showtime || n.ordertime || '',
    source: n.Art_Media_Name || n.source || '东方财富快讯',
    showtime: n.showtime || n.ordertime || '',
  }));
}

/** 从 新浪 滚动新闻 抽取结果列表 */
async function trySinaRoll(pageSize: number): Promise<any[]> {
  try {
    const r = await httpGetJson(
      `https://feed.mix.sina.com.cn/api/roll/get?pageid=153&lid=2516&num=${pageSize}&page=1&r=${Math.random()}`,
      'https://finance.sina.com.cn/'
    );
    const items: any[] = r?.result?.data || [];
    if (!Array.isArray(items) || !items.length) return [];
    return items.slice(0, pageSize).map((x: any) => ({
      title: x.title || '',
      content: String(x.summary || x.intro || '').replace(/<[^>]+>/g, '').slice(0, 120),
      url: x.url || x.wapurl || '',
      time: x.ctime ? new Date(Number(x.ctime) * 1000).toISOString().replace('T', ' ').slice(0, 19) : (x.datetime || ''),
      source: x.author || x.media_name || '新浪财经',
      showtime: x.ctime ? new Date(Number(x.ctime) * 1000).toISOString().replace('T', ' ').slice(0, 19) : (x.datetime || ''),
    }));
  } catch { return []; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const keyword = getQuery(req, 'keyword', 'A股 股市');
  const pageIndex = getQuery(req, 'page', '1');
  const pageSize = Math.max(5, Math.min(100, parseInt(getQuery(req, 'pageSize', '30')) || 30));
  let list: any[] = [];

  // 1. 首选：东财 search-api-web JSONP
  try {
    const param = JSON.stringify({
      uid: '', keyword, type: ['cmsArticleWebOld'], client: 'web',
      clientType: 'web', clientVersion: 'curr',
      param: {
        cmsArticleWebOld: {
          searchScope: 'default', sort: 'default',
          pageIndex: Number(pageIndex), pageSize,
          preTag: '', postTag: '',
        },
      },
    });
    const body = await httpsGetText(
      `https://search-api-web.eastmoney.com/search/jsonp?cb=x&param=${encodeURIComponent(param)}`,
      'https://www.eastmoney.com/'
    );
    list = tryEastmoneyJsonp(body, pageSize);
  } catch { /* empty */ }

  // 2. 回退：东财 快讯 (kuaixun)
  if (!list.length) {
    try {
      const kx = await httpGetJson(
        `http://newsapi.eastmoney.com/kuaixun/v2/api/list?pageSize=${pageSize}&pageIndex=1`,
        'https://www.eastmoney.com/'
      );
      list = fallbackFromEastmoneyKuaiXun(kx, pageSize);
    } catch { /* empty */ }
  }

  // 3. 回退：新浪滚动新闻
  if (!list.length) {
    list = await trySinaRoll(pageSize);
  }

  // 过滤无标题的脏数据，再次兜底空
  list = list.filter((x) => String(x.title || '').trim().length > 0);
  json(res, 200, { data: { list } });
}

