from __future__ import annotations

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


# ============ 股票行情 ============
class StockQuote(BaseModel):
    code: str
    name: str
    price: float = 0
    changeRate: float = 0
    changeAmount: float = 0
    volume: float = 0
    amount: float = 0
    high: float = 0
    low: float = 0
    open: float = 0
    preClose: float = 0
    turnoverRate: float = 0
    pe: float = 0
    pb: float = 0
    marketCap: float = 0
    totalShares: float = 0
    amplitude: float = 0


# ============ 板块信息 ============
class SectorInfo(BaseModel):
    code: str
    name: str
    changeRate: float = 0
    changeAmount: float = 0
    price: float = 0
    volume: float = 0
    amount: float = 0
    upCount: int = 0
    downCount: int = 0
    type: str = "concept"
    netInflow: float = 0
    mainNetInflow: float = 0
    turnoverRate: float = 0


# ============ 涨停股票 ============
class LimitUpStock(BaseModel):
    code: str
    name: str
    price: float = 0
    changeRate: float = 0
    amount: float = 0
    volume: float = 0
    limitUpDays: int = 0
    limitUpTime: str = ""
    limitUpType: str = ""
    sector: str = ""
    firstLimitUp: str = ""
    continuousLimitUp: bool = False
    brokenBoard: bool = False
    turnoverRate: float = 0
    pe: float = 0
    pb: float = 0
    marketCap: float = 0
    amplitude: float = 0
    reason: str = ""


# ============ 龙虎榜 ============
class DragonTigerSeat(BaseModel):
    seatName: str
    type: str = ""
    tag: str = ""
    buyAmt: float = 0
    sellAmt: float = 0
    netAmt: float = 0


class DragonTigerEntry(BaseModel):
    code: str
    name: str
    closePrice: float = 0
    changeRate: float = 0
    netBuyAmt: float = 0
    buyTimes: int = 0
    sellTimes: int = 0
    reason: str = ""
    tradeDate: str = ""
    seats: List[DragonTigerSeat] = Field(default_factory=list)


# ============ 北向资金 ============
class NorthFlow(BaseModel):
    sh: float = 0
    sz: float = 0
    total: float = 0


# ============ 涨停统计 ============
class LimitUpDetails(BaseModel):
    firstBoard: int = 0
    continuous2: int = 0
    continuous3Plus: int = 0
    broken: int = 0


# ============ 市场概况 ============
class MarketOverviewData(BaseModel):
    indices: List[StockQuote] = Field(default_factory=list)
    limitUpCount: int = 0
    limitDownCount: int = 0
    upCount: int = 0
    downCount: int = 0
    flatCount: int = 0
    totalCount: int = 0
    northFlow: NorthFlow = Field(default_factory=NorthFlow)
    limitUpDetails: LimitUpDetails = Field(default_factory=LimitUpDetails)


# ============ 异动 ============
class AlertItem(BaseModel):
    type: str
    text: str
    time: str
    code: Optional[str] = None


class IndexQuote(BaseModel):
    code: str
    name: str
    price: float = 0
    change: float = 0
    changeRate: float = 0
    volume: float = 0
    amount: float = 0


class AlertData(BaseModel):
    indexQuotes: List[IndexQuote] = Field(default_factory=list)
    indexAlerts: List[AlertItem] = Field(default_factory=list)
    stockAlerts: List[AlertItem] = Field(default_factory=list)


# ============ 新闻 ============
class NewsItem(BaseModel):
    id: Any
    title: str
    content: str
    time: str
    source: str = ""


# ============ K线 ============
class KlineData(BaseModel):
    time: str
    open: float = 0
    high: float = 0
    low: float = 0
    close: float = 0
    volume: float = 0
    amount: float = 0
    turnover: float = 0
    ma5: Optional[float] = None
    ma10: Optional[float] = None
    ma20: Optional[float] = None
    ma60: Optional[float] = None


# ============ 板块资金流向 ============
class FundFlowSector(BaseModel):
    id: str
    name: str
    netInflow: float = 0
    changeRate: float = 0
    changeAmount: float = 0
    price: float = 0
    amount: float = 0


class FundFlowSectorsResponse(BaseModel):
    sectors: List[FundFlowSector] = Field(default_factory=list)


# ============ 分时点位 ============
class IntradayPoint(BaseModel):
    time: str
    sectors: Dict[str, float] = Field(default_factory=dict)


class FundFlowIntradayResponse(BaseModel):
    intraday: List[IntradayPoint] = Field(default_factory=list)
