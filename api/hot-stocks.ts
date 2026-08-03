// 热门股 - 默认一批权重股
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, handleOptions } from '../_shared/response';
import { httpsGetText, tencentTextToDiff } from '../_shared/http';

const HOT = 'sh600519,sz000858,sh601318,sh600036,sz300750,sh688981,sz000001,sh601899,sz002594,sh600900';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  const text = await httpsGetText(`https://qt.gtimg.cn/q=${HOT}`, 'https://finance.qq.com/');
  json(res, 200, { data: { diff: tencentTextToDiff(text) } });
}
