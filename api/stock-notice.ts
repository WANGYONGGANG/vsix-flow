// 个股公告
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from '../_shared/response';
import { httpsGetText, toSinaCode, toCleanCode, stripJsonp } from '../_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const code = toCleanCode(toSinaCode(getQuery(req, 'code', '')));
  const r = await httpsGetText(
    `https://np-anotice-stock.eastmoney.com/api/security/ann?cb=x&sr=-1&page_size=10&page_index=1&ann_type=A&client_source=web&f_node=0&s_node=0&stock_list=${code}`,
    'https://data.eastmoney.com/'
  );
  const jsonData = stripJsonp(r);
  const list = (jsonData?.data?.list || []).map((a: any) => ({
    title: a.title || '',
    url: `https://data.eastmoney.com/notices/detail/${code}/${a.art_code || ''}.html`,
    time: a.notice_date || '', source: '公告',
  }));
  json(res, 200, { data: { list } });
}
