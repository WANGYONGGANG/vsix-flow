from __future__ import annotations

from fastapi import APIRouter, Query
from typing import List, Optional

from ..schemas import (
    MarketOverviewData, FundFlowSectorsResponse, FundFlowIntradayResponse,
    KlineData, StockQuote, DragonTigerEntry, LimitUpStock,
    SectorInfo, AlertData, NewsItem
)
from ..services.akshare_service import (
    get_market_overview, get_fund_flow_sectors, get_fund_flow_intraday,
    get_kline, get_quote, get_quotes, get_dragon_tiger, get_limit_up_today,
    get_yesterday_limit_up, get_limit_leader, get_sector_limit,
    get_strong_sector, get_strong_sector_stocks, get_alert_data, get_hot_stocks
)
from ..services.news_service import fetch_em_news
from ..cache import cached_async

router = APIRouter(prefix="/api", tags=["stock"])


@router.get("/market-overview", response_model=MarketOverviewData)
async def market_overview():
    return await cached_async("mo", get_market_overview)


@router.get("/fund-flow/sectors", response_model=FundFlowSectorsResponse)
async def fund_flow_sectors():
    sectors = await cached_async("ffs", get_fund_flow_sectors)
    return FundFlowSectorsResponse(sectors=sectors)


@router.get("/fund-flow/intraday", response_model=FundFlowIntradayResponse)
async def fund_flow_intraday():
    intraday = await cached_async("ffi", get_fund_flow_intraday)
    return FundFlowIntradayResponse(intraday=intraday)


@router.get("/kline")
async def kline(
    code: str = Query(..., description="股票代码"),
    period: str = Query("day", description="周期:5min,15min,30min,60min,day,week,month"),
):
    return await cached_async("kl", get_kline, code=code, period=period)


@router.get("/quote")
async def quote(
    code: Optional[str] = Query(None, description="单只股票代码（与 codes 二选一）"),
    codes: Optional[str] = Query(None, description="批量股票代码，逗号分隔"),
):
    code_list: List[str] = []
    if codes:
        code_list = [c.strip() for c in codes.split(",") if c.strip()]
    elif code:
        code_list = [code.strip()]
    if not code_list:
        return {"data": []}
    # 为避免多次缓存失效，codes 参数单独缓存 key
    result = await cached_async("qs", get_quotes, codes=",".join(code_list))
    return {"data": result}


@router.get("/dragon-tiger", response_model=List[DragonTigerEntry])
async def dragon_tiger(date: Optional[str] = Query(None, description="YYYYMMDD")):
    return await cached_async("dt", get_dragon_tiger, date=date or "")


@router.get("/limit-up-today", response_model=List[LimitUpStock])
async def limit_up_today(date: Optional[str] = Query(None, description="YYYYMMDD")):
    return await cached_async("lut", get_limit_up_today, date=date or "")


@router.get("/yesterday-limit", response_model=List[LimitUpStock])
async def yesterday_limit():
    return await cached_async("yl", get_yesterday_limit_up)


@router.get("/limit-leader", response_model=List[LimitUpStock])
async def limit_leader():
    return await cached_async("ll", get_limit_leader)


@router.get("/sector-limit", response_model=List[SectorInfo])
async def sector_limit():
    return await cached_async("sl", get_sector_limit)


@router.get("/strong-sector", response_model=List[SectorInfo])
async def strong_sector():
    return await cached_async("ss", get_strong_sector)


@router.get("/strong-sector/{code}", response_model=List[StockQuote])
async def strong_sector_stocks(code: str):
    return await cached_async("sss", get_strong_sector_stocks, code=code)


@router.get("/alert", response_model=AlertData)
async def alert():
    return await cached_async("al", get_alert_data)


@router.get("/hot-stocks", response_model=List[StockQuote])
async def hot_stocks():
    return await cached_async("hs", get_hot_stocks)


@router.get("/em-news")
async def em_news(
    page_size: int = Query(50, ge=1, le=200),
    page: int = Query(1, ge=1),
):
    result = await cached_async("news", fetch_em_news, page_size=page_size, page=page)
    return {"news": result}
