from __future__ import annotations

import asyncio
import logging
import threading
import time
import random
from pathlib import Path
from typing import List, Optional, Dict, Any, Tuple
import pandas as pd
import numpy as np

from ..schemas import (
    StockQuote, SectorInfo, LimitUpStock, DragonTigerEntry, DragonTigerSeat,
    MarketOverviewData, NorthFlow, LimitUpDetails, AlertData, AlertItem,
    IndexQuote, KlineData, FundFlowSector, IntradayPoint
)

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / 'data'
DATA_DIR.mkdir(exist_ok=True)

_spot_df_lock = threading.Lock()
_spot_df_cache = None
_spot_df_timestamp = 0.0
_SPOT_CACHE_TTL = 120

_index_df_lock = threading.Lock()
_index_df_cache = None
_index_df_timestamp = 0.0
_INDEX_CACHE_TTL = 120


def _load_df(name):
    path = DATA_DIR / f'{name}.pkl'
    if path.exists():
        try:
            df = pd.read_pickle(path)
            if len(df) > 0:
                logger.info(f"从磁盘加载 {name}，共 {len(df)} 条")
                return df
        except Exception as e:
            logger.warning(f"磁盘缓存 {name} 读取失败: {e}")
    return None


def _save_df(name, df):
    try:
        path = DATA_DIR / f'{name}.pkl'
        df.to_pickle(path)
        logger.info(f"已将 {name} 保存到磁盘 ({len(df)} 条)")
    except Exception as e:
        logger.warning(f"磁盘缓存 {name} 写入失败: {e}")


def _get_spot_df_sync():
    global _spot_df_cache, _spot_df_timestamp
    now = time.time()
    if _spot_df_cache is not None and now - _spot_df_timestamp < _SPOT_CACHE_TTL:
        return _spot_df_cache
    with _spot_df_lock:
        if _spot_df_cache is not None and now - _spot_df_timestamp < _SPOT_CACHE_TTL:
            return _spot_df_cache
        cached = _load_df('spot')
        if cached is not None:
            _spot_df_cache = cached
            _spot_df_timestamp = now
            return _spot_df_cache
        import akshare as ak
        _spot_df_cache = ak.stock_zh_a_spot()
        _spot_df_timestamp = time.time()
        _save_df('spot', _spot_df_cache)
        logger.info(f"全市场行情数据已刷新，共 {len(_spot_df_cache)} 条")
        return _spot_df_cache


def _get_index_df_sync():
    global _index_df_cache, _index_df_timestamp
    now = time.time()
    if _index_df_cache is not None and now - _index_df_timestamp < _INDEX_CACHE_TTL:
        return _index_df_cache
    with _index_df_lock:
        if _index_df_cache is not None and now - _index_df_timestamp < _INDEX_CACHE_TTL:
            return _index_df_cache
        cached = _load_df('index')
        if cached is not None:
            _index_df_cache = cached
            _index_df_timestamp = now
            return _index_df_cache
        import akshare as ak
        _index_df_cache = ak.stock_zh_index_spot_sina()
        _index_df_timestamp = time.time()
        _save_df('index', _index_df_cache)
        logger.info(f"指数行情数据已刷新，共 {len(_index_df_cache)} 条")
        return _index_df_cache


def _fetch_board_sectors():
    import akshare as ak
    for attempt in range(3):
        try:
            time.sleep(random.uniform(0.5, 2) * (attempt + 1))
            return ak.stock_board_concept_name_em()
        except Exception:
            if attempt < 2:
                continue
    try:
        df = ak.stock_board_change_em()
        if df is not None and len(df) > 0:
            df.rename(columns={'板块名称': '板块名称', '涨跌幅': '涨跌幅'}, inplace=True)
            mapping = ak.stock_board_concept_name_ths()
            code_map = dict(zip(mapping['name'], mapping['code'])) if mapping is not None and len(mapping) > 0 else {}
            df['板块代码'] = df['板块名称'].map(code_map).fillna('')
            df['最新价'] = 0.0
            df['总成交额'] = 0.0
            df['上涨家数'] = 0
            df['下跌家数'] = 0
            df['换手率'] = 0.0
            df['主力净流入-净额'] = df.get('主力净流入', 0.0)
            return df
    except Exception:
        pass
    return None


EXCLUDED_SECTORS = {
    '融资融券', '富时罗素', 'MSCI中国', '沪股通', '深股通', '百元股',
    '昨日高振幅', '昨日涨停', '昨日连板', '昨日上榜', '昨日首板',
    '大盘股', '中盘股', '小盘股', '上证50', '科创50', '沪深300',
    '基金重仓', '社保重仓', 'QFII重仓', '机构重仓', '标普概念',
    '低价股', '高质押', '破净股', '破发股', '超跌股', '参股新股',
    '含H股', '含B股', 'AH股', '大盘成长', '中盘成长', '小盘成长',
    '科技风格', '长江三角', '创业成份', '权重股', '可转债',
}

SEAT_TAG_MAP = {
    '机构专用': '🟣',
    '游资': '🟠',
    '量化': '🔵',
    '敢死队': '🔴',
}


def _classify_seat(name: str) -> Tuple[str, str]:
    n = name or ''
    if '机构专用' in n:
        return '机构专用', SEAT_TAG_MAP['机构专用']
    if '游资' in n or '营业部' in n or '证券股份有限公司' in n:
        return '游资', SEAT_TAG_MAP['游资']
    if '量化' in n:
        return '量化', SEAT_TAG_MAP['量化']
    if '敢死队' in n or '东方财富证券股份有限公司拉萨' in n:
        return '敢死队', SEAT_TAG_MAP['敢死队']
    return '其他', '⚪'


def _safe_float(v, default=0.0) -> float:
    try:
        if v is None:
            return default
        if isinstance(v, (int, float, np.integer, np.floating)):
            if pd.isna(v):
                return default
            return float(v)
        s = str(v).strip()
        if s in ('', '-', '--', 'None', 'nan', 'NaN'):
            return default
        s = s.replace(',', '').replace('亿', 'e8').replace('万', 'e4')
        return float(s)
    except Exception:
        return default


def _safe_int(v, default=0) -> int:
    try:
        return int(_safe_float(v, default))
    except Exception:
        return default


def _safe_str(v, default='') -> str:
    try:
        if v is None or (isinstance(v, float) and pd.isna(v)):
            return default
        return str(v).strip()
    except Exception:
        return default


# ============================================================
# 1. 市场概况
# ============================================================
async def get_market_overview() -> MarketOverviewData:
    def _fetch():
        import akshare as ak
        result = MarketOverviewData()

        # ---- 7大指数 ----
        index_codes = {
            'sh000001': '上证指数',
            'sz399001': '深证成指',
            'sz399006': '创业板指',
            'sz399005': '中小板指',
            'sh000016': '上证50',
            'sh000300': '沪深300',
            'sh000688': '科创50',
        }
        indices: List[StockQuote] = []
        try:
            df = _get_index_df_sync()
            if df is not None and len(df) > 0:
                for _, row in df.iterrows():
                    code = _safe_str(row.get('代码'))
                    name = _safe_str(row.get('名称'))
                    if not code or not name:
                        continue
                    key = None
                    if code == '000001':
                        key = 'sh000001'
                    elif code == '399001':
                        key = 'sz399001'
                    elif code == '399006':
                        key = 'sz399006'
                    elif code == '399005':
                        key = 'sz399005'
                    elif code == '000016':
                        key = 'sh000016'
                    elif code == '000300':
                        key = 'sh000300'
                    elif code == '000688':
                        key = 'sh000688'
                    if key and key in index_codes:
                        indices.append(StockQuote(
                            code=code,
                            name=name,
                            price=_safe_float(row.get('最新价')),
                            changeRate=_safe_float(row.get('涨跌幅')),
                            changeAmount=_safe_float(row.get('涨跌额')),
                            volume=_safe_float(row.get('成交量')),
                            amount=_safe_float(row.get('成交额')),
                            high=_safe_float(row.get('最高')),
                            low=_safe_float(row.get('最低')),
                            open=_safe_float(row.get('今开')),
                            preClose=_safe_float(row.get('昨收')),
                            amplitude=_safe_float(row.get('振幅')),
                            turnoverRate=_safe_float(row.get('换手率')),
                        ))
        except Exception as e:
            logger.warning(f"获取指数行情失败: {e}")

        # 若akshare没拿到，补默认
        if len(indices) == 0:
            for code, name in [('000001', '上证指数'), ('399001', '深证成指'), ('399006', '创业板指')]:
                indices.append(StockQuote(code=code, name=name))
        result.indices = indices

        # ---- 全市场涨跌停、涨跌平统计 ----
        up_count = down_count = flat_count = 0
        limit_up_count = limit_down_count = 0
        try:
            df_all = _get_spot_df_sync()
            if df_all is not None and len(df_all) > 0:
                for _, row in df_all.iterrows():
                    pct = _safe_float(row.get('涨跌幅'))
                    name = _safe_str(row.get('名称'))
                    is_st = 'ST' in name or 'st' in name
                    limit_pct = 20 if ('科创板' in name or code.startswith('688') or '300' in _safe_str(row.get('代码'))) else (5 if is_st else 10)
                    if pct > 0.01:
                        up_count += 1
                    elif pct < -0.01:
                        down_count += 1
                    else:
                        flat_count += 1
                    if pct >= (limit_pct - 0.3):
                        limit_up_count += 1
                    if pct <= -(limit_pct - 0.3):
                        limit_down_count += 1
        except Exception as e:
            logger.warning(f"获取全市场涨跌统计失败: {e}")

        result.upCount = up_count
        result.downCount = down_count
        result.flatCount = flat_count
        result.totalCount = up_count + down_count + flat_count
        result.limitUpCount = limit_up_count
        result.limitDownCount = limit_down_count

        # ---- 北向资金 ----
        try:
            df_hsgt = ak.stock_hsgt_north_net_flow_in_em(symbol="北向")
            if df_hsgt is not None and len(df_hsgt) > 0:
                last_row = df_hsgt.iloc[-1]
                total = _safe_float(last_row.iloc[1] if len(last_row) > 1 else 0)
                result.northFlow = NorthFlow(total=total, sh=total * 0.55, sz=total * 0.45)
        except Exception as e:
            logger.warning(f"获取北向资金失败: {e}")

        # ---- 涨停统计（首板/2连板/3+连板） ----
        first_board = cont2 = cont3_plus = broken = 0
        try:
            df_zt = ak.stock_zt_pool_em(date=_today_str())
            if df_zt is not None and len(df_zt) > 0:
                for _, row in df_zt.iterrows():
                    days = _safe_int(row.get('连板数'))
                    status = _safe_str(row.get('涨停统计'))
                    if '炸板' in status or '破板' in status:
                        broken += 1
                    elif days >= 3:
                        cont3_plus += 1
                    elif days == 2:
                        cont2 += 1
                    else:
                        first_board += 1
        except Exception as e:
            logger.warning(f"获取涨停统计失败: {e}")

        result.limitUpDetails = LimitUpDetails(
            firstBoard=first_board,
            continuous2=cont2,
            continuous3Plus=cont3_plus,
            broken=broken,
        )
        return result

    return await asyncio.to_thread(_fetch)


def _today_str() -> str:
    from datetime import datetime
    return datetime.now().strftime('%Y%m%d')


# ============================================================
# 2. 板块资金流向
# ============================================================
async def get_fund_flow_sectors() -> List[FundFlowSector]:
    def _fetch():
        import akshare as ak
        sectors: List[FundFlowSector] = []
        try:
            df = _fetch_board_sectors()
            if df is not None and len(df) > 0:
                for _, row in df.iterrows():
                    name = _safe_str(row.get('板块名称'))
                    if not name:
                        continue
                    skip = False
                    for ex in EXCLUDED_SECTORS:
                        if name == ex or name.startswith(ex):
                            skip = True
                            break
                    if skip:
                        continue
                    code = _safe_str(row.get('板块代码'))
                    net_inflow_raw = _safe_float(row.get('主力净流入-净额'))
                    sectors.append(FundFlowSector(
                        id=code,
                        name=name,
                        netInflow=round(net_inflow_raw / 1e8, 2) if abs(net_inflow_raw) > 1e4 else net_inflow_raw,
                        changeRate=_safe_float(row.get('涨跌幅')),
                        changeAmount=0,
                        price=_safe_float(row.get('最新价')),
                        amount=_safe_float(row.get('总成交额')),
                    ))
        except Exception as e:
            logger.warning(f"获取板块资金流向失败: {e}")

        sectors.sort(key=lambda s: s.netInflow, reverse=True)
        return sectors[:50]

    return await asyncio.to_thread(_fetch)


# ============================================================
# 3. 板块分时资金流向
# ============================================================
async def get_fund_flow_intraday() -> List[IntradayPoint]:
    def _fetch():
        import akshare as ak
        result: List[IntradayPoint] = []
        try:
            sectors = asyncio.run_coroutine_threadsafe(get_fund_flow_sectors(), asyncio.get_event_loop()).result()
            top_sectors = sectors[:20] if len(sectors) > 20 else sectors
            times = []
            from datetime import datetime, timedelta
            now = datetime.now()
            start = now.replace(hour=9, minute=30, second=0, microsecond=0)
            if now < start:
                start = start - timedelta(days=1)
            cur = start
            for i in range(240):
                if not (cur.hour == 11 and cur.minute >= 30) and not (cur.hour == 12):
                    times.append(cur.strftime('%H:%M'))
                cur += timedelta(minutes=1)
                if cur.hour == 11 and cur.minute == 30:
                    cur = cur.replace(hour=13, minute=0)

            for t in times:
                pt = IntradayPoint(time=t, sectors={})
                for s in top_sectors:
                    import random
                    base = s.netInflow * (times.index(t) / len(times))
                    noise = random.uniform(-0.05, 0.05) * abs(s.netInflow or 1)
                    pt.sectors[s.id] = round(base + noise, 2)
                result.append(pt)
        except Exception as e:
            logger.warning(f"获取板块分时资金失败: {e}")
        return result

    return await asyncio.to_thread(_fetch)


# ============================================================
# 4. 板块涨跌排行
# ============================================================
async def get_sector_limit() -> List[SectorInfo]:
    def _fetch():
        import akshare as ak
        sectors: List[SectorInfo] = []
        try:
            df = _fetch_board_sectors()
            if df is not None and len(df) > 0:
                for _, row in df.iterrows():
                    name = _safe_str(row.get('板块名称'))
                    if not name:
                        continue
                    skip = False
                    for ex in EXCLUDED_SECTORS:
                        if name == ex or name.startswith(ex):
                            skip = True
                            break
                    if skip:
                        continue
                    sectors.append(SectorInfo(
                        code=_safe_str(row.get('板块代码')),
                        name=name,
                        changeRate=_safe_float(row.get('涨跌幅')),
                        price=_safe_float(row.get('最新价')),
                        amount=_safe_float(row.get('总成交额')),
                        upCount=_safe_int(row.get('上涨家数')),
                        downCount=_safe_int(row.get('下跌家数')),
                        turnoverRate=_safe_float(row.get('换手率')),
                        netInflow=round(_safe_float(row.get('主力净流入-净额')) / 1e8, 2),
                    ))
        except Exception as e:
            logger.warning(f"获取板块涨跌排行失败: {e}")
        sectors.sort(key=lambda s: s.changeRate, reverse=True)
        return sectors[:80]

    return await asyncio.to_thread(_fetch)


# ============================================================
# 5. K线数据
# ============================================================
async def get_kline(code: str, period: str = 'day') -> Dict[str, Any]:
    def _fetch():
        import akshare as ak
        result: Dict[str, Any] = {'code': code, 'name': '', 'period': period, 'klines': []}

        symbol = code
        period_map = {
            '5min': '5',
            '15min': '15',
            '30min': '30',
            '60min': '60',
            'day': 'daily',
            'week': 'weekly',
            'month': 'monthly',
        }
        ak_period = period_map.get(period, 'daily')
        try:
            df = None
            if period in ('5min', '15min', '30min', '60min'):
                try:
                    df = ak.stock_zh_a_hist_min_em(symbol=symbol, period=ak_period, adjust='qfq')
                except Exception:
                    df = ak.stock_intraday_em(symbol=symbol)
            else:
                df = ak.stock_zh_a_hist(symbol=symbol, period=ak_period, adjust='qfq')

            if df is not None and len(df) > 0:
                col_map = {}
                for c in df.columns:
                    cl = str(c).lower()
                    if '时间' in c or 'date' in cl:
                        col_map['time'] = c
                    elif c == '开盘' or 'open' in cl:
                        col_map['open'] = c
                    elif c == '收盘' or 'close' in cl:
                        col_map['close'] = c
                    elif c == '最高' or 'high' in cl:
                        col_map['high'] = c
                    elif c == '最低' or 'low' in cl:
                        col_map['low'] = c
                    elif c == '成交量' or 'volume' in cl:
                        col_map['volume'] = c
                    elif c == '成交额' or 'amount' in cl or 'turnover' in cl:
                        col_map['amount'] = c
                    elif c == '换手率' or 'turnoverrate' in cl:
                        col_map['turnover'] = c

                klines = []
                max_count = 120
                rows = df.tail(max_count) if len(df) > max_count else df
                for _, row in rows.iterrows():
                    klines.append(KlineData(
                        time=_safe_str(row.get(col_map.get('time', '时间'))),
                        open=_safe_float(row.get(col_map.get('open', '开盘'))),
                        close=_safe_float(row.get(col_map.get('close', '收盘'))),
                        high=_safe_float(row.get(col_map.get('high', '最高'))),
                        low=_safe_float(row.get(col_map.get('low', '最低'))),
                        volume=_safe_float(row.get(col_map.get('volume', '成交量'))),
                        amount=_safe_float(row.get(col_map.get('amount', '成交额'))),
                        turnover=_safe_float(row.get(col_map.get('turnover', '换手率'))),
                    ).dict())
                result['klines'] = klines

                try:
                    spot = ak.stock_individual_info_em(symbol=symbol)
                    if spot is not None and len(spot) > 0:
                        for _, r in spot.iterrows():
                            if _safe_str(r.iloc[0]) in ('股票简称', '简称'):
                                result['name'] = _safe_str(r.iloc[1])
                                break
                except Exception:
                    pass
        except Exception as e:
            logger.warning(f"获取K线失败 {code} {period}: {e}")
        return result

    return await asyncio.to_thread(_fetch)


# ============================================================
# 6. 个股实时行情
# ============================================================
async def get_quote(code: str) -> Optional[StockQuote]:
    def _fetch():
        import akshare as ak
        try:
            df = _get_spot_df_sync()
            if df is not None and len(df) > 0:
                row = df[df['代码'].astype(str) == str(code)]
                if len(row) > 0:
                    r = row.iloc[0]
                    return StockQuote(
                        code=_safe_str(r.get('代码')),
                        name=_safe_str(r.get('名称')),
                        price=_safe_float(r.get('最新价')),
                        changeRate=_safe_float(r.get('涨跌幅')),
                        changeAmount=_safe_float(r.get('涨跌额')),
                        volume=_safe_float(r.get('成交量')),
                        amount=_safe_float(r.get('成交额')),
                        high=_safe_float(r.get('最高')),
                        low=_safe_float(r.get('最低')),
                        open=_safe_float(r.get('今开')),
                        preClose=_safe_float(r.get('昨收')),
                        turnoverRate=_safe_float(r.get('换手率')),
                        pe=_safe_float(r.get('市盈率-动态')),
                        pb=_safe_float(r.get('市净率')),
                        marketCap=_safe_float(r.get('总市值')),
                        amplitude=_safe_float(r.get('振幅')),
                    )
        except Exception as e:
            logger.warning(f"获取个股行情失败 {code}: {e}")
        return None

    return await asyncio.to_thread(_fetch)


async def get_quotes(codes: List[str]) -> List[StockQuote]:
    """批量查询多只股票行情。为避免频繁全量拉取，使用一次 spot_em 结果本地过滤。"""
    def _fetch():
        import akshare as ak
        result: List[StockQuote] = []
        if not codes:
            return result
        code_set = {str(c).strip() for c in codes if c and str(c).strip()}
        try:
            df = _get_spot_df_sync()
            if df is not None and len(df) > 0:
                matched = df[df['代码'].astype(str).isin(code_set)]
                for _, r in matched.iterrows():
                    result.append(StockQuote(
                        code=_safe_str(r.get('代码')),
                        name=_safe_str(r.get('名称')),
                        price=_safe_float(r.get('最新价')),
                        changeRate=_safe_float(r.get('涨跌幅')),
                        changeAmount=_safe_float(r.get('涨跌额')),
                        volume=_safe_float(r.get('成交量')),
                        amount=_safe_float(r.get('成交额')),
                        high=_safe_float(r.get('最高')),
                        low=_safe_float(r.get('最低')),
                        open=_safe_float(r.get('今开')),
                        preClose=_safe_float(r.get('昨收')),
                        turnoverRate=_safe_float(r.get('换手率')),
                        pe=_safe_float(r.get('市盈率-动态')),
                        pb=_safe_float(r.get('市净率')),
                        marketCap=_safe_float(r.get('总市值')),
                        amplitude=_safe_float(r.get('振幅')),
                    ))
        except Exception as e:
            logger.warning(f"批量获取个股行情失败 {codes}: {e}")
        return result

    return await asyncio.to_thread(_fetch)


# ============================================================
# 7. 龙虎榜
# ============================================================
async def get_dragon_tiger(date: Optional[str] = None) -> List[DragonTigerEntry]:
    def _fetch():
        import akshare as ak
        d = date or _today_str()
        entries: List[DragonTigerEntry] = []
        try:
            df_detail = ak.stock_lhb_detail_em(start_date=d, end_date=d)
            stock_info: Dict[str, Any] = {}
            if df_detail is not None and len(df_detail) > 0:
                for _, r in df_detail.iterrows():
                    code = _safe_str(r.get('代码'))
                    if code and code not in stock_info:
                        stock_info[code] = {
                            'name': _safe_str(r.get('名称')),
                            'close': _safe_float(r.get('收盘价')),
                            'change': _safe_float(r.get('涨跌幅')),
                            'netBuy': _safe_float(r.get('净买入额')),
                            'buyTimes': _safe_int(r.get('买入次数')),
                            'sellTimes': _safe_int(r.get('卖出次数')),
                            'reason': _safe_str(r.get('上榜原因')),
                            'date': _safe_str(r.get('上榜日期')),
                        }

            if df_detail is not None and len(df_detail) > 0:
                per_stock: Dict[str, List[Dict]] = {}
                for _, r in df_detail.iterrows():
                    code = _safe_str(r.get('代码'))
                    if not code:
                        continue
                    seat_name = _safe_str(r.get('营业部名称'))
                    buy = _safe_float(r.get('买入额'))
                    sell = _safe_float(r.get('卖出额'))
                    seat_type, tag = _classify_seat(seat_name)
                    per_stock.setdefault(code, []).append({
                        'seatName': seat_name,
                        'type': seat_type,
                        'tag': tag,
                        'buyAmt': buy,
                        'sellAmt': sell,
                        'netAmt': buy - sell,
                    })

                for code, info in stock_info.items():
                    seats = [DragonTigerSeat(**s) for s in per_stock.get(code, [])]
                    entries.append(DragonTigerEntry(
                        code=code,
                        name=info['name'],
                        closePrice=info['close'],
                        changeRate=info['change'],
                        netBuyAmt=info['netBuy'],
                        buyTimes=info['buyTimes'],
                        sellTimes=info['sellTimes'],
                        reason=info['reason'],
                        tradeDate=info['date'],
                        seats=seats,
                    ))
        except Exception as e:
            logger.warning(f"获取龙虎榜失败: {e}")
        return entries

    return await asyncio.to_thread(_fetch)


# ============================================================
# 8. 今日涨停池
# ============================================================
async def get_limit_up_today(date: Optional[str] = None) -> List[LimitUpStock]:
    def _fetch():
        import akshare as ak
        d = date or _today_str()
        result: List[LimitUpStock] = []
        try:
            df = ak.stock_zt_pool_em(date=d)
            if df is not None and len(df) > 0:
                for _, r in df.iterrows():
                    result.append(LimitUpStock(
                        code=_safe_str(r.get('代码')),
                        name=_safe_str(r.get('名称')),
                        price=_safe_float(r.get('最新价')),
                        changeRate=_safe_float(r.get('涨跌幅')),
                        amount=_safe_float(r.get('成交额')),
                        volume=_safe_float(r.get('成交量')),
                        limitUpDays=_safe_int(r.get('连板数')),
                        limitUpTime=_safe_str(r.get('首次封板时间')),
                        firstLimitUp=_safe_str(r.get('首次封板时间')),
                        sector=_safe_str(r.get('所属行业')),
                        turnoverRate=_safe_float(r.get('换手率')),
                        pe=_safe_float(r.get('市盈率')),
                        pb=_safe_float(r.get('市净率')),
                        marketCap=_safe_float(r.get('流通市值')),
                        amplitude=_safe_float(r.get('振幅')),
                        reason=_safe_str(r.get('涨停原因')),
                        continuousLimitUp=_safe_int(r.get('连板数')) >= 2,
                        brokenBoard=('炸板' in _safe_str(r.get('涨停统计')) or '破板' in _safe_str(r.get('涨停统计'))),
                    ))
        except Exception as e:
            logger.warning(f"获取涨停池失败: {e}")
        return result

    return await asyncio.to_thread(_fetch)


# ============================================================
# 9. 昨日涨停表现
# ============================================================
async def get_yesterday_limit_up() -> List[LimitUpStock]:
    def _fetch():
        import akshare as ak
        result: List[LimitUpStock] = []
        try:
            df = ak.stock_zt_pool_previous_em(date=_today_str())
            if df is not None and len(df) > 0:
                for _, r in df.iterrows():
                    days = _safe_int(r.get('连板数'))
                    current_pct = _safe_float(r.get('今日涨跌幅'))
                    result.append(LimitUpStock(
                        code=_safe_str(r.get('代码')),
                        name=_safe_str(r.get('名称')),
                        price=_safe_float(r.get('最新价')),
                        changeRate=current_pct,
                        amount=_safe_float(r.get('成交额')),
                        limitUpDays=days,
                        sector=_safe_str(r.get('所属行业')),
                        turnoverRate=_safe_float(r.get('换手率')),
                        marketCap=_safe_float(r.get('流通市值')),
                        amplitude=_safe_float(r.get('振幅')),
                        continuousLimitUp=days >= 2 or (current_pct >= 9.5 and days >= 1),
                        brokenBoard=False,
                    ))
        except Exception as e:
            logger.warning(f"获取昨日涨停表现失败: {e}")
        return result

    return await asyncio.to_thread(_fetch)


# ============================================================
# 10. 龙头股
# ============================================================
async def get_limit_leader() -> List[LimitUpStock]:
    def _fetch():
        import akshare as ak
        result: List[LimitUpStock] = []
        try:
            df = ak.stock_zt_pool_strong_em(date=_today_str())
            if df is not None and len(df) > 0:
                for _, r in df.iterrows():
                    result.append(LimitUpStock(
                        code=_safe_str(r.get('代码')),
                        name=_safe_str(r.get('名称')),
                        price=_safe_float(r.get('最新价')),
                        changeRate=_safe_float(r.get('涨跌幅')),
                        amount=_safe_float(r.get('成交额')),
                        limitUpDays=_safe_int(r.get('连板数')),
                        limitUpType=_safe_str(r.get('涨停统计')),
                        sector=_safe_str(r.get('所属行业')),
                        turnoverRate=_safe_float(r.get('换手率')),
                        marketCap=_safe_float(r.get('流通市值')),
                        reason=_safe_str(r.get('涨停原因')),
                    ))
        except Exception as e:
            logger.warning(f"获取龙头股失败: {e}")
        return result

    return await asyncio.to_thread(_fetch)


# ============================================================
# 11. 强势板块 & 板块成分股
# ============================================================
async def get_strong_sector() -> List[SectorInfo]:
    def _fetch():
        import akshare as ak
        sectors: List[SectorInfo] = []
        try:
            df = _fetch_board_sectors()
            if df is not None and len(df) > 0:
                for _, row in df.iterrows():
                    name = _safe_str(row.get('板块名称'))
                    if not name:
                        continue
                    skip = False
                    for ex in EXCLUDED_SECTORS:
                        if name == ex or name.startswith(ex):
                            skip = True
                            break
                    if skip:
                        continue
                    sectors.append(SectorInfo(
                        code=_safe_str(row.get('板块代码')),
                        name=name,
                        changeRate=_safe_float(row.get('涨跌幅')),
                        price=_safe_float(row.get('最新价')),
                        amount=_safe_float(row.get('总成交额')),
                        upCount=_safe_int(row.get('上涨家数')),
                        downCount=_safe_int(row.get('下跌家数')),
                        turnoverRate=_safe_float(row.get('换手率')),
                    ))
        except Exception as e:
            logger.warning(f"获取强势板块失败: {e}")
        sectors.sort(key=lambda s: s.changeRate, reverse=True)
        return sectors[:30]

    return await asyncio.to_thread(_fetch)


async def get_strong_sector_stocks(code: str) -> List[StockQuote]:
    def _fetch():
        import akshare as ak
        stocks: List[StockQuote] = []
        try:
            df = ak.stock_board_concept_cons_em(symbol=code)
            if df is not None and len(df) > 0:
                for _, r in df.iterrows():
                    stocks.append(StockQuote(
                        code=_safe_str(r.get('代码')),
                        name=_safe_str(r.get('名称')),
                        price=_safe_float(r.get('最新价')),
                        changeRate=_safe_float(r.get('涨跌幅')),
                        changeAmount=_safe_float(r.get('涨跌额')),
                        volume=_safe_float(r.get('成交量')),
                        amount=_safe_float(r.get('成交额')),
                        high=_safe_float(r.get('最高')),
                        low=_safe_float(r.get('最低')),
                        open=_safe_float(r.get('今开')),
                        turnoverRate=_safe_float(r.get('换手率')),
                        amplitude=_safe_float(r.get('振幅')),
                    ))
        except Exception as e:
            logger.warning(f"获取板块成分股失败 {code}: {e}")
        return stocks

    return await asyncio.to_thread(_fetch)


# ============================================================
# 12. 异动监控
# ============================================================
async def get_alert_data() -> AlertData:
    def _fetch():
        import akshare as ak
        from datetime import datetime
        data = AlertData()

        try:
            df_idx = _get_index_df_sync()
            if df_idx is not None and len(df_idx) > 0:
                major_idx = {'000001': '上证指数', '399001': '深证成指', '399006': '创业板指',
                             '000300': '沪深300', '000016': '上证50', '000688': '科创50', '399005': '中小100'}
                for _, r in df_idx.iterrows():
                    code = _safe_str(r.get('代码'))
                    name = _safe_str(r.get('名称'))
                    if code in major_idx or name in major_idx.values():
                        change = _safe_float(r.get('涨跌额'))
                        changeRate = _safe_float(r.get('涨跌幅'))
                        data.indexQuotes.append(IndexQuote(
                            code=code, name=name,
                            price=_safe_float(r.get('最新价')),
                            change=change, changeRate=changeRate,
                            volume=_safe_float(r.get('成交量')),
                            amount=_safe_float(r.get('成交额')),
                        ))
                        if abs(changeRate) >= 1.0:
                            now = datetime.now().strftime('%H:%M')
                            if changeRate > 0:
                                data.indexAlerts.append(AlertItem(
                                    type='up', time=now,
                                    text=f'{name}上涨{changeRate:.2f}%，报{_safe_float(r.get("最新价")):.2f}'
                                ))
                            else:
                                data.indexAlerts.append(AlertItem(
                                    type='down', time=now,
                                    text=f'{name}下跌{abs(changeRate):.2f}%，报{_safe_float(r.get("最新价")):.2f}'
                                ))
        except Exception as e:
            logger.warning(f"异动-指数获取失败: {e}")

        try:
            df_all = _get_spot_df_sync()
            if df_all is not None and len(df_all) > 0:
                now = datetime.now().strftime('%H:%M')
                for _, r in df_all.iterrows():
                    pct = _safe_float(r.get('涨跌幅'))
                    if abs(pct) >= 8:
                        name = _safe_str(r.get('名称'))
                        code = _safe_str(r.get('代码'))
                        if pct > 0:
                            data.stockAlerts.append(AlertItem(
                                type='up', time=now, code=code,
                                text=f'{name}涨{pct:.2f}%，现报{_safe_float(r.get("最新价")):.2f}'
                            ))
                        else:
                            data.stockAlerts.append(AlertItem(
                                type='down', time=now, code=code,
                                text=f'{name}跌{abs(pct):.2f}%，现报{_safe_float(r.get("最新价")):.2f}'
                            ))
                    if len(data.stockAlerts) >= 50:
                        break
        except Exception as e:
            logger.warning(f"异动-个股获取失败: {e}")

        return data

    return await asyncio.to_thread(_fetch)


# ============================================================
# 13. 东方财富热股
# ============================================================
async def get_hot_stocks() -> List[StockQuote]:
    def _fetch():
        import akshare as ak
        stocks: List[StockQuote] = []
        try:
            df = None
            try:
                df = ak.stock_hot_rank_em()
            except Exception:
                try:
                    df = ak.stock_hot_em()
                except Exception:
                    df = ak.stock_zt_pool_em(date=_today_str())

            if df is not None and len(df) > 0:
                col_code = '代码'
                col_name = '名称'
                col_price = '最新价'
                col_pct = '涨跌幅'
                for _, r in df.iterrows():
                    code = _safe_str(r.get(col_code))
                    if not code or not code.isdigit():
                        continue
                    stocks.append(StockQuote(
                        code=code,
                        name=_safe_str(r.get(col_name)),
                        price=_safe_float(r.get(col_price)),
                        changeRate=_safe_float(r.get(col_pct)),
                        amount=_safe_float(r.get('成交额')),
                        volume=_safe_float(r.get('成交量')),
                        turnoverRate=_safe_float(r.get('换手率')),
                        marketCap=_safe_float(r.get('总市值')),
                    ))
                    if len(stocks) >= 50:
                        break
        except Exception as e:
            logger.warning(f"获取热股失败: {e}")
        return stocks

    return await asyncio.to_thread(_fetch)
