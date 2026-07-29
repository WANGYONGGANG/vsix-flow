# stock-app v3.0

A 股资金流向与行情看板，前后端分离架构。

- **数据源（股票类）**：[akshare](https://akshare.akfamily.xyz/)（Python 财经数据接口库，稳定且维护积极）
- **新闻数据源**：东方财富 7×24 新闻（直接调用东方财富官方接口，不经过 akshare，保持时效性）
- **后端**：FastAPI + Python 3.10+（所有股票数据统一由 akshare 获取并做类型规整 / 缓存）
- **前端**：Next.js 15 + React 18 + TypeScript + Tailwind + visx / lightweight-charts
- **部署目标**：[Railway](https://railway.app/)（后端和前端两个 service，一键部署）

---

## 🎯 功能清单（11 个 Tab）

| # | Tab | 说明 | 数据源 |
|---|-----|------|--------|
| 1 | 概况 | 7 大指数、涨跌停/涨跌平统计、北向资金、涨停结构（首板/2连/3+连/炸板） | akshare |
| 2 | 资金 | 概念板块主力净流入排行 + 分时资金流向趋势图 | akshare |
| 3 | 新闻 | 东方财富 7×24 实时快讯 | 东方财富官方 API（保留原始方式） |
| 4 | 板块 | 概念板块涨跌排行榜 | akshare |
| 5 | 龙头 | 近期强势涨停龙头股（连板、强势股池） | akshare |
| 6 | 强板 | 强势板块列表 + 点击查看板块成分股 | akshare |
| 7 | 龙虎 | 龙虎榜每日明细：买卖席位 + 机构/游资/量化/敢死队席位分类标签 | akshare |
| 8 | 涨停 | 今日涨停池 + 昨日涨停今日表现 | akshare |
| 9 | 异动 | 指数异动（±1%）+ 个股大幅异动（±8%）语音播报开关 | akshare |
| 10 | 热股 | 东方财富热度榜股票 | akshare |
| 11 | 自选 | 本地自选股（localStorage）+ 实时行情 | akshare |

点击任意股票区域可跳转至**个股详情页**（历史 K 线、指标、成本价与盈亏展示）。

---

## 🏗 目录结构

```
stock-app/
├── backend/                # FastAPI + akshare 后端（Python）
│   ├── app/
│   │   ├── main.py        # FastAPI 入口，CORS、健康检查、路由挂载
│   │   ├── config.py      # pydantic-settings 配置（端口、CORS、缓存 TTL 等）
│   │   ├── schemas.py     # Pydantic v2 数据模型（与前端 types.ts 对齐）
│   │   ├── cache.py       # TTLCache 内存缓存（默认 60s）
│   │   ├── routers/
│   │   │   └── stock.py   # 16 个 /api/* 端点
│   │   └── services/
│   │       ├── akshare_service.py  # 核心：所有股票类数据通过 akshare 获取 + 清洗适配
│   │       └── news_service.py     # 新闻：东方财富 7x24 API（保留原始方式）
│   ├── requirements.txt
│   ├── Procfile           # Railway 启动脚本
│   ├── railway.json       # Railway 部署配置
│   └── .env.example
│
└── frontend/               # Next.js 15 前端（Node.js >= 18）
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx           # 11 Tab 主框架
    │   │   └── globals.css
    │   ├── components/            # 13 个业务组件（MarketOverview / FundFlowTab / KlineChart ...）
    │   └── lib/
    │       ├── api.ts             # 请求层：通过 NEXT_PUBLIC_API_BASE 指向后端
    │       ├── store.ts           # Zustand 全局状态（Tab、自选股、个股详情栈）
    │       └── types.ts           # 前端 TS 类型（与后端 schemas.py 一一对应）
    ├── next.config.js
    ├── tailwind.config.js
    ├── tsconfig.json
    ├── railway.json
    └── package.json
```

---

## 🚀 本地快速启动

### ① 启动后端（Python 3.10+）

```bash
cd stock-app/backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env      # 按需修改端口/CORS
uvicorn app.main:app --reload --port 8000
```

后端启动后访问：

- API 文档（Swagger）：http://localhost:8000/docs
- 健康检查：http://localhost:8000/health

### ② 启动前端（Node.js >= 18）

```bash
cd stock-app/frontend
cp .env.example .env.local    # NEXT_PUBLIC_API_BASE=http://localhost:8000
npm install
npm run dev
```

打开 http://localhost:3000 即可使用 ✨

---

## 🌐 Railway 部署（推荐）

> ⚠️ **重要前置说明**：stock-app 是 **monorepo 双服务架构**（Python 后端 + Node.js 前端），必须在同一个 Railway Project 里建 **两个独立 Service**，且**每个 Service 都必须显式设置 Root Directory** + **显式指定 Build/Start 命令**，否则 Railpack 会猜不出项目类型，报 `start.sh not found` 或 `Railpack could not determine how to build the app.`。

### 后端 Service（Python / FastAPI + akshare）

1. **New Project → New Service** → 选择你上传的 stock-app 仓库（GitHub / GitLab / 本地都可以）。
2. **Settings → Service 重命名**（可选）：例如 `stock-app-backend`，方便和前端区分。
3. **Settings → Root Directory（必填！默认是仓库根，会导致猜不出项目）** 填：
   ```
   stock-app/backend
   ```
   > 如果你把 repo 根直接指向 stock-app 目录（没有外层 vsix 包一层），那填 `backend` 即可。
4. **Settings → Build 命令（显式覆盖，避免 Railpack 猜测）**：
   ```
   echo "build ok"
   ```
   > Python 服务不需要额外 build，Nixpacks 会自动执行 `pip install -r requirements.txt`。写一句占位命令是为了让 Railpack 不要猜 build 方式（Railpack 一旦进入猜测模式就可能去找 `start.sh` 失败）。
5. **Settings → Start 命令（显式覆盖，避免 Railpack 猜测）**：
   ```
   python3 -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
   > 注意：**必须用 `python3` 而不是 `python`**，因为 Railway/Nixpacks Build 镜像里只预装了 `python3` 命令，没有 `python` 别名（直接写 `python` 会报 `sh: 1: python: not found`）。使用 `python3 -m uvicorn` 调用模式比直接跑 `uvicorn` 更稳——保证解释器和 uvicorn 来自同一个 Python 环境。
6. **Variables（环境变量）** 按需添加：
   | Key | 值 | 是否必填 |
   |-----|----|----------|
   | `CORS_ORIGINS` | `*` 或你前端的域名，多个用逗号分隔 | 否，默认 `*` |
   | `CACHE_TTL_SECONDS` | `60`（TTLCache 过期时间，单位秒） | 否，默认 60 |
7. Deploy → 等待构建完成，记下后端公开域名，例如 `https://stock-app-backend-production.up.railway.app`，打开 `/health` 验证返回 `{"status":"ok"}`。

### 前端 Service（Next.js 15 / Node.js）

1. **同一个 Project → New Service** → 选择**同一个仓库**（后端前端放一个仓库，一个 Project 两个 Service）。
2. **Settings → Service 重命名**：例如 `stock-app-frontend`。
3. **Settings → Root Directory（必填！）**：
   ```
   stock-app/frontend
   ```
   > 如果 repo 根就是 stock-app，填 `frontend`。
4. **Settings → Build 命令（显式覆盖，避免 Railpack 猜测）**：
   ```
   npm run build
   ```
5. **Settings → Start 命令（显式覆盖，避免 Railpack 猜测）**：
   ```
   npm run start
   ```
   > `package.json` 中 start 脚本已支持 `$PORT`：`next start -p ${PORT:-3000}`，与 Railway 自动注入的 `$PORT` 完美对齐。
6. **Variables（环境变量，必填！）**：
   | Key | 值 | 是否必填 |
   |-----|----|----------|
   | `NEXT_PUBLIC_API_BASE` | `https://stock-app-backend-production.up.railway.app`（替换为后端 Service 的**实际公网域名，末尾不带斜杠**） | ✅ 必须，否则前端请求发到自己域名下会 404 |
   | `NODE_ENV` | `production` | 否，Railway 默认会设 |
7. Deploy → 完成！访问 Railway 分配的前端域名即可。

### 🧩 常见报错与修复（`start.sh not found` / Build 失败排查）

| 报错 | 根因 | 修复 |
|------|------|------|
| `⚠ Script start.sh not found` / `✖ Railpack could not determine how to build the app.` | Railpack 没找到 Root Directory 内对应 `requirements.txt` / `package.json`，或没显式指定 Build/Start 命令 | 到 **Settings → Root Directory** 确认路径是 `stock-app/backend` 或 `stock-app/frontend`（不是仓库根）；再到 **Settings → Build/Start 命令** 分别按上文两节手动填一遍覆盖即可 |
| `sh: 1: python: not found`（Build 或 Start 阶段报错）| Build/Start 命令里用了 `python`，但 Railway Nixpacks Linux 镜像里只有 `python3` 命令，没建 `python` 别名 | 把所有出现 `python` 的命令改成 `python3`，并用 `python3 -m uvicorn ...` 代替直接 `uvicorn ...` 启动 |
| 前端加载后所有 Tab 都是空 / Network 404 | `NEXT_PUBLIC_API_BASE` 未配置或写错 | 检查 Variables 是否填了后端公网域名，末尾不要带 `/`；改完重新 Deploy（Next.js 的环境变量是 build time 注入的，只改变量不重新 build 不会生效） |
| 后端 `/health` OK，但 `/api/market-overview` 500 | akshare 首次拉取较慢触发 Railway 30s 超时，或 akshare 字段变动 | 重试一次（触发 akshare 缓存）；如果持续报错，看后端 Logs 定位是哪个接口的字段名变了，改 `akshare_service.py` 对应映射即可 |

> 💡 **省钱小技巧**：两个 service 放在同一个 Railway Project 内，内网互通免费（如果用 Railway 内网域名代替公网 `NEXT_PUBLIC_API_BASE`，可以省公网流量配额，但注意 Next.js 是客户端渲染，fetch 发生在浏览器里，所以 `NEXT_PUBLIC_API_BASE` 必须是公网域名——如果后端接口改走 Server Components 服务端请求，再换内网域名）。

---

## 🔌 API 端点一览（16 个）

所有端点统一前缀 `/api`，默认响应 JSON。新闻保留东方财富原生方式，其余走 akshare。

| Method | 路径 | 说明 |
|--------|------|------|
| GET | `/market-overview` | 市场概况（指数、涨跌平、北向资金、涨停结构） |
| GET | `/fund-flow/sectors` | 概念板块主力净流入 TOP 50 |
| GET | `/fund-flow/intraday` | 板块分时资金流向（240 分钟） |
| GET | `/kline?code=600519&period=day` | 个股 K 线，period ∈ {5min,15min,30min,60min,day,week,month} |
| GET | `/quote?code=600519` 或 `?codes=600519,000001` | 个股实时行情，支持单只或批量逗号分隔，返回 `{data: StockQuote[]}` |
| GET | `/dragon-tiger?date=20260728` | 龙虎榜（含买卖席位、分类标签） |
| GET | `/limit-up-today?date=20260728` | 今日涨停池 |
| GET | `/yesterday-limit` | 昨日涨停股今日表现 |
| GET | `/limit-leader` | 龙头/强势股池 |
| GET | `/sector-limit` | 概念板块涨跌排行 |
| GET | `/strong-sector` | 强势板块列表 |
| GET | `/strong-sector/{code}` | 指定板块成分股 |
| GET | `/alert` | 大盘/个股异动检测结果（可直接播报） |
| GET | `/hot-stocks` | 东方财富热股榜 |
| GET | `/em-news?page=1&page_size=50` | 东方财富 7×24 新闻，返回 `{news: NewsItem[]}`（**非 akshare，直接东方财富官方 API**） |

其他辅助端点：

| Method | 路径 | 说明 |
|--------|------|------|
| GET | `/` | 服务信息 + docs 链接 |
| GET | `/health` | 健康检查 + 缓存统计 |
| POST | `/admin/cache/clear` | 手动清空内存缓存 |

数据模型（请求/响应结构）见：

- 后端：[schemas.py](file:///d:/vsix/stock-app/backend/app/schemas.py)
- 前端：[types.ts](file:///d:/vsix/stock-app/frontend/src/lib/types.ts)

---

## 🧠 设计要点

1. **akshare 统一封装**：所有股票类接口全部走 `akshare_service.py`，内部把 akshare 返回的 DataFrame 清洗为与前端一致的 schema，字段命名与历史版本保持兼容（例如 `changeRate`、`netInflow`）。
2. **新闻单独保留东方财富方式**：akshare 新闻接口频率低，7×24 快讯对时效性要求高，因此直接请求东方财富 `np-listapi.eastmoney.com`，逻辑放在 `news_service.py`。
3. **T T L 内存缓存**：`cachetools.TTLCache`（默认 60s），避免对同一接口短时间内重复拉取。akshare 大部分接口依赖 HTTP，一次调用 ~几百毫秒。
4. **与前端字段一一对应**：后端 Pydantic 模型与前端 TypeScript 接口命名完全一致，避免前端再做二次映射，降低心智负担。
5. **Railway 双服务**：backend/frontend 各独立 Railway service，通过 `Root Directory` 指向子目录即可，无需拆仓库。
6. **自选股本地持久化**：前端自选股写入 `localStorage`，行情仍通过 `/api/quote` 实时查询。

---

## 🛠 开发调试建议

- 后端调试：访问 `http://localhost:8000/docs`（Swagger UI）直接试接口
- 前端调试：先跑后端，再跑前端，看浏览器 Network 里的 `NEXT_PUBLIC_API_BASE` 是否正确
- 首次启动慢：akshare 会下载一些元数据（交易日历等），正常现象
- 清空 akshare 缓存：删除 `~/.akshare` 目录或调用 `POST /admin/cache/clear`

---

## ❓ FAQ

**Q：为什么不用之前的 Vercel / Cloudflare Worker / 东方财富直连？**
A：akshare 是 Python 生态最稳定最全的 A 股数据源之一，统一封装后不必再处理东方财富各种字段名、反爬、分页、参数黑盒。Railway 对 Python + Node.js 混合栈的支持比 Vercel 更自然（Vercel Serverless Functions 运行 akshare 有冷启动 + 超时 + 依赖体积问题）。

**Q：新闻为什么不走 akshare？**
A：akshare 的新闻接口为低频抓取，对 7×24 快讯这类高时效内容，直接调用东方财富官方接口更快更稳。`news_service.py` 独立文件，保留了原始实现。

**Q：Railway 免费额度够吗？**
A：对于个人用户的低频访问场景，Railway 免费计划基本够用。若后端长期运行，推荐使用 $5/月 的基础计划，避免休眠冷启动。

---

*stock-app v3.0 — 架构重构完成。用 akshare 统一数据源，前后端分离 + Railway 部署，结构清爽，易扩展。🎉*
