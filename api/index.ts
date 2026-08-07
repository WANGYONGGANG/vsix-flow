// ============================================
// StockExt 单一 API 入口 — Vercel Serverless Function
// 所有 /api/* 请求由此文件路由到对应 handler
// ============================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import quote from '../lib/handlers/quote';
import quoteDetail from '../lib/handlers/quote-detail';
import kline from '../lib/handlers/kline';
import intraday from '../lib/handlers/intraday';
import emNews from '../lib/handlers/em-news';
import emNewsSearch from '../lib/handlers/em-news-search';
import marketOverview from '../lib/handlers/market-overview';
import marketOverviewDetail from '../lib/handlers/market-overview-detail';
import hotStocks from '../lib/handlers/hot-stocks';
import lhb from '../lib/handlers/lhb';
import stockChanges from '../lib/handlers/stock-changes';
import sectorLimit from '../lib/handlers/sector-limit';
import sectorFlowRank from '../lib/handlers/sector-flow-rank';
import sinaBkzj from '../lib/handlers/sina-bkzj';
import search from '../lib/handlers/search';
import stockNews from '../lib/handlers/stock-news';
import stockNotice from '../lib/handlers/stock-notice';
import stockFinance from '../lib/handlers/stock-finance';
import stockEssential from '../lib/handlers/stock-essential';
import stockProfile from '../lib/handlers/stock-profile';
import stockFlowRank from '../lib/handlers/stock-flow-rank';
import stockFflowDay from '../lib/handlers/stock-fflow-day';
import stockHolder from '../lib/handlers/stock-holder';
import ztPool from '../lib/handlers/zt-pool';
import aiChat from '../lib/handlers/ai/chat';

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

const ROUTES: Record<string, Handler> = {
  '/api/quote': quote,
  '/api/quote-detail': quoteDetail,
  '/api/kline': kline,
  '/api/intraday': intraday,
  '/api/em-news': emNews,
  '/api/em-news-search': emNewsSearch,
  '/api/market-overview': marketOverview,
  '/api/market-overview-detail': marketOverviewDetail,
  '/api/hot-stocks': hotStocks,
  '/api/lhb': lhb,
  '/api/stock-changes': stockChanges,
  '/api/sector-limit': sectorLimit,
  '/api/sector-flow-rank': sectorFlowRank,
  '/api/sina-bkzj': sinaBkzj,
  '/api/search': search,
  '/api/stock-news': stockNews,
  '/api/stock-notice': stockNotice,
  '/api/stock-finance': stockFinance,
  '/api/stock-essential': stockEssential,
  '/api/stock-profile': stockProfile,
  '/api/stock-flow-rank': stockFlowRank,
  '/api/stock-fflow-day': stockFflowDay,
  '/api/stock-holder': stockHolder,
  '/api/zt-pool': ztPool,
  '/api/ai/chat': aiChat,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.status(204).end('');
    return;
  }

  const pathname = (req.url || '/').split('?')[0];
  const fn = ROUTES[pathname];

  if (!fn) {
    res.status(404).json({ error: 'Not Found', path: pathname });
    return;
  }

  await fn(req, res);
}
