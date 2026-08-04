// 新闻搜索
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from './_shared/response';
import { httpsGetText, stripJsonp } from './_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const keyword = getQuery(req, 'keyword', 'A股 股市');
  const pageIndex = getQuery(req, 'page', '1');
  const pageSize = getQuery(req, 'pageSize', '30');
  const param = JSON.stringify({
    uid: '', keyword, type: ['cmsArticleWebOld'], client: 'web',
    clientType: 'web', clientVersion: 'curr',
    param: { cmsArticleWebOld: { searchScope: 'default', sort: 'default', pageIndex: Number(pageIndex), pageSize: Number(pageSize), preTag: '', postTag: '' } }
  });
  const r = await httpsGetText(
    `https://search-api-web.eastmoney.com/search/jsonp?cb=x&param=${encodeURIComponent(param)}`,
    'https://www.eastmoney.com/'
  );
  const jsonData = stripJsonp(r);
  const list = (jsonData?.result?.cmsArticleWebOld || []).map((a: any) => ({
    title: a.title || '',
    content: String(a.content || '').replace(/<[^>]+>/g, '').slice(0, 120),
    url: a.articleUrl || '',
    time: a.date || '', source: a.mediaName || '东方财富', showtime: a.date || '',
  }));
  json(res, 200, { data: { list } });
}
