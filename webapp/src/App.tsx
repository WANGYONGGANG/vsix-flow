import { useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from './store/useSettings';
import { useRouter } from './router/useRouter';
import HomePage from './pages/HomePage';
import StockDetailPage from './pages/StockDetailPage';
import AIChatPage from './pages/AIChatPage';
import SettingsPage from './pages/SettingsPage';
import AIModelEditorPage from './pages/AIModelEditorPage';
import ReportPage from './pages/ReportPage';
import FlowPage from './pages/FlowPage';
import LhbPage from './pages/LhbPage';
import ZtPage from './pages/ZtPage';
import ChangesPage from './pages/ChangesPage';
import NewsDetailPage from './pages/NewsDetailPage';
import { isAStockTradingHours } from '../local-shared/constants';
import { api } from './api/client';

const BOTTOM_NAV = [
  { to: '/', label: '行情', icon: 'chart' },
  { to: '/report', label: '选股', icon: 'report' },
  { to: '/ai', label: 'AI', icon: 'ai' },
  { to: '/settings', label: '我的', icon: 'user' },
];

// ===== 新颖 SVG 图标 =====
const IconNavChart = ({ active }: { active?: boolean }) => {
  const c = active ? '#ff4d4f' : '#6b7280';
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      {active && <rect x="2" y="2" width="24" height="24" rx="8" fill="rgba(255,77,79,.1)" />}
      <path d="M3 16 H8 L10 11 L13 19 L15 14 H17 L19 9 L22 16 H25"
        stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="6.5" y="13" width="3" height="9" rx="1" fill={c} />
      <rect x="12" y="9" width="3" height="13" rx="1" fill={c} />
      <rect x="17.5" y="6" width="3" height="16" rx="1" fill={c} />
    </svg>
  );
};
const IconNavReport = ({ active }: { active?: boolean }) => {
  const c = active ? '#ff4d4f' : '#6b7280';
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      {active && <rect x="2" y="2" width="24" height="24" rx="8" fill="rgba(255,77,79,.1)" />}
      <path d="M14 4 L23 9 L23 19 L14 24 L5 19 L5 9 Z" stroke={c} strokeWidth="1.2" fill="none" />
      <path d="M14 9 L19 11.5 L19 17.5 L14 20 L9 17.5 L9 11.5 Z" stroke={c} strokeWidth="1.2" fill={active ? 'rgba(255,77,79,.08)' : 'none'} />
      <path d="M14 7 L21 12 L18 19 L10 19 L7 12 Z" fill={active ? 'rgba(255,77,79,.18)' : 'rgba(150,150,150,.1)'} stroke={c} strokeWidth="1.6" />
    </svg>
  );
};
const IconNavAI = ({ active }: { active?: boolean }) => {
  const c = active ? '#ff4d4f' : '#6b7280';
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      {active && <rect x="2" y="2" width="24" height="24" rx="8" fill="rgba(255,77,79,.1)" />}
      <circle cx="6" cy="9" r="1.6" fill={c} />
      <circle cx="6" cy="19" r="1.6" fill={c} />
      <circle cx="14" cy="14" r="2.2" fill={c} />
      <circle cx="22" cy="9" r="1.6" fill={c} />
      <circle cx="22" cy="19" r="1.6" fill={c} />
      <line x1="7.5" y1="9.5" x2="12" y2="13" stroke={c} strokeWidth="1.1" strokeLinecap="round" />
      <line x1="7.5" y1="18.5" x2="12" y2="15" stroke={c} strokeWidth="1.1" strokeLinecap="round" />
      <line x1="16" y1="13" x2="20.5" y2="9.5" stroke={c} strokeWidth="1.1" strokeLinecap="round" />
      <line x1="16" y1="15" x2="20.5" y2="18.5" stroke={c} strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
};
const IconNavUser = ({ active }: { active?: boolean }) => {
  const c = active ? '#ff4d4f' : '#6b7280';
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
      {active && <rect x="2" y="2" width="24" height="24" rx="8" fill="rgba(255,77,79,.1)" />}
      <circle cx="14" cy="11" r="4.5" fill={c} />
      <path d="M5 24 C5 18 9 15 14 15 C19 15 23 18 23 24" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
};
const NAV_ICON: Record<string, (p: any) => JSX.Element> = {
  chart: IconNavChart, report: IconNavReport, ai: IconNavAI, user: IconNavUser,
};

const IconBack = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
const IconSearch = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
  </svg>
);
const IconSparkle = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.9 5.2L19 10l-5.1 1.8L12 17l-1.9-5.2L5 10l5.1-1.8L12 3z" />
  </svg>
);
const BrandLogo = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" style={{ flexShrink: 0 }}>
    <defs>
      <linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#e8b339" />
        <stop offset="50%" stopColor="#ff4d4f" />
        <stop offset="100%" stopColor="#23c343" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#bg-grad)" />
    <rect x="10" y="20" width="4" height="12" rx="1.5" fill="#fff" />
    <rect x="18" y="12" width="4" height="20" rx="1.5" fill="#fff" />
    <rect x="26" y="8" width="4" height="24" rx="1.5" fill="#fff" />
  </svg>
);

async function pushWebhook(plat: 'wecom' | 'dingtalk' | 'feishu', url: string, text: string) {
  const bodies: Record<string, any> = {
    wecom: { msgtype: 'text', text: { content: text } },
    dingtalk: { msgtype: 'text', text: { content: text } },
    feishu: { msg_type: 'text', content: { text } },
  };
  await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodies[plat]) });
}

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
    Promise.all([
      api.search(kw).then((r) => r?.data?.list || []),
      api.futuresSearch(kw).then((r) => r?.data?.list || []),
    ]).then(([stockList, futuresList]) => {
      if (alive) {
        const merged = [...stockList, ...futuresList].slice(0, 15);
        setList(merged);
      }
    }).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [q]);

  const watchSet = new Set<string>((settings.watchlist || []).map((w: any) => String(w.code)));

  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog search-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head"><b>搜索股票 / 指数 / 期货</b><button className="icon-btn" onClick={onClose}>✕</button></div>
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

export default function App() {
  const { path, navigate, back } = useRouter();
  const { settings, watchlist } = useSettings();
  const [now, setNow] = useState(() => new Date());
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handler = () => setShowSearch(true);
    window.addEventListener('openSearch', handler);
    return () => window.removeEventListener('openSearch', handler);
  }, []);

  const marketStatus = useMemo(() => {
    const trading = isAStockTradingHours(now);
    return trading ? { label: '交易中', dot: 'open' } : { label: '休市', dot: 'close' };
  }, [now]);

  const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const md = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

  // 提醒通知
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
          byCode.set(clean, d);
          const mkt = String(d.f124 || '').toUpperCase();
          if (mkt === 'SH' || mkt === 'SZ' || mkt === 'BJ') byCode.set(`${mkt.toLowerCase()}${clean}`, d);
          else {
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
                  const u = new SpeechSynthesisUtterance(msg); u.lang = 'zh-CN'; u.rate = 1.05;
                  const preset = settings.voicePreset;
                  if (preset && preset !== 'system') {
                    const voices = window.speechSynthesis.getVoices();
                    const v = voices.find((x) => x.name?.includes(preset.replace('Neural', '')));
                    if (v) u.voice = v;
                  }
                  window.speechSynthesis.speak(u);
                } catch { /* empty */ }
              }
              const wh = settings.webhook;
              if (wh) {
                for (const plat of ['wecom', 'dingtalk', 'feishu'] as const) {
                  const c = wh[plat];
                  if (c?.enabled && c.url) pushWebhook(plat, c.url, msg).catch(() => { /* empty */ });
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
  const isHome = path === '/' || path.startsWith('/?');
  const isAI = path === '/ai';
  const isSettings = path === '/settings' || path.startsWith('/settings/model');
  const isReport = path === '/report';
  const isFlow = path === '/flow';
  const isLhb = path === '/lhb';
  const isZt = path === '/zt';
  const isChanges = path === '/changes';
  const isAuction = path === '/auction';
  const isNews = path.startsWith('/news');
  const hideNav = inDetail || isFlow || isLhb || isZt || isChanges || isAuction || isNews;
  const showBack = (inDetail && !isSettings) || isFlow || isLhb || isZt || isChanges || isAuction || isNews;

  const goBack = () => {
    back();
  };

  const pageTitle = isHome ? ''
    : isReport ? '选股'
    : isAI ? 'AI 助手'
    : isSettings ? '我的'
    : isFlow ? '资金流向'
    : isLhb ? '龙虎榜'
    : isZt ? '涨停专题'
    : isChanges ? '盘口异动'
    : isAuction ? '集合竞价'
    : isNews ? '资讯详情'
    : '';

  return (
    <div className="app-shell">
      <div className="topbar topbar-compact">
        <div className="topbar-left">
          {showBack ? (
            <button className="icon-btn" aria-label="返回" onClick={goBack}><IconBack /></button>
          ) : (
            <BrandLogo size={30} />
          )}
          <div className="topbar-subline">
            {isHome && <span className={'market-dot ' + marketStatus.dot} />}
            {isHome && <span className="t-date">{md(now)}</span>}
            {isHome && <span className="t-time">{hhmm(now)}</span>}
            {isHome && <span className="t-status">{marketStatus.label}</span>}
            {!isHome && <span className="t-title">{pageTitle}</span>}
          </div>
        </div>
        <div className="topbar-right">
          {(isHome || inDetail) && (
            <button className="icon-btn" aria-label="搜索" onClick={() => setShowSearch(true)}><IconSearch /></button>
          )}
          {isHome && (
            <button className="icon-btn" aria-label="AI" onClick={() => navigate('/ai')}><IconSparkle /></button>
          )}
        </div>
      </div>

      <div className="main-area">
        <div className="main-inner">
          {(path === '/' || path.startsWith('/?')) && <HomePage />}
          {path.startsWith('/stock/') && <StockDetailPage code={decodeURIComponent(path.split('/stock/')[1] || '')} />}
          {path === '/report' && <ReportPage />}
          {path === '/ai' && <AIChatPage />}
          {path === '/settings' && <SettingsPage />}
          {path.startsWith('/settings/model') && (
            <AIModelEditorPage modelId={decodeURIComponent(path.split('/settings/model/')[1] || '') || null} />
          )}
          {path === '/flow' && <FlowPage />}
          {path === '/lhb' && <LhbPage />}
          {path === '/zt' && <ZtPage />}
          {path === '/changes' && <ChangesPage />}
          {path === '/auction' && <ChangesPage />}
          {path.startsWith('/news') && <NewsDetailPage />}
        </div>
      </div>

      {hideNav ? null : (
        <div className="bottom-nav" role="tablist">
          {BOTTOM_NAV.map((n) => {
            const Ic = NAV_ICON[n.icon];
            const active =
              (n.to === '/' && isHome) ||
              (n.to === '/ai' && isAI) ||
              (n.to === '/settings' && isSettings) ||
              (n.to === '/report' && isReport);
            return (
              <button key={n.to} className={active ? 'active' : ''} role="tab" aria-selected={active} onClick={() => navigate(n.to)}>
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
