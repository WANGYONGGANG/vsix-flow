// 单函数分发器：Hobby 计划限 12 个 Serverless 函数，
// api/_handlers 下划线开头不会被 Vercel 识别为函数，
// 所有 /api/:ep 通过 vercel.json rewrites 转发到 /api/all?ep=:ep
import type { VercelRequest, VercelResponse } from '@vercel/node';

import allStocks from './_handlers/all-stocks';
import emNews from './_handlers/em-news';
import emNewsSearch from './_handlers/em-news-search';
import hotStocks from './_handlers/hot-stocks';
import intraday from './_handlers/intraday';
import kline from './_handlers/kline';
import lhb from './_handlers/lhb';
import marketOverview from './_handlers/market-overview';
import marketOverviewDetail from './_handlers/market-overview-detail';
import quote from './_handlers/quote';
import quoteDetail from './_handlers/quote-detail';
import search from './_handlers/search';
import sectorFlowRank from './_handlers/sector-flow-rank';
import sectorLimit from './_handlers/sector-limit';
import sinaBkzj from './_handlers/sina-bkzj';
import stockChanges from './_handlers/stock-changes';
import stockEssential from './_handlers/stock-essential';
import stockFflowDay from './_handlers/stock-fflow-day';
import stockFinance from './_handlers/stock-finance';
import stockFlowRank from './_handlers/stock-flow-rank';
import stockHolder from './_handlers/stock-holder';
import stockNews from './_handlers/stock-news';
import stockNotice from './_handlers/stock-notice';
import stockProfile from './_handlers/stock-profile';
import ztPool from './_handlers/zt-pool';
import aiChat from './_handlers/ai/chat';

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
