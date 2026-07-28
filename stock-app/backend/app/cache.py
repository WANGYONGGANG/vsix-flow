from __future__ import annotations

import asyncio
from cachetools import TTLCache
from typing import Any, Callable, TypeVar, Optional
from functools import wraps
from .config import settings

T = TypeVar("T")

_cache: TTLCache = TTLCache(maxsize=1024, ttl=settings.CACHE_TTL_SECONDS)
_lock = asyncio.Lock()


def make_key(prefix: str, *args, **kwargs) -> str:
    parts = [prefix]
    for a in args:
        parts.append(str(a))
    for k in sorted(kwargs.keys()):
        parts.append(f"{k}={kwargs[k]}")
    return "|".join(parts)


async def cached_async(prefix: str, func: Callable[..., Any], *args, **kwargs) -> Any:
    key = make_key(prefix, *args, **kwargs)
    if key in _cache:
        return _cache[key]
    async with _lock:
        if key in _cache:
            return _cache[key]
        result = await func(*args, **kwargs)
        _cache[key] = result
        return result


def clear_cache():
    _cache.clear()


def get_cache_stats() -> dict:
    return {
        "size": len(_cache),
        "maxsize": _cache.maxsize,
        "ttl": _cache.ttl,
    }
