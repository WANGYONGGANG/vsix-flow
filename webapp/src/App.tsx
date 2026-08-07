import { useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from './store/useSettings';
import { useRouter } from './router/useRouter';
import HomePage, { TABS, TabId, TabIcon } from './pages/HomePage';
import StockDetailPage from './pages/StockDetailPage';
import AIChatPage from './pages/AIChatPage';
import SettingsPage from './pages/SettingsPage';
import AIModelEditorPage from './pages/AIModelEditorPage';
import ReportPage from './pages/ReportPage';
import { isAStockTradingHours } from '../local-shared/constants';
import { api } from './api/client';

const BOTTOM_NAV = [
  { to: '/', label: '行情', icon: 'chart' },
  { to: '/ai', label: 'AI', icon: 'ai' },
  { to: '/settings', label: '我的', icon: 'user' },
];

// ===== 新颖 SVG 图标 — 双层结构 + 微动效（激活态使用红渐变 + 高光描边）=====
// 行情：上涨 K 线 + 心跳折线（双层）
const IconNavChart = ({ active }: { active?: boolean }) => {
  const c = active ? '#e63946' : '#9aa0a6';
  const c2 = active ? '#ff7a18' : '#bcc1c6';
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      {active && (
        <>
          <defs>
            <linearGradient id="nav-chart-g" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#ff7a18" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#e63946" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="24" height="24" rx="8" fill="url(#nav-chart-g)" />
        </>
      )}
      {/* 心跳折线 */}
      <path d="M3 16 H8 L10 11 L13 19 L15 14 H17 L19 9 L22 16 H25"
        stroke={c2} strokeWidth="1.6" fill="none"
        strokeLinecap="round" strokeLinejoin="round" opacity={active ? 0.85 : 0.7} />
      {/* K 线柱（前景） */}
      <rect x="6.5" y="13" width="3" height="9" rx="1" fill={c} />
      <rect x="12" y="9" width="3" height="13" rx="1" fill={c} />
      <rect x="17.5" y="6" width="3" height="16" rx="1" fill={c} />
      {/* 上影/下影细线 */}
      <line x1="8" y1="11" x2="8" y2="13" stroke={c} strokeWidth="0.8" strokeLinecap="round" />
      <line x1="13.5" y1="7" x2="13.5" y2="9" stroke={c} strokeWidth="0.8" strokeLinecap="round" />
      <line x1="19" y1="4" x2="19" y2="6" stroke={c} strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
};
// 选股报告：六维雷达（六边形 + 数据点）
const IconNavReport = ({ active }: { active?: boolean }) => {
  const c = active ? '#e63946' : '#9aa0a6';
  const c2 = active ? '#ff7a18' : '#bcc1c6';
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      {active && <rect x="2" y="2" width="24" height="24" rx="8" fill="rgba(230,57,70,.08)" />}
      {/* 外六边形 */}
      <path d="M14 4 L23 9 L23 19 L14 24 L5 19 L5 9 Z"
        stroke={c2} strokeWidth="1.2" fill="none" opacity={active ? 0.5 : 0.6}
        strokeLinejoin="round" />
      {/* 中六边形 */}
      <path d="M14 9 L19 11.5 L19 17.5 L14 20 L9 17.5 L9 11.5 Z"
        stroke={c} strokeWidth="1.2" fill={active ? 'rgba(230,57,70,.06)' : 'none'}
        strokeLinejoin="round" />
      {/* 数据多边形 */}
      <path d="M14 7 L21 12 L18 19 L10 19 L7 12 Z"
        fill={active ? 'rgba(230,57,70,.18)' : 'rgba(150,150,150,.1)'}
        stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
      {/* 数据点 */}
      <circle cx="14" cy="7" r="1.4" fill={c} />
      <circle cx="21" cy="12" r="1.4" fill={c} />
      <circle cx="18" cy="19" r="1.4" fill={c} />
      <circle cx="10" cy="19" r="1.4" fill={c} />
      <circle cx="7" cy="12" r="1.4" fill={c} />
    </svg>
  );
};
// AI：脑波 + 火花（神经节点）
const IconNavAI = ({ active }: { active?: boolean }) => {
  const c = active ? '#e63946' : '#9aa0a6';
  const c2 = active ? '#ff7a18' : '#bcc1c6';
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      {active && <rect x="2" y="2" width="24" height="24" rx="8" fill="rgba(230,57,70,.08)" />}
      {/* 神经网络节点 */}
      <circle cx="6" cy="9" r="1.6" fill={c2} />
      <circle cx="6" cy="19" r="1.6" fill={c2} />
      <circle cx="14" cy="14" r="2.2" fill={c} />
      <circle cx="22" cy="9" r="1.6" fill={c2} />
      <circle cx="22" cy="19" r="1.6" fill={c2} />
      {/* 连接线 */}
      <line x1="7.5" y1="9.5" x2="12" y2="13" stroke={c} strokeWidth="1.1" strokeLinecap="round" opacity={active ? 0.85 : 0.6} />
      <line x1="7.5" y1="18.5" x2="12" y2="15" stroke={c} strokeWidth="1.1" strokeLinecap="round" opacity={active ? 0.85 : 0.6} />
      <line x1="16" y1="13" x2="20.5" y2="9.5" stroke={c} strokeWidth="1.1" strokeLinecap="round" opacity={active ? 0.85 : 0.6} />
      <line x1="16" y1="15" x2="20.5" y2="18.5" stroke={c} strokeWidth="1.1" strokeLinecap="round" opacity={active ? 0.85 : 0.6} />
      {/* 中心高光 */}
      <circle cx="14" cy="14" r="0.8" fill="#fff" opacity="0.8" />
      {/* 火花 */}
      <path d="M22 4 L23 6 L25 7 L23 8 L22 10 L21 8 L19 7 L21 6 Z"
        fill={c} opacity={active ? 1 : 0.5} />
    </svg>
  );
};
// 我的：用户头像 + 盾牌勾选（双层）
const IconNavUser = ({ active }: { active?: boolean }) => {
  const c = active ? '#e63946' : '#9aa0a6';
  const c2 = active ? '#ff7a18' : '#bcc1c6';
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      {active && <rect x="2" y="2" width="24" height="24" rx="8" fill="rgba(230,57,70,.08)" />}
      {/* 头像主体 */}
      <circle cx="14" cy="11" r="4.5" fill={c} />
      <circle cx="14" cy="11" r="2" fill="#fff" opacity="0.6" />
      <path d="M5 24 C5 18 9 15 14 15 C19 15 23 18 23 24"
        fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
      {/* 盾牌小角标 */}
      <path d="M21 4 L23.5 5 L23.5 8 C23.5 9.5 22.5 10.5 21 11 C19.5 10.5 18.5 9.5 18.5 8 L18.5 5 Z"
        fill={c2} stroke={c} strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M20 7.5 L21 8.5 L22.5 6.5" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
};
const NAV_ICON: Record<string, (p: any) => JSX.Element> = {
  chart: IconNavChart, report: IconNavReport, ai: IconNavAI, user: IconNavUser,
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
const IconSearch = (p: any) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
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
  const [showSearch, setShowSearch] = useState(false);

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
  const isHome = path === '/';
  const isAI = path === '/ai';
  const isSettings = path === '/settings' || path.startsWith('/settings/model');
  const isReport = path === '/report';
  const showSidebar = path === '/'; // 只有首页才显示左侧 12 Tab 侧边栏
  const showBack = inDetail && !isSettings;

  const goBack = () => {
    let from = '/';
    try { from = sessionStorage.getItem('stockDetailFrom') || '/'; } catch { /* ignore */ }
    navigate(from);
  };

  // 分享功能
  const handleShare = async () => {
    const shareData = {
      title: 'StockExt 行情中心',
      text: 'A股行情追踪 - 实时行情/自选/板块/龙虎/快讯',
      url: window.location.origin,
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // 用户取消分享
        if ((err as Error).name !== 'AbortError') {
          console.error('分享失败:', err);
        }
      }
    } else {
      // 降级：复制链接到剪贴板
      try {
        await navigator.clipboard.writeText(window.location.origin);
        alert('链接已复制到剪贴板');
      } catch {
        prompt('复制链接分享给朋友:', window.location.origin);
      }
    }
  };

  return (
    <div className="app-shell">
      {/* 顶部栏 — 东财红底，紧凑：左 logo+时间 / 右 搜索+AI */}
      <div className="topbar topbar-compact">
        <div className="topbar-left">
          {showBack ? (
            <button className="icon-btn" aria-label="返回" onClick={goBack} title="返回">
              <IconBack />
            </button>
          ) : (
            <BrandLogo size={32} />
          )}
          <div className="topbar-subline">
            {isHome && <span className={'market-dot ' + marketStatus.dot} />}
            <span className="t-date">{md(now)}</span>
            <span className="t-time">{hhmm(now)}</span>
            {isHome && <span className="t-status">{marketStatus.label}</span>}
            {!isHome && !showBack && (
              <span className="t-title">
                {isAI ? 'AI 助手' : isReport ? '选股报告' : isSettings ? '我的' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="topbar-right">
          {(isHome || isReport) && (
            <button
              className="icon-btn"
              aria-label="搜索股票"
              title="搜索股票 / 指数"
              onClick={() => setShowSearch(true)}
            >
              <IconSearch />
            </button>
          )}
          {isHome && (
            <button
              className="icon-btn"
              aria-label="分享"
              title="分享给朋友"
              onClick={handleShare}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
              </svg>
            </button>
          )}
          {isHome && (
            <button
              className="icon-btn"
              aria-label="选股报告"
              title="选股报告"
              onClick={() => navigate('/report')}
            >
              <IconNavReport active={false} />
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
                  <span className="sb-ic"><TabIcon name={t.icon} active={homeTab === t.id} /></span>
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
                <span className="sb-ic"><IconNavUser active={false} /></span>
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

      {/* 底部 TabBar：详情页隐藏；其他一级页面（首页/选股/AI/我的）显示 */}
      {inDetail ? null : (
        <div className="bottom-nav" role="tablist" aria-label="主导航">
          {BOTTOM_NAV.map((n) => {
            const Ic = NAV_ICON[n.icon];
            const active =
              (n.to === '/' && isHome) ||
              (n.to === '/ai' && isAI) ||
              (n.to === '/settings' && isSettings) ||
              (n.to === '/report' && isReport);
            return (
              <button
                key={n.to}
                className={active ? 'active' : ''}
                role="tab"
                aria-selected={active}
                onClick={() => navigate(n.to)}
              >
                <span className="nav-ic"><Ic active={active} /></span>
                <span>{n.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {showSearch && (
        <SearchDialog
          onClose={() => setShowSearch(false)}
          onPick={(code) => { setShowSearch(false); navigate(`/stock/${code}`); }}
        />
      )}
    </div>
  );
}
