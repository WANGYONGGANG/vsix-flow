import { useSettings } from './store/useSettings';
import { useRouter } from './router/useRouter';
import HomePage from './pages/HomePage';
import StockDetailPage from './pages/StockDetailPage';
import AIChatPage from './pages/AIChatPage';
import SettingsPage from './pages/SettingsPage';
import AIModelEditorPage from './pages/AIModelEditorPage';
import { useEffect } from 'react';

const BOTTOM_NAV = [
  { to: '/', label: '行情', icon: '📈' },
  { to: '/ai', label: 'AI', icon: '✨' },
  { to: '/settings', label: '我的', icon: '⚙️' },
];

export default function App() {
  const { path, navigate } = useRouter();
  const { settings } = useSettings();

  useEffect(() => {
    // 应用主题色到 :root（useSettings 已处理颜色变量）
  }, []);

  const inDetail = path.startsWith('/stock/') || path.startsWith('/settings/model');
  const isHome = path === '/' || path.startsWith('/stock/');
  const isAI = path === '/ai';
  const isSettings = path === '/settings' || path.startsWith('/settings/model');

  return (
    <div className="app-shell">
      {/* 顶部栏 */}
      <div className="topbar">
        <h1>
          {path.startsWith('/stock/') && '股票详情'}
          {path === '/' && 'StockExt 行情中心'}
          {path === '/ai' && 'StockAI 智能助手'}
          {path === '/settings' && '设置'}
          {path.startsWith('/settings/model') && 'AI 模型配置'}
        </h1>
        {(path === '/' || path === '/ai') && (
          <button className="icon-btn" aria-label="设置" onClick={() => navigate('/settings')}>⚙️</button>
        )}
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
