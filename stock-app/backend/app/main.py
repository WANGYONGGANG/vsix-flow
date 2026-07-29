from __future__ import annotations

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .routers.stock import router as stock_router
from .cache import clear_cache, get_cache_stats

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Stock Data API (akshare)",
    description="基于 akshare 的 A 股数据服务， Railway 可部署",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stock_router)


@app.get("/", tags=["health"])
async def root():
    return {
        "ok": True,
        "service": "stock-app",
        "version": "3.0.0",
        "data_source": "akshare (新闻除外)",
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "cache": get_cache_stats()}


@app.post("/admin/cache/clear", tags=["admin"])
async def admin_clear_cache():
    clear_cache()
    return {"ok": True, "cache_cleared": True}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.exception(f"Unhandled error: {exc}")
    origin = request.headers.get("origin") or "*"
    allowed_origins = settings.cors_origins_list
    acao = origin if ("*" in allowed_origins or origin in allowed_origins) else ""
    resp = JSONResponse(
        status_code=500,
        content={"error": "internal_server_error", "detail": str(exc)},
    )
    if acao:
        resp.headers["Access-Control-Allow-Origin"] = acao
        resp.headers["Access-Control-Allow-Methods"] = "DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT"
        resp.headers["Access-Control-Allow-Headers"] = "*"
        if settings.CORS_ORIGINS != "*":
            resp.headers["Vary"] = "Origin"
            resp.headers["Access-Control-Allow-Credentials"] = "true"
    return resp
