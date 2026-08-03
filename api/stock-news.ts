// 个股资讯搜索
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from '../_shared/response';
import { httpsGetText, toSinaCode, toCleanCode, stripJsonp } from '../_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const code = toCleanCode(toSinaCode(getQuery(req, 'code', '')));
  const pageSize = getQuery(req, 'pageSize', '10');
  const param = JSON.stringify({
    uid: '', keyword: code, type: ['cmsArticleWebOld'], client: 'web',
    clientType: 'web', clientVersion: 'curr',
    param: { cmsArticleWebOld: { searchScope: 'default', sort: 'default', pageIndex: 1, pageSize: Number(pageSize), preTag: '', postTag: '' } }
  });
  const r = await httpsGetText(
    `https://search-api-web.eastmoney.com/search/jsonp?cb=x&param=${encodeURIComponent(param)}`,
    'https://www.eastmoney.com/'
  );
  const jsonData = stripJsonp(r);
  const list = (jsonData?.result?.cmsArticleWebOld || []).map((a: any) => ({
    title: a.title || '',
    url: a.articleUrl || `https://finance.eastmoney.com/a/${a.code || ''}.html`,
    time: a.date || '', source: '资讯',
    content: String(a.content || '').replace(/<[^>]+>/g, '').slice(0, 100),
  }));
  json(res, 200, { data: { list } });
}
