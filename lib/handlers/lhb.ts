// 龙虎榜
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions } from '../shared/response';
import { httpGetJson } from '../shared/http';

const COLUMNS = 'SECURITY_CODE,SECURITY_NAME_ABBR,CLOSE_PRICE,CHANGE_RATE,EXPLAIN,EXPLANATION,TRADE_DATE,BILLBOARD_NET_AMT,BUY_SEAT,SELL_SEAT,ACCUM_AMOUNT,BILLBOARD_BUY_AMT,BILLBOARD_SELL_AMT';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const r = await httpGetJson(
    `https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_DAILYBILLBOARD_DETAILSNEW&columns=${COLUMNS}&pageNumber=1&pageSize=30&sortColumns=TRADE_DATE&sortTypes=-1&source=WEB&client=WEB`
  );
  json(res, 200, { data: { list: r?.result?.data || [] } });
}
