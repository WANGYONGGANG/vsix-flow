## 项目概述

StockExt — A股行情 WebApp + VSCode 扩展二合一项目。前端 React WebApp 支持 PWA，后端 API 代理东方财富/新浪/腾讯数据源。

**部署架构**：所有 API 合并为单一 Vercel Serverless Function（`api/index.ts`），通过内部路由分发到 `lib/handlers/` 中的各个 handler，突破 Vercel 免费版 12 函数限制。

## 技术栈

- **前端**：React 18 + Vite 5 + TypeScript + PWA
- **API 层**：单一 Vercel Function（`api/index.ts`）+ 路由分发
- **数据源**：东方财富、新浪财经、腾讯财经
- **AI**：OpenAI 协议兼容，SSE 流式响应
- **运行时**：Node.js + tsx

## 目录结构

```
/workspace/projects/
├── api/
│   └── index.ts              # 单一入口，路由分发到 lib/handlers/
├── lib/
│   ├── shared/               # 共享工具（http.ts, response.ts）
│   └── handlers/             # 25 个 API handler
│       ├── quote.ts, kline.ts, ...
│       └── ai/chat.ts
├── webapp/                   # React WebApp（PWA）
│   ├── src/pages/            # 6 个页面
│   └── dist/                 # 构建产物
├── stock-extension/          # VSCode 扩展
├── shared/                   # 跨端共享代码
├── scripts/
│   ├── server.ts             # 本地代理服务器（端口 5000）
│   ├── build.sh / run.sh
│   └── dev-api-server.ts     # 纯 API 开发服务器（端口 19101）
└── vercel.json               # Vercel 部署配置（单函数 + rewrite）
```

## 关键入口

- **Vercel 部署**：`vercel.json` 将所有 `/api/*` rewrite 到 `/api/index`
- **本地服务**：`npx tsx scripts/server.ts`（端口 5000）
- **构建**：`bash scripts/build.sh`
- **路由映射**：`api/index.ts` 中的 `ROUTES` 对象

## 运行与预览

- 本地：`bash scripts/run.sh` → `http://0.0.0.0:5000`
- Vercel：push 到 GitHub 后自动部署，获得 `xxx.vercel.app` 域名
- PakePlus：用 Vercel 地址打包 Android App

## 常见问题和预防

- `FormulaEngine.ts` 中文函数名与 `function` 之间必须有空格
- Vercel 免费版限 12 函数，已合并为 1 个入口解决
- webapp 构建需 `--legacy-peer-deps` 或 pnpm
