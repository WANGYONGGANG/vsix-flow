# StockExt WebApp + VSCode 扩展 二合一部署方案

> 目标：**一份代码，两个终端使用**
> - **WebApp**：手机浏览器打开 → 可添加到桌面 = 手机"快应用"（PWA）
> - **后端 API**：全部部署在 **Vercel Serverless Functions**（东方财富/新浪/腾讯接口代理 + AI 兼容代理），解决跨域和风控
> - **AI 功能**：支持 **OpenAI 协议任意服务**，用户 **自己配置 API Key / 模型**，Key 只存在用户本地
> - **VSCode 扩展**：不破坏原有体验，新增「云端 API 基址」配置，一套数据两种使用方式

---

## 1. 架构总览

```
┌──────────────────────────────────────────────────────────────┐
│                        Vercel 部署                           │
│   前端：webapp/ (React + Vite + PWA)                         │
│   API：  api/*.ts  →  Serverless Functions                   │
│                                                              │
│   /api/quote         ── 代理──▶  push2.eastmoney.com         │
│   /api/kline/*       ── 代理──▶  ifund / 新浪 / 腾讯          │
│   /api/em/news       ── 代理──▶  东方财富 7*24 快讯           │
│   /api/ai/chat       ── 兼容代理──▶ 用户自定义 baseURL 任意 AI │
│   ...                                                            │
└──────────────────────────────────────────────────────────────┘
         ▲                      ▲
         │                      │
    📱 手机浏览器 / PWA       💻 VSCode 扩展（配置 apiBaseUrl 指向 Vercel 即可）
    (直接访问 / 域名)          (保留本地代理作为 fallback)
```

### 为什么用 Vercel？
- **Serverless Functions** 天然做接口反代（CORS 由 Vercel 统一处理）
- **前端静态资源 + API 同域**，零跨域、零域名配置成本
- **支持 edge caching**，`/quote` 等可加 Cache-Control
- 一键从 GitHub 推送 → 自动部署

---

## 2. 目录结构（Monorepo）

```
/workspace
├── shared/                ← 跨端共享：types / constants / utils
│   ├── types.ts
│   ├── constants.ts
│   └── utils.ts
│
├── api/                   ← Vercel Serverless Functions（/api/*）
│   ├── _shared/
│   │   └── http.ts        ← fetch 工具、代码转换、emFlattenCode
│   ├── quote.ts           ← /api/quote?codes=sh600519,sh000001
│   ├── kline.ts           ← /api/kline/sh600519/day?limit=200
│   ├── intraday.ts        ← /api/intraday/sh600519
│   ├── sectors/
│   │   ├── bkzj.ts        ← /api/sectors/bkzj?t=0（行业/概念资金流）
│   │   └── rank.ts        ← /api/sectors/rank?type=industry
│   ├── market_overview.ts ← /api/market/overview
│   ├── emNews.ts          ← /api/em/news?page=1&pageSize=20
│   ├── alerts.ts          ← /api/alerts?limit=50
│   ├── news/
│   │   ├── stock.ts       ← /api/news/stock/sh600519?page=1
│   │   └── notice.ts      ← /api/news/notice/sh600519?page=1
│   ├── stock/
│   │   ├── finance.ts     ← /api/stock/finance/sh600519
│   │   └── profile.ts     ← /api/stock/profile/sh600519
│   └── ai/
│       └── chat.ts        ← /api/ai/chat（SSE 流式，兼容 OpenAI 协议）
│
├── webapp/                ← 手机 WebApp (React 18 + Vite 5 + PWA)
│   ├── public/
│   │   └── manifest.webmanifest
│   ├── vite.config.ts     ← 含 PWA (vite-plugin-pwa) / dev 代理
│   ├── index.html
│   ├── src/
│   │   ├── api/client.ts              ← 封装所有 API 调用（含 SSE 流式）
│   │   ├── router/useRouter.ts
│   │   ├── store/useSettings.ts       ← localStorage 持久化：自选/偏好/AI 模型
│   │   ├── components/KLineChart.tsx  ← Canvas K 线（分时/日/周/月 + 指标）
│   │   ├── pages/
│   │   │   ├── HomePage.tsx           ← 行情中心（12 个 Tab）
│   │   │   ├── StockDetailPage.tsx    ← 个股详情：K线 + 五档 + 资讯/公告/财务
│   │   │   ├── AIChatPage.tsx         ← AI 对话 + 上下文注入（自选/快讯/板块）
│   │   │   ├── SettingsPage.tsx       ← 设置 + AI 模型管理 + 导入/导出
│   │   │   └── AIModelEditorPage.tsx  ← 新增/编辑 AI 模型（常用预设一键套用）
│   │   └── App.tsx
│
├── stock-extension/       ← VSCode 扩展（v5，保留原功能 + 新能力）
│   ├── package.json       ← 新增 3 个配置：apiBaseUrl / aiModels / activeAIModelId
│   └── src/
│       ├── shared/apiClient.ts  ← 统一入口：云端优先，本地代理 fallback
│       ├── shared/proxyPort.ts
│       └── service/eastmoney.ts ← proxyGet 已改为 apiClient，AI 工具自动可用云端
│
└── vercel.json            ← Vercel 部署配置（functions + rewrites + headers）
```

---

## 3. 关键技术点

### 3.1 PWA（WebApp 可安装到手机桌面）
```ts
// webapp/vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'
VitePWA({
  registerType: 'autoUpdate',
  manifest: { /* public/manifest.webmanifest */ },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,ico,webp}'],
    runtimeCaching: [ /* 缓存 /api/quote 等接口请求到 runtime */ ]
  }
})
```
- 手机 Safari / Chrome 打开后，点「分享 → 添加到主屏幕」= 原生 App 一样使用
- 离线可用（Service Worker 缓存）
- 深链接支持：`https://你的域名/stock/sh600519?name=贵州茅台`

### 3.2 AI 模型「用户自配置」—— 安全 & 兼容
- **配置项：baseURL / apiKey / model / temperature**
- 兼容所有 OpenAI v1 协议：GPT / DeepSeek / 智谱 / 豆包 / 硅基流动 / 本地 Ollama
- **Key 只存在 localStorage / VSCode 扩展 Memento**，服务端**不做任何存储**
- 透传流程：`浏览器 POST /api/ai/chat { baseURL, apiKey }` → Vercel 函数 `fetch(baseURL + '/chat/completions', { Authorization: "Bearer " + apiKey })` → SSE 流式回写 → 浏览器边收边渲染

### 3.3 VSCode 扩展 = 云端可选
原来扩展的**本地 Node 代理模式完全保留**（默认无配置时仍然启动）：

```ts
// package.json contributes.configuration
"stock-ext.apiBaseUrl": {
  "type": "string",
  "default": "",
  "description": "云端 API 基址（Vercel 部署地址，配置后所有请求优先走云端，失败回退本地代理）"
}
```

```ts
// stock-extension/src/shared/apiClient.ts
export function resolveApiUrl(path) {
  const cloud = vscode.workspace.getConfiguration('stock-ext').get('apiBaseUrl');
  if (cloud) return { mode: 'cloud', url: cloud + path };
  return { mode: 'local', url: `http://localhost:${port}${path}` };
}
```

---

## 4. 打包与推送（Vercel Git 自动部署）

**部署方式：推送到 GitHub 后 Vercel 自动构建部署。** 不要用 vercel CLI 从仓库内部署（会因 Git 作者邮箱校验被 BLOCKED）。

关键信息：
- 生产地址：`https://vsix-rho.vercel.app`
- Git 远端：`github-origin` → `https://github.com/WANGYONGGANG/vsix-flow.git`（main 分支）
- 服务端项目设置：framework=`vite`，buildCommand=`cd webapp && npm run build`，outputDirectory=`webapp/dist`
- API 单函数分发器：`api/all.ts` + `api/_handlers/`（下划线目录不生成函数，规避 Hobby 计划 12 函数上限），`vercel.json` rewrites 将 `/api/:ep` 转发到 `/api/all?ep=:ep`

### ① 打包（本地验证，可选）

```bash
nvm use 22.12.0                              # 需要 Node ≥ 18
cd webapp && npm run build                   # 产出 webapp/dist（仅本地验证，Vercel 远端会重新构建，dist 不入库）
cd .. && npx tsc -p tsconfig.api.json --noEmit   # API 类型检查
```

### ② 推送（触发自动部署）

```bash
git add <改动文件>
git commit -m "提交说明"
git push github-origin main                  # Vercel 自动拉取构建，一般 1~2 分钟 READY
```

### ③ 部署状态验证

本机无法直连 `*.vercel.app`，用 Vercel API 查状态（token 位于 `%APPDATA%\xdg.data\com.vercel.cli\auth.json`）：

```bash
# 最近部署列表（projectId/teamId 见 Vercel 控制台）
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.vercel.com/v6/deployments?teamId=<teamId>&projectId=<projectId>&limit=1"
# 单部署状态：readyState=READY 即成功；失败时用 /v3/deployments/{id}/events 看构建日志
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.vercel.com/v13/deployments/<deploymentId>?teamId=<teamId>"
```

部署成功后用手机浏览器 / PWA 打开生产地址验证。

### 自定义域名
在 Vercel 项目 → Settings → Domains 中添加域名 → 按提示配置 DNS CNAME

---

## 5. VSCode 扩展使用云端

1. VSCode → 设置 → 搜索 `stock-ext.apiBaseUrl`
2. 填入：`https://xxx.vercel.app`（你部署好的地址，**不要**带结尾 `/`）
3. 重载窗口

之后：
- 侧边栏行情 / StockAgent AI 工具 / 快讯面板 / 异动监控 → 都会先尝试云端
- 网络失败时自动回退本地代理（兜底）

---

## 6. 本地开发

```bash
# 1) 启动 API 服务 + WebApp 热更新
cd webapp && npm install
npm run dev        # http://localhost:5173，带 /api 代理转发

# 或者分别开：
# npm run dev-api  # 用 @vercel/node 本地起 /api 模拟
# 见 webapp/package.json 配置
```

**数据存储**：全部在浏览器 localStorage，不依赖后端数据库，所以零运维。

---

## 7. 已实现的 WebApp 核心功能

| 模块 | 说明 |
|---|---|
| 🏠 行情中心 | 12 Tab：大盘、自选、板块资金、个股排行、概念/行业资金流、快讯、异动、个股资料… |
| 📈 个股详情 | 分时/5分/15分/30分/60分/日/周/月 K 线，MA/Vol/MACD/RSI 指标切换，五档盘口 |
| 📰 资讯 | 7×24 快讯滚动、个股新闻、公告列表 |
| 💰 资金 | 北向资金、主力资金净流入、板块资金 |
| 🤖 AI 对话 | 流式 SSE 响应，支持自选/快讯/板块资金一键注入上下文，用户自配 AI 模型 |
| 🎛 设置 | 涨跌颜色、轮询间隔、时段轮询、语音播报；AI 模型管理（增删改 + 测试连接 + 预设） |
| 📲 PWA | 可安装到手机桌面、离线可用、深链接、桌面 Shortcuts |
| 💾 数据 | 导出/导入 JSON（自选/偏好/AI 模型）、清空本地 |

---

## 8. AI 模型预设

在「我的 → AI 模型管理 → 新增模型」中可选预设，一键填入：

| 预设 | baseURL | 推荐模型 |
|---|---|---|
| OpenAI GPT | `https://api.openai.com/v1` | `gpt-4o-mini` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| 智谱 AI | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` |
| 字节 豆包 (火山方舟) | `https://ark.cn-beijing.volces.com/api/v3` | `doubao-pro-32k` |
| 硅基流动 | `https://api.siliconflow.cn/v1` | `deepseek-ai/DeepSeek-V3` |
| 本地 Ollama | `http://127.0.0.1:11434/v1` | `qwen2.5:7b` |

所有模型都用 **同一套 /api/ai/chat 代理**，完美兼容。

---

## 9. 常见问题

**Q1: 东方财富会封 Vercel IP 吗？**
A: Serverless Functions 出口 IP 动态变化 + 每次请求带真 UA + 随机 delay，比本地单机反爬强。若遇风控，`api/_shared/http.ts` 可换成带 proxy-agent。

**Q2: PWA 安装后能离线看行情吗？**
A: 离线只能看上次缓存的数据（Service Worker）。在线时每次访问都会刷新。

**Q3: 为什么不用小程序 / 快应用？**
A: PWA 开发成本低（复用 Web 代码）、跨平台（iOS/Android）、不用上架审核、可分享链接；但微信里确实装不上，需浏览器打开。

**Q4: API Key 会泄露吗？**
A: Key 只存在你自己的浏览器 localStorage 或 VSCode 扩展 Memento，请求时带在 `/api/ai/chat` 的 body 里，Vercel 函数**读完即丢**，不写任何日志不存数据库。
