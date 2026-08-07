## 项目概述

StockExt — A股行情 WebApp + VSCode 扩展二合一项目。前端 React WebApp 支持 PWA，后端 API 代理东方财富/新浪/腾讯数据源，VSCode 扩展提供桌面端行情能力。

本次改造：新增本地代理服务器（`scripts/server.ts`），将 webapp 静态文件托管和 API 代理合并到单一 Node.js 进程，绑定 0.0.0.0:5000，手机浏览器可直接访问。

## 技术栈

- **前端**：React 18 + Vite 5 + TypeScript + PWA（vite-plugin-pwa）
- **API 层**：Vercel Serverless Functions（`api/*.ts`），本地通过 `scripts/server.ts` 运行
- **数据源**：东方财富、新浪财经、腾讯财经（通过 API 层代理）
- **AI**：OpenAI 协议兼容，用户自配 API Key，SSE 流式响应
- **VSCode 扩展**：VSCode Extension API v5，Chat Participants + Language Model Tools
- **运行时**：Node.js + tsx（TypeScript 直接执行）

## 目录结构

```
/workspace/projects/
├── api/                    # API 接口（Vercel Functions / 本地代理复用）
│   ├── _shared/            # 共享工具（http.ts, response.ts, vercel-node-shim.ts）
│   ├── ai/chat.ts          # AI 对话代理（SSE 流式）
│   ├── quote.ts            # 实时行情
│   ├── kline.ts            # K 线数据
│   └── ...                 # 30+ 个接口
├── webapp/                 # 前端 WebApp
│   ├── src/
│   │   ├── pages/          # 6 个页面（Home/StockDetail/AIChat/Settings/AIModelEditor/Report）
│   │   ├── components/     # KLineChart, ChipsChart, FormulaEditor
│   │   ├── api/client.ts   # API 客户端封装
│   │   └── store/          # localStorage 持久化状态
│   └── dist/               # 构建产物（server.ts 托管此目录）
├── stock-extension/        # VSCode 扩展
├── shared/                 # 跨端共享代码
├── scripts/
│   ├── server.ts           # 本地代理服务器（静态文件 + API 代理，端口 5000）
│   ├── dev-api-server.ts   # 纯 API 开发服务器（端口 19101）
│   ├── build.sh            # 构建脚本
│   └── run.sh              # 启动脚本
├── .coze                   # 项目配置
└── .preview                # 预览端口声明
```

## 关键入口

- **启动服务**：`npx tsx scripts/server.ts`（端口 5000）
- **构建 webapp**：`cd webapp && npx vite build`
- **API 客户端**：`webapp/src/api/client.ts`（`API_BASE` 默认空，同源请求）
- **API 路由映射**：`/api/*` → `api/*.ts`（自动扫描，无需手动注册）

## 运行与预览

- 服务绑定 `0.0.0.0:5000`，手机浏览器访问同一局域网 IP 即可使用
- webapp 已内置 PWA 支持，手机可"添加到桌面"获得类 App 体验
- API 请求路径为相对路径 `/api/*`，由本地服务器直接代理到数据源
- AI 功能需要用户在设置页配置自己的 API Key / 模型

## 用户偏好与长期约束

- 不安装重型开发环境（Android Studio 等）
- 使用本地代理模式，webapp 走本地代理访问数据源

## 常见问题和预防

- `FormulaEngine.ts` 中中文函数名与 `function` 关键字之间必须有空格
- API 文件使用 `import type { VercelRequest, VercelResponse }`，本地运行通过 `vercel-node-shim.ts` 提供类型
- webapp 构建依赖 `vite-plugin-pwa`，需 `--legacy-peer-deps` 或 pnpm 安装
- 数据源（东方财富等）可能有反爬策略，`api/_shared/http.ts` 内置了 UA 和编码处理
