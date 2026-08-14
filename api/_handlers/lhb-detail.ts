// 龙虎榜详情 - 买卖席位明细
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions, getQuery } from './_shared/response';
import { httpGetJson } from './_shared/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  const code = getQuery(req, 'code');
  const date = getQuery(req, 'date');
  if (!code || !date) { json(res, 200, { data: { buyList: [], sellList: [] } }); return; }

  const baseFilter = `(SECURITY_CODE=%22${code}%22)(TRADE_DATE='${date}')`;
  const sortTypes = '-1';

  const [rBuy, rSell] = await Promise.all([
    httpGetJson(`https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_BILLBOARD_DAILYDETAILSBUY&columns=ALL&pageSize=100&pageNumber=1&source=WEB&client=WEB&filter=${baseFilter}&sortTypes=${sortTypes}`),
    httpGetJson(`https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_BILLBOARD_DAILYDETAILSSELL&columns=ALL&pageSize=100&pageNumber=1&source=WEB&client=WEB&filter=${baseFilter}&sortTypes=${sortTypes}`),
  ]);

  json(res, 200, {
    data: {
      buyList: rBuy?.result?.data || [],
      sellList: rSell?.result?.data || [],
    }
  });
}
