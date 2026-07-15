# 主力资金流向可视化 — 产品需求文档

## 1. 项目概述

构建一个主力资金流向可视化工具，包含 **H5 页面** 与 **VS Code 扩展 (VisX)** 两个版本。核心功能为展示各概念板块在交易日内及历史 45 天内的主力资金净流入曲线，支持明暗主题切换与自适应布局。

---

## 2. 核心功能需求

| 功能 | 说明 |
|------|------|
| 当日实时流向 | 展示当日 09:30 ~ 15:00（A 股交易时间）各板块资金净流入的实时/收盘曲线 |
| 45 天历史流向 | 支持切换为近 45 个交易日的日终汇总数据，展示趋势 |
| 明暗主题 | 提供 Light / Dark 两种主题，支持一键切换，并持久化用户偏好 |
| 自适应布局 | 适配移动端 H5 与 VS Code Webview 面板宽度，图表随容器自动缩放 |
| 板块排名标签 | 图表右侧固定展示各板块最新/收盘数值，并按净流入金额排序 |
| 数据 Tooltip | 鼠标/手指悬停时展示该时间点上各板块的具体数值 |

---

## 3. 数据模型

### 3.1 当日实时数据 (Intraday)
```typescript
interface IntradayPoint {
  time: string;          // "09:30", "09:35" ... "15:00"，5 分钟粒度
  sectors: Record<string, number>; // { "商业航天": 71.73, "创新药": 29.5, ... }
}
```

### 3.2 历史日终数据 (Historical)
```typescript
interface HistoricalPoint {
  date: string;          // "2026-06-01"
  sectors: Record<string, number>;
}
```

### 3.3 板块元信息
```typescript
interface SectorMeta {
  name: string;          // 板块名称
  color: string;         // 固定配色，保证多视图一致性
}
```

> **说明**：项目内置 Mock 数据生成器用于快速演示，同时提供标准化 REST API 接口，可无缝切换至真实数据源。推荐真实数据源见第9节。

---

## 4. UI / UX 设计

### 4.1 布局结构（以 H5 为例）

```
┌─────────────────────────────────────────┐
│  [←]  主力资金流向          [☀/🌙]  │  ← Header + 主题切换
├─────────────────────────────────────────┤
│  [当日实时]  [近45天]                   │  ← Tab 切换
├─────────────────────────────────────────┤
│                                         │
│         ┌──────────────────────┐        │
│         │                      │ 排名列表 │  ← 图表主体 + 右侧固定排名
│         │     折线图表区域      │ 商业航天 │
│         │                      │ 创新药   │
│         └──────────────────────┘ ...    │
│  09:30        11:30      14:00          │  ← X轴时间刻度
│                                         │
├─────────────────────────────────────────┤
│  单位：亿                               │  ← 底部说明
└─────────────────────────────────────────┘
```

### 4.2 配色方案

**Light 主题**
- 背景：`#ffffff`
- 文字：`#1f2329`
- 网格线：`#e5e6eb`
- 正资金：红系 `#f53f3f`
- 负资金：绿系 `#00b42a`
- 板块线条：使用高区分度色板（紫、橙、蓝、黄、粉、青等）

**Dark 主题**
- 背景：`#0e1116`
- 文字：`#c9cdd4`
- 网格线：`#2e2e30`
- 正资金：`#ff4d4f`
- 负资金：`#23c343`
- 板块线条：在 Light 基础上适当提亮 10%

### 4.3 交互细节

1. **Tab 切换**：点击“当日实时 / 近45天”切换数据源，图表带 300ms 平滑过渡动画。
2. **主题切换**：点击右上角图标，CSS 变量整体切换，图表重绘无闪烁。
3. **Hover/触摸**：在图表区域滑动时，出现垂直指示线，右侧排名列表实时更新为该时间点的数值并重新排序。
4. **自适应**：图表使用 `ResizeObserver` 监听容器尺寸，任何宽度变化均重算 scale/translate。
5. **动态推进**：当日实时模式下，曲线从 09:30 开始逐帧绘制至 15:00，模拟盘中真实走势；支持暂停/重播。

---

## 5. 技术实现方案

### 5.1 H5 版本

| 选型 | 说明 |
|------|------|
| React 19 + TypeScript | 核心框架 |
| Vite | 构建工具 |
| VisX (@visx/xy-chart, @visx/shape, @visx/tooltip, @visx/legend) | 图表绘制 |
| Tailwind CSS | 样式与主题变量 |
| lucide-react | 图标 |

**关键组件**
- `FundFlowChart`：封装 VisX 的 `XYChart`，根据 `mode`（realtime / history）渲染不同 X 轴刻度
- `SectorRankList`：固定在图表右侧的排名列表，支持跟随 Hover 动态排序
- `ThemeProvider`：通过 React Context + CSS Variables 管理明暗主题
- `SectorManager`：板块自定义管理（增删改、配色分配）
- `MockDataService`：生成 Mock 数据，支持 45 天历史与当日 5 分钟粒度数据
- `LivePlayer`：当日实时动态推进控制器（播放/暂停/重播/调速）

### 5.2 VS Code 扩展 (VisX) 版本

| 选型 | 说明 |
|------|------|
| VS Code Webview API | 扩展面板承载 |
| React 19 + TypeScript | Webview 内框架（与 H5 共享核心组件） |
| VisX | 与 H5 完全一致 |

**架构**
```
extension/
├── src/
│   ├── extension.ts          # 激活扩展，注册 TreeView / Panel
│   ├── panel/
│   │   └── FundFlowPanel.ts  # 管理 Webview 生命周期与消息通信
│   └── commands/
│       └── openFundFlow.ts   # 命令：打开主力资金流向面板
├── webview/
│   ├── src/                  # 与 H5 共享的 React 组件
│   │   ├── App.tsx
│   │   ├── components/       # FundFlowChart, SectorRankList, ThemeToggle
│   │   └── hooks/            # useMockData, useTheme
│   └── index.html
```

**双形态支持**
- **Sidebar (侧边栏)**：注册 `fundFlowSidebar` ViewContainer，适合常驻监控
- **Panel (编辑器区域)**：通过命令面板 / 快捷键打开 `FundFlowPanel`，适合沉浸式分析

**通信机制**
- 扩展 → Webview：`postMessage` 推送实时数据与主题状态
- Webview → 扩展：`postMessage` 请求主题持久化（写入 `globalState`）

### 5.3 后端 API 设计 (Node.js + Express)

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/sectors` | GET | 获取板块列表 |
| `/api/sectors` | POST/DELETE | 增删板块 |
| `/api/intraday` | GET | 获取当日实时数据（?date=YYYY-MM-DD） |
| `/api/historical` | GET | 获取历史数据（?days=45） |
| `/ws/fundflow` | WebSocket | 实时推送盘中数据（后续接入真实源时启用） |

**数据层抽象**
- `IDataProvider` 接口定义统一数据规范
- `MockDataProvider`：开发演示用
- `AkShareProvider` / `TushareProvider` / `EastMoneyProvider`：真实数据源实现（可按需接入）

---

## 6. 文件目录规划

```
d:\vsix
├── PRD.md
├── backend/                  # Node.js + Express 后端
│   ├── src/
│   │   ├── server.ts
│   │   ├── routes/
│   │   │   ├── sectors.ts
│   │   │   ├── intraday.ts
│   │   │   └── historical.ts
│   │   ├── providers/
│   │   │   ├── IDataProvider.ts
│   │   │   └── MockDataProvider.ts
│   │   └── lib/
│   │       └── mockGenerator.ts
│   ├── package.json
│   └── tsconfig.json
├── h5/                       # H5 前端 (React + Vite + VisX)
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── FundFlowChart.tsx
│   │   │   ├── SectorRankList.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── TimeRangeTabs.tsx
│   │   │   ├── SectorManager.tsx
│   │   │   └── LivePlayer.tsx
│   │   ├── hooks/
│   │   │   ├── useFundData.ts
│   │   │   └── useTheme.ts
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── theme.css
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── visx-extension/           # VS Code 扩展
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── extension.ts
    │   ├── panel/
    │   │   └── FundFlowPanel.ts
    │   └── sidebar/
    │       └── FundFlowSidebar.ts
    └── webview/              # 构建时复制 h5/dist 内容
        └── index.html
```

---

## 7. 性能与兼容性

- **H5**：适配 iOS Safari / Chrome / Edge，最小宽度 320px。
- **VS Code**：兼容 VS Code 1.80+，Webview 使用 `asWebviewUri` 加载本地资源。
- **图表性能**：45 天 × 20 板块 ≈ 900 数据点，VisX SVG 渲染无压力；若板块数增加可考虑 Canvas 降级。
- **Mock 数据**：纯前端生成，不依赖外部网络，首屏加载 < 200ms。

---

## 8. 真实数据源推荐（后续接入）

| 数据源 | 类型 | 优缺点 | 适用场景 |
|--------|------|--------|----------|
| **AkShare** | Python 开源库 | 免费、覆盖广、含板块资金流向；需 Python 后端 | 个人/研究，快速原型 |
| **Tushare** | Python SDK | 数据质量高、接口规范；部分高级数据需积分/付费 | 生产环境、量化策略 |
| **东方财富** | 非官方 API | 实时性好、免费；接口不稳定，需逆向/爬虫维护 | 实时行情展示 |
| **Sina 财经** | 非官方 API | 简单、直接返回 JSONP；数据维度较少 | 轻量实时数据 |
| **同花顺 iFinD** | 付费终端 | 数据最全、机构级；费用较高 | 专业投研、机构部署 |

**建议接入路径**：
1. 初期：使用内置 `MockDataProvider` 完成前后端联调与 UI 打磨
2. 中期：接入 **AkShare** 搭建 Python 数据采集服务，定时写入数据库
3. 后期：迁移至 **Tushare Pro** 或 **同花顺 iFinD** 保证数据稳定性

---

## 9. 已确认需求（v1.1 更新）

1. ✅ **板块自定义**：支持用户增删板块，系统自动分配配色，持久化到 localStorage / 后端
2. ✅ **动态推进**：当日实时模式带播放/暂停/重播/调速，模拟 09:30 → 15:00 盘中走势
3. ✅ **双面板形态**：VS Code 扩展同时支持 Sidebar + Panel 两种打开方式
4. ✅ **后端服务**：Node.js + Express 提供 REST API，预留真实数据切换能力
5. ✅ **基础版优先**：首期聚焦核心可视化，不下钻个股，不导出图片

---

*文档版本：v1.1*  
*日期：2026-07-14*
