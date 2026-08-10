// ============================================
// 首页：发现 / 行情 / 自选
// ============================================

import { useState } from 'react';
import { useRouter } from '../router/useRouter';
import DiscoveryTab from '../components/DiscoveryTab';
import MarketTab from '../components/MarketTab';
import WatchlistTab from '../components/WatchlistTab';

const MAIN_TABS = [
  { id: 'discovery', label: '发现' },
  { id: 'market', label: '行情' },
  { id: 'watchlist', label: '自选' },
];

export default function HomePage() {
  const { path, navigate } = useRouter();
  // 初始 tab：优先 URL ?tab=（返回时恢复），其次上次选择，默认行情
  const [tab, setTab] = useState(() => {
    const q = new URLSearchParams(path.split('?')[1] || '').get('tab');
    if (q === 'discovery' || q === 'market' || q === 'watchlist') return q;
    try {
      const saved = sessionStorage.getItem('homeTab');
      if (saved === 'discovery' || saved === 'market' || saved === 'watchlist') return saved;
    } catch { /* ignore */ }
    return 'market';
  });

  const switchTab = (t: string) => {
    setTab(t);
    try { sessionStorage.setItem('homeTab', t); } catch { /* ignore */ }
    // 清掉 URL 上的 ?tab= 参数（用 replace 不新增历史条目）
    if (path.includes('?')) window.location.replace('#/');
  };

  return (
    <div className="page home-layout">
      <div className="home-main-tabs">
        {MAIN_TABS.map((t) => (
          <button key={t.id} className={'hmt-btn' + (tab === t.id ? ' active' : '')} onClick={() => switchTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'discovery' && <DiscoveryTab onNavigate={navigate} />}
      {tab === 'market' && <MarketTab onNavigate={navigate} />}
      {tab === 'watchlist' && <WatchlistTab onNavigate={navigate} />}
    </div>
  );
}
