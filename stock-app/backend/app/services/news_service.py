from __future__ import annotations

import asyncio
import logging
import httpx
from typing import List, Any
from datetime import datetime
from ..schemas import NewsItem
from ..config import settings

logger = logging.getLogger(__name__)


async def fetch_em_news(page_size: int = 50, page: int = 1) -> List[NewsItem]:
    """获取东方财富7x24实时新闻（不通过akshare，保留原始方式）"""
    url = "https://np-listapi.eastmoney.com/comm/web/getNewsByColumns"
    params = {
        "client": "web",
        "biz": "web_news_col",
        "column": "350",
        "order": "1",
        "needInteractData": "0",
        "page_index": str(page),
        "page_size": str(page_size),
        "req_trace": str(int(datetime.now().timestamp() * 1000)),
    }
    headers = {
        "Referer": "https://so.eastmoney.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    }
    items: List[NewsItem] = []
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            news_list = (
                data.get("data", {})
                .get("list", [])
            )
            for n in news_list:
                nid = (
                    n.get("code") or n.get("artCode") or n.get("id")
                    or n.get("newsId") or n.get("uniqueUrl") or n.get("url") or ""
                )
                title = (n.get("title") or "").strip()
                summary = (
                    n.get("summary") or n.get("digest") or n.get("content")
                    or n.get("brief") or n.get("description") or ""
                ).strip()
                # 兼容：正文为空时用标题作为内容，避免前端“只显示时间+来源”
                content = summary or title
                raw_time = (n.get("showTime") or n.get("addtime") or n.get("createTime") or "").strip()
                source = (n.get("mediaName") or n.get("source") or "东方财富").strip()
                if not title:
                    continue
                items.append(NewsItem(
                    id=str(nid),
                    title=str(title),
                    content=str(content),
                    time=str(raw_time),
                    source=str(source),
                ))
    except Exception as e:
        logger.warning(f"获取东方财富新闻失败: {e}")
    return items
