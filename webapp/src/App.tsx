import { useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from './store/useSettings';
import { useRouter } from './router/useRouter';
import HomePage, { TABS, TabId } from './pages/HomePage';
import StockDetailPage from './pages/StockDetailPage';
import AIChatPage from './pages/AIChatPage';
import SettingsPage from './pages/SettingsPage';
import AIModelEditorPage from './pages/AIModelEditorPage';
import ReportPage from './pages/ReportPage';
import { isAStockTradingHours } from '../local-shared/constants';
import { WatchEntry } from '../local-shared/types';
import { api } from './api/client';

const BOTTOM_NAV = [
  { to: '/', label: '行情', icon: 'chart' },
  { to: '/ai', label: 'AI', icon: 'ai' },
  { to: '/settings', label: '我的', icon: 'user' },
];

// ===== 内联 SVG 图标（不依赖外部库，尺寸 20/20，stroke=currentColor）=====
const IconNavChart = (p: any) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3 3v18h18" />
    <path d="M7 15l4-6 3 4 5-8" />
  </svg>
);
const IconNavAI = (p: any) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 2l1.8 4.6L18 8.4l-4.2 1.8L12 15l-1.8-4.8L6 8.4l4.2-1.8L12 2z" />
    <path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z" />
    <circle cx="19" cy="6" r="1.5" />
  </svg>
);
const IconNavUser = (p: any) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="8.5" r="4" />
    <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
  </svg>
);
const NAV_ICON: Record<string, (p: any) => JSX.Element> = {
  chart: IconNavChart, ai: IconNavAI, user: IconNavUser,
};

// ===== 内联 SVG 图标（不依赖外部库，尺寸 20/20，stroke=currentColor）=====
const IconSettings = (p: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);
const IconSparkle = (p: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 3l1.9 5.2L19 10l-5.1 1.8L12 17l-1.9-5.2L5 10l5.1-1.8L12 3z" />
    <path d="M19 16l.9 2.3L22 19l-2.1.7L19 22l-.9-2.3L16 19l2.1-.7L19 16z" />
  </svg>
);
const IconBack = (p: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

// 品牌 Logo（SVG：红/绿/黄三色 K 线柱）
const BrandLogo = ({ size = 36 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ flexShrink: 0 }}>
    <defs>
      <linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#e8b339" stopOpacity="0.95" />
        <stop offset="50%" stopColor="#ff4d4f" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#23c343" stopOpacity="0.75" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#bg-grad)" />
    <rect x="10" y="20" width="4" height="12" rx="1.5" fill="#fff" opacity="0.95" />
    <rect x="18" y="12" width="4" height="20" rx="1.5" fill="#fff" opacity="0.95" />
    <rect x="26" y="8" width="4" height="24" rx="1.5" fill="#fff" opacity="0.95" />
    <path d="M8 28 L14 16 L20 22 L26 10 L32 18"
      stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
  </svg>
);

// ===== 迷你行情条（替代 VS Code StatusBar）：三大指数 + 自选股轮播 =====
const IDX_NAMES = ['上证指数', '深证成指', '创业板指'];
function MiniTickerBar({ navigate, onAskAI }: { navigate: (to: string) => void; onAskAI: () => void }) {
  const { settings, watchlist } = useSettings();
  const [indices, setIndices] = useState<any[]>([]);
  const [flowTop, setFlowTop] = useState<any[]>([]);
  const [watch, setWatch] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const fetching = useRef(false);
  const iSlide = useRef(0);
  const wSlide = useRef(0);

  const refresh = useMemo(() => async () => {
    if (fetching.current) return; fetching.current = true;
    try {
      const ov = await api.marketOverview();
      const arr: any[] = ov?.data?.diff || [];
      setIndices(IDX_NAMES.map((n) => arr.find((d: any) => d.f14 === n)).filter(Boolean));
      const f = await api.stockFlowRank(8);
      setFlowTop((f?.data?.diff || []).slice(0, 8));
    } finally { fetching.current = false; }
  }, []);

  const refreshWatch = useMemo(() => async (listIn: WatchEntry[]) => {
    if (!listIn.length) { setWatch([]); return; }
    const codes = listIn.map((x) => x.code).filter(Boolean).slice(0, 30);
    try {
      const r = await api.marketRealtimeBatch(codes);
      setWatch((r?.data?.diff || []).slice(0, 30));
    } catch (_) { setWatch([]); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { refreshWatch(watchlist); }, [refreshWatch, watchlist]);

  useEffect(() => {
    const ms = settings.tickerMs != null && settings.tickerMs > 0 ? settings.tickerMs : 5000;
    const t = setInterval(refresh, ms);
    return () => clearInterval(t);
  }, [refresh, settings.tickerMs]);

  useEffect(() => {
    const ms = settings.tickerMs != null && settings.tickerMs > 0 ? settings.tickerMs : 5000;
    const t = setInterval(() => refreshWatch(watchlist), ms);
    return () => clearInterval(t);
  }, [refreshWatch, settings.tickerMs, watchlist]);

  // 自动滚动
  useEffect(() => {
    let cancelled = false;
    const loop = () => {
      if (cancelled) return;
      iSlide.current++; wSlide.current++;
      const bar = document.querySelector<HTMLElement>('.mini-ticker');
      if (bar) {
        const indWrap = bar.querySelector<HTMLElement>('.mt-indices .mt-row');
        if (indWrap) indWrap.scrollLeft = (iSlide.current * 60) % Math.max(1, indWrap.scrollWidth - indWrap.clientWidth);
        const wWrap = bar.querySelector<HTMLElement>('.mt-watch .mt-row');
        if (wWrap) wWrap.scrollLeft = (wSlide.current * 60) % Math.max(1, wWrap.scrollWidth - wWrap.clientWidth);
      }
      setTimeout(loop, 3000);
    };
    const tid = setTimeout(loop, 3000);
    return () => { cancelled = true; clearTimeout(tid); };
  }, []);

  const showWatch = settings.statusBarStock !== false;

  return (
    <div className="mini-ticker" aria-label="迷你行情条">
      <div className="mt-indices">
        <div className="mt-title">大盘</div>
        <div className="mt-row">
          {indices.map((d: any, i: number) => {
            const pct = d.f3 || 0; const up = pct >= 0;
            return (
              <div key={i} className={'mt-item ' + (up ? 'up' : 'down')} title={`${d.f14} ${pct.toFixed(2)}%`}>
                <b>{d.f14}</b><span>{fmt(d.f2, 2)}</span><em>{(up ? '+' : '') + pct.toFixed(2)}%</em>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-flow">
        <div className="mt-title">主力TOP</div>
        <div className="mt-row">
          {flowTop.map((d: any, i: number) => (
            <button
              key={i} className={'mt-item ' + ((d.f3 || 0) >= 0 ? 'up' : 'down')}
              onClick={() => navigate(`/stock/${d.f12}`)}
              title={`${d.f14} - 主力流入 ${fmt(d.f62)}亿`}
            >
              <b>{d.f14}</b><em>{((d.f3 || 0) >= 0 ? '+' : '') + (d.f3 || 0).toFixed(2)}%</em>
              <i>{(Number(d.f62 || 0) / 1e8).toFixed(0)}亿</i>
            </button>
          ))}
        </div>
      </div>

      {showWatch && (
        <div className="mt-watch">
          <div className="mt-title">自选</div>
          <div className="mt-row">
            {watch.map((d: any, i: number) => (
              <button
                key={i} className={'mt-item ' + ((d.f3 || 0) >= 0 ? 'up' : 'down')}
                onClick={() => navigate(`/stock/${d.f12}`)}
                title={`${d.f14} ${(d.f3 || 0).toFixed(2)}%`}
              >
                <b>{d.f14}</b><span>{fmt(d.f2, 2)}</span><em>{((d.f3 || 0) >= 0 ? '+' : '') + (d.f3 || 0).toFixed(2)}%</em>
              </button>
            ))}
            {watch.length === 0 && (
              <button className="mt-item hint" onClick={() => setShowSearch(true)}>+ 添加自选股</button>
            )}
          </div>
        </div>
      )}

      <div className="mt-actions">
        <button className="mt-btn" onClick={() => navigate('/report')} title="生成选股报告">📊 选股报告</button>
        <button className="mt-btn" onClick={() => setShowSearch(true)} title="搜索股票">🔍 搜索</button>
        <button className="mt-btn" onClick={onAskAI} title="AI 助手">✨ AI</button>
      </div>

      {showSearch && <SearchDialog onClose={() => setShowSearch(false)} onPick={(code) => { setShowSearch(false); navigate(`/stock/${code}`); }} />}
    </div>
  );
}
function fmt(v: any, d = 1) { const n = Number(v); return isNaN(n) ? '-' : n.toFixed(d); }

// ===== 搜索对话框（东方财富 /api/search）=====
function SearchDialog({ onClose, onPick }: { onClose: () => void; onPick: (code: string) => void }) {
  const { settings, addWatch } = useSettings();
  const [q, setQ] = useState('');
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const kw = q.trim();
    if (!kw) { setList([]); return; }
    let alive = true;
    setLoading(true);
    api.search(kw).then((r) => { if (alive) setList((r?.data?.list || []).slice(0, 12)); })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [q]);

  const watchSet = new Set<string>((settings.watchlist || []).map((w: any) => String(w.code)));

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog search-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head"><b>搜索股票 / 指数</b><button className="icon-btn" onClick={onClose} aria-label="关闭">✕</button></div>
        <div className="dialog-body">
          <div className="search-input-wrap">
            <input ref={inputRef} className="search-input" placeholder="输入代码/拼音/中文名称"
              value={q} onChange={(e) => setQ(e.target.value)} />
            {loading && <span className="search-loading" />}
          </div>
          <div className="search-list">
            {list.map((d: any, i: number) => {
              const inWatch = watchSet.has(String(d.code));
              return (
                <div key={i} className="search-row" onClick={() => onPick(d.code)}>
                  <div>
                    <b>{d.name}</b> <span className="cc">{d.display_code || d.code}</span>
                    <span className="tag">{d.market || ''}{d.type ? ' · ' + d.type : ''}</span>
                  </div>
                  <div className="search-actions" onClick={(e) => e.stopPropagation()}>
                    {!inWatch
                      ? <button className="mt-btn" onClick={() => { addWatch({ code: String(d.code), name: d.name || String(d.code) }); onPick(d.code); }}>+ 自选</button>
                      : <button className="mt-btn" onClick={() => onPick(d.code)}>查看 →</button>}
                  </div>
                </div>
              );
            })}
            {q && !list.length && !loading && <div className="nodata">未找到匹配的股票</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Webhook 推送（企业微信/钉钉/飞书）
async function pushWebhook(plat: 'wecom' | 'dingtalk' | 'feishu', url: string, text: string) {
  const body =
    plat === 'wecom'
      ? JSON.stringify({ msgtype: 'text', text: { content: text } })
      : plat === 'dingtalk'
      ? JSON.stringify({ msgtype: 'text', text: { content: text } })
      : JSON.stringify({ msg_type: 'text', content: { text } });
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export default function App() {
  const { path, navigate } = useRouter();
  const { settings } = useSettings();
  const [now, setNow] = useState(() => new Date());
  // 行情首页当前 tab（桌面端用左侧栏控制，小屏仍用横滚 tab-bar 内部控制）
  const [homeTab, setHomeTab] = useState<TabId>('market_overview');

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  // 市场状态：交易中 / 休市
  const marketStatus = useMemo(() => {
    const trading = isAStockTradingHours(now);
    return trading ? { label: '交易中', dot: 'open' } : { label: '休市', dot: 'close' };
  }, [now]);

  const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const md = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

  // ===== 提醒通知：全局轮询 + 浏览器 Notification =====
  const { watchlist } = useSettings();
  const firedKeyRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!settings.remindSwitch || !watchlist.length) { firedKeyRef.current.clear(); return; }
    let alive = true; let timer: any = null;
    const tick = async () => {
      if (!alive) return;
      const entries: Array<{ code: string; cfg: any }> = [];
      for (const w of watchlist) {
        const c = String(w.code || ''); if (!c) continue;
        const cfg: any = settings.stocksRemind?.[c]; if (!cfg || cfg.enabled === false) continue;
        if (cfg.cond === 'chg' && (Number(cfg.threshold) || 0) === 0) continue;
        if ((cfg.cond === 'high' || cfg.cond === 'low') && (Number(cfg.threshold) || 0) === 0) continue;
        entries.push({ code: c, cfg });
      }
      if (!entries.length) return;
      const codes = entries.map((e) => e.code);
      try {
        const r = await api.quote(codes);
        const diff: any[] = r?.data?.diff || [];
        const byCode = new Map<string, any>();
        for (const d of diff) {
          const clean = String(d.f12 || '').toLowerCase();
          const mkt = String(d.f124 || '').toUpperCase(); // SH/SZ/BJ
          byCode.set(clean, d);
          // 同时存带市场前缀的版本（自选股 code 可能带 sh/sz）
          if (mkt === 'SH' || mkt === 'SZ' || mkt === 'BJ') {
            byCode.set(`${mkt.toLowerCase()}${clean}`, d);
          } else {
            // 没 f124 时按代码规则补前缀
            const p = /^(60|68|90|11|13|50|56|51|58)/.test(clean) ? 'sh'
              : /^(00|30|20|12|15|16|18|159)/.test(clean) ? 'sz'
              : /^(43|83|87|92|88)/.test(clean) ? 'bj' : '';
            if (p) byCode.set(`${p}${clean}`, d);
          }
        }
        for (const { code, cfg } of entries) {
          const cl = code.toLowerCase();
          const row = byCode.get(cl) || byCode.get(cl.replace(/^(sh|sz|bj)/i, ''));
          if (!row) continue;
          const price = Number(row.f2 || 0); const chg = Number(row.f3 || 0); const name = row.f14 || code;
          const keyBase = `${code}:${cfg.cond}:${cfg.threshold}`;
          let fired = false; let msg = '';
          if (cfg.cond === 'chg') {
            const t = Math.abs(Number(cfg.threshold)); if (Math.abs(chg) >= t) { fired = true; msg = `${name} 当日涨跌幅 ${(chg >= 0 ? '+' : '') + chg.toFixed(2)}% 达到阈值 ±${t}%`; }
          } else if (cfg.cond === 'high') {
            const t = Number(cfg.threshold); if (price && price >= t) { fired = true; msg = `${name} 最新价 ${price.toFixed(2)} 突破高价阈值 ≥ ${t}`; }
          } else if (cfg.cond === 'low') {
            const t = Number(cfg.threshold); if (price && price <= t) { fired = true; msg = `${name} 最新价 ${price.toFixed(2)} 跌破低价阈值 ≤ ${t}`; }
          }
          const key = `${keyBase}:${msg.replace(/[^0-9]/g, '').slice(-8)}:${new Date().toDateString()}`;
          if (fired && !firedKeyRef.current.has(key)) {
            firedKeyRef.current.add(key);
            try {
              if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                try { new Notification('StockExt 提醒', { body: msg, tag: key }); } catch { /* empty */ }
              }
              if (settings.voiceBroadcast && 'speechSynthesis' in window) {
                try {
                  const u = new SpeechSynthesisUtterance(msg);
                  u.lang = 'zh-CN'; u.rate = 1.05;
                  const preset = settings.voicePreset;
                  if (preset && preset !== 'system') {
                    const voices = window.speechSynthesis.getVoices();
                    const v = voices.find((x) => x.name?.includes(preset.replace('Neural', '')));
                    if (v) u.voice = v;
                  }
                  window.speechSynthesis.speak(u);
                } catch { /* empty */ }
              }
              // Webhook 推送
              const wh = settings.webhook;
              if (wh) {
                for (const plat of ['wecom', 'dingtalk', 'feishu'] as const) {
                  const c = wh[plat];
                  if (c?.enabled && c.url) {
                    pushWebhook(plat, c.url, msg).catch(() => { /* empty */ });
                  }
                }
              }
              console.log('[Remind]', msg);
            } catch { /* empty */ }
          }
        }
      } catch { /* ignore */ }
    };
    tick();
    timer = setInterval(tick, Math.max(5000, settings.pollIntervalMs || 5000));
    return () => { alive = false; if (timer) clearInterval(timer); firedKeyRef.current.clear(); };
  }, [settings.remindSwitch, settings.stocksRemind, settings.voiceBroadcast, settings.voicePreset, settings.webhook, settings.pollIntervalMs, watchlist]);

  const inDetail = path.startsWith('/stock/') || path.startsWith('/settings/model');
  const isHome = path === '/' || path.startsWith('/stock/');
  const isAI = path === '/ai';
  const isSettings = path === '/settings' || path.startsWith('/settings/model');
  const isReport = path === '/report';
  const showSidebar = path === '/'; // 只有首页才显示左侧 12 Tab 侧边栏
  const showBack = inDetail && !isSettings;

  return (
    <div className="app-shell">
      {/* 顶部栏（删去中间的"行情中心"大标题，紧凑化） */}
      <div className="topbar topbar-compact">
        <div className="topbar-left">
          {showBack ? (
            <button className="icon-btn" aria-label="返回" onClick={() => navigate('/')}>
              <IconBack />
            </button>
          ) : (
            <BrandLogo size={34} />
          )}
          <div className="topbar-subline">
            {path === '/' && <span className={'market-dot ' + marketStatus.dot} />}
            <span className="t-date">{md(now)}</span>
            <span className="t-time">{hhmm(now)}</span>
            {path === '/' && <span className="t-status">{marketStatus.label}</span>}
          </div>
        </div>
        <div className="topbar-right">
          {(path === '/' || isReport) && (
            <button
              className="icon-btn"
              aria-label="AI 助手"
              title="向 AI 提问市场走势"
              onClick={() => navigate('/ai')}
            >
              <IconSparkle />
            </button>
          )}
          {(path === '/' || isReport) && (
            <button
              className="icon-btn"
              aria-label="选股报告"
              title="生成六维选股报告"
              onClick={() => navigate('/report')}
            >
              📊
            </button>
          )}
        </div>
      </div>

      {/* 主体：首页 = 左侧导航 + 主内容；其他页面 = 只有主内容 */}
      <div className={'main-area' + (showSidebar ? ' with-sidebar' : '')}>
        {showSidebar && (
          <aside className="home-sidebar" aria-label="行情分类">
            <div className="sb-list">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  title={t.tip}
                  className={'sb-item' + (homeTab === t.id ? ' active' : '')}
                  onClick={() => setHomeTab(t.id)}
                >
                  <span className="sb-ic">{t.icon}</span>
                  <span className="sb-lb">{t.label}</span>
                </button>
              ))}
            </div>
            <div className="sb-footer">
              <button
                className="sb-footer-btn"
                title="前往我的设置（AI 模型配置 / 主题 / 轮询）"
                onClick={() => navigate('/settings')}
              >
                <span className="sb-ic">👤</span>
                <span className="sb-lb">我的 / 设置</span>
                <span className="sb-chevron">›</span>
              </button>
            </div>
          </aside>
        )}

        <div className="main-inner">
          {path === '/' && (
            <HomePage initialTab={homeTab} initialOnNavigate={navigate} />
          )}
          {path.startsWith('/stock/') && (
            <StockDetailPage code={decodeURIComponent(path.split('/stock/')[1] || '')} />
          )}
          {path === '/report' && <ReportPage />}
          {path === '/ai' && <AIChatPage />}
          {path === '/settings' && <SettingsPage />}
          {path.startsWith('/settings/model') && (
            <AIModelEditorPage modelId={decodeURIComponent(path.split('/settings/model/')[1] || '') || null} />
          )}
        </div>
      </div>

      {/* 底部 TabBar：详情页隐藏；其他一级页面（首页/AI/我的设置/报告）显示 */}
      {inDetail && !isSettings ? null : (
        <div className="bottom-nav" role="tablist" aria-label="主导航">
          {BOTTOM_NAV.map((n) => {
            const Ic = NAV_ICON[n.icon];
            const active =
              (n.to === '/' && isHome) || (n.to === '/ai' && isAI) || (n.to === '/settings' && isSettings);
            return (
              <button
                key={n.to}
                className={active ? 'active' : ''}
                role="tab"
                aria-selected={active}
                onClick={() => navigate(n.to)}
              >
                <span className="nav-ic"><Ic /></span>
                <span>{n.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
