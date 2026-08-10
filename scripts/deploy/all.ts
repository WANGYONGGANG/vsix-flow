// 单函数分发器：Hobby 计划限 12 个 Serverless 函数，
// 所有 /api/:ep 通过 vercel.json rewrites 转发到 /api/all?ep=:ep
import type { VercelRequest, VercelResponse } from '@vercel/node';

import allStocks from '../handlers/all-stocks';
import emNews from '../handlers/em-news';
import emNewsSearch from '../handlers/em-news-search';
import hotStocks from '../handlers/hot-stocks';
import intraday from '../handlers/intraday';
import kline from '../handlers/kline';
import lhb from '../handlers/lhb';
import marketOverview from '../handlers/market-overview';
import marketOverviewDetail from '../handlers/market-overview-detail';
import quote from '../handlers/quote';
import quoteDetail from '../handlers/quote-detail';
import search from '../handlers/search';
import sectorFlowRank from '../handlers/sector-flow-rank';
import sectorLimit from '../handlers/sector-limit';
import sinaBkzj from '../handlers/sina-bkzj';
import stockChanges from '../handlers/stock-changes';
import stockEssential from '../handlers/stock-essential';
import stockFflowDay from '../handlers/stock-fflow-day';
import stockFinance from '../handlers/stock-finance';
import stockFlowRank from '../handlers/stock-flow-rank';
import stockHolder from '../handlers/stock-holder';
import stockNews from '../handlers/stock-news';
import stockNotice from '../handlers/stock-notice';
import stockProfile from '../handlers/stock-profile';
import ztPool from '../handlers/zt-pool';
import aiChat from '../handlers/ai/chat';

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

const routes: Record<string, Handler> = {
  'all-stocks': allStocks,
  'em-news': emNews,
  'em-news-search': emNewsSearch,
  'hot-stocks': hotStocks,
  'intraday': intraday,
  'kline': kline,
  'lhb': lhb,
  'market-overview': marketOverview,
  'market-overview-detail': marketOverviewDetail,
  'quote': quote,
  'quote-detail': quoteDetail,
  'search': search,
  'sector-flow-rank': sectorFlowRank,
  'sector-limit': sectorLimit,
  'sina-bkzj': sinaBkzj,
  'stock-changes': stockChanges,
  'stock-essential': stockEssential,
  'stock-fflow-day': stockFflowDay,
  'stock-finance': stockFinance,
  'stock-flow-rank': stockFlowRank,
  'stock-holder': stockHolder,
  'stock-news': stockNews,
  'stock-notice': stockNotice,
  'stock-profile': stockProfile,
  'zt-pool': ztPool,
  'ai/chat': aiChat,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ep = String((req.query.ep as string) || '');
  const h = routes[ep];
  if (!h) {
    res.status(404).json({ code: 404, msg: `unknown endpoint: ${ep}` });
    return;
  }
  await h(req, res);
}
