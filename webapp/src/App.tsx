import { useEffect, useMemo, useState } from 'react';
import { useSettings } from './store/useSettings';
import { useRouter } from './router/useRouter';
import HomePage from './pages/HomePage';
import StockDetailPage from './pages/StockDetailPage';
import AIChatPage from './pages/AIChatPage';
import SettingsPage from './pages/SettingsPage';
import AIModelEditorPage from './pages/AIModelEditorPage';
import { isAStockTradingHours } from '../local-shared/constants';

const BOTTOM_NAV = [
  { to: '/', label: '行情', icon: '📈' },
  { to: '/ai', label: 'AI', icon: '✨' },
  { to: '/settings', label: '我的', icon: '⚙️' },
];

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

export default function App() {
  const { path, navigate } = useRouter();
  const { settings } = useSettings();
  const [now, setNow] = useState(() => new Date());

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

  const inDetail = path.startsWith('/stock/') || path.startsWith('/settings/model');
  const isHome = path === '/' || path.startsWith('/stock/');
  const isAI = path === '/ai';
  const isSettings = path === '/settings' || path.startsWith('/settings/model');

  // 顶部标题 / 副标题
  const pageTitle = (() => {
    if (path.startsWith('/stock/')) return { main: '股票详情', sub: hhmm(now) + ' · ' + marketStatus.label };
    if (path === '/') return { main: '行情中心', sub: hhmm(now) };
    if (path === '/ai') return { main: 'AI 智能助手', sub: hhmm(now) };
    if (path === '/settings') return { main: '设置', sub: hhmm(now) };
    if (path.startsWith('/settings/model')) return { main: 'AI 模型配置', sub: hhmm(now) };
    return { main: 'Stock', sub: '' };
  })();

  // 左按钮：详情页显示返回
  const showBack = inDetail && !isSettings;

  return (
    <div className="app-shell">
      {/* 顶部栏 */}
      <div className="topbar">
        <div className="topbar-left">
          {showBack ? (
            <button className="icon-btn" aria-label="返回" onClick={() => navigate('/')}>
              <IconBack />
            </button>
          ) : (
            <BrandLogo size={36} />
          )}
          <div className="topbar-title">
            <div className="t-main">{pageTitle.main}</div>
            <div className="t-sub">
              {path === '/' && (
                <span className={'market-dot ' + marketStatus.dot} />
              )}
              {pageTitle.sub}
            </div>
          </div>
        </div>
        <div className="topbar-right">
          {(path === '/' || path === '/stock/') && (
            <button className="icon-btn icon-accent" aria-label="AI 助手" onClick={() => navigate('/ai')}>
              <IconSparkle />
            </button>
          )}
          {(path === '/' || path === '/ai') && (
            <button className="icon-btn" aria-label="设置" onClick={() => navigate('/settings')}>
              <IconSettings />
            </button>
          )}
        </div>
      </div>

      {/* 主区域 */}
      <div className="main-area">
        {path === '/' && <HomePage />}
        {path.startsWith('/stock/') && (
          <StockDetailPage code={decodeURIComponent(path.split('/stock/')[1] || '')} />
        )}
        {path === '/ai' && <AIChatPage />}
        {path === '/settings' && <SettingsPage />}
        {path.startsWith('/settings/model') && (
          <AIModelEditorPage modelId={decodeURIComponent(path.split('/settings/model/')[1] || '') || null} />
        )}
      </div>

      {/* 底部导航 - 详情页不显示 */}
      {!inDetail || isSettings ? null : (
        <div className="bottom-nav">
          {BOTTOM_NAV.map((n) => (
            <button
              key={n.to}
              className={
                (n.to === '/' && isHome) || (n.to === '/ai' && isAI) || (n.to === '/settings' && isSettings)
                  ? 'active' : ''
              }
              onClick={() => navigate(n.to)}
            >
              <span className="nav-ic">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
