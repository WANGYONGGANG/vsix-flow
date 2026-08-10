// ============================================
// 发现 Tab
// ============================================

import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { escapeHtml } from '../../local-shared/utils';

const ICONS = [
  { id: 'flow', label: '资金流向', icon: '💸', to: '/flow' },
  { id: 'lhb', label: '龙虎榜', icon: '🐉', to: '/lhb' },
  { id: 'auction', label: '集合竞价', icon: '⏰', to: '/auction' },
  { id: 'zt', label: '涨停专题', icon: '🚀', to: '/zt' },
  { id: 'alert', label: '盘口异动', icon: '⚡', to: '/changes' },
];

const NEWS_TABS = [
  { id: 'yaowen', label: '要闻', load: () => api.emNewsSearch('A股', 1, 30) },
  { id: '7x24', label: '7x24', load: () => api.emNews(1, 40) },
  { id: 'guanzhu', label: '关注', load: () => api.emNewsSearch('自选', 1, 20) },
  { id: 'remen', label: '热门', load: () => api.emNewsSearch('热门', 1, 20) },
];

function newsId(n: any): string {
  const title = n.title || n.Art_Title || '';
  const time = n.showtime || n.ctime || n.display_time || n.time || '';
  return `${time}_${title}`;
}

function speak(text: string) {
  try {
    if (!('speechSynthesis' in window) || !text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

export default function DiscoveryTab({ onNavigate }: { onNavigate: (to: string) => void }) {
  const [newsTab, setNewsTab] = useState('yaowen');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hotList, setHotList] = useState<any[]>([]);
  const [voiceOn, setVoiceOn] = useState(() => {
    try { return sessionStorage.getItem('newsVoice') === '1'; } catch { return false; }
  });
  const lastIdsRef = useRef<string[]>([]);
  const voiceOnRef = useRef(voiceOn);
  voiceOnRef.current = voiceOn;

  // 热门话题：东财个股人气榜 TOP + 实时行情
  useEffect(() => {
    api.hotStocks().then((r) => setHotList(r?.data?.diff || []));
  }, []);

  useEffect(() => {
    // 切换 tab 时重置已播记录，避免整列表重播
    lastIdsRef.current = [];
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsTab]);

  // 轮询刷新：开启语音播报时读出新增新闻标题
  useEffect(() => {
    const t = setInterval(() => loadNews(), 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsTab]);

  async function loadNews() {
    setLoading(true);
    const tab = NEWS_TABS.find((t) => t.id === newsTab);
    const d = tab ? await tab.load() : null;
    const list: any[] = d?.data?.list || d?.news || [];

    // 语音播报：读出比上次第一条更新的新闻
    const newIds = list.map(newsId);
    const prev = lastIdsRef.current;
    if (voiceOnRef.current && prev.length) {
      const firstNew = newIds.indexOf(prev[0]);
      if (firstNew > 0) {
        for (let j = firstNew - 1; j >= 0; j--) {
          const t = list[j]?.title || list[j]?.Art_Title || '';
          if (t) speak(t);
        }
      }
    }
    lastIdsRef.current = newIds;

    setData(d);
    setLoading(false);
  }

  function toggleVoice() {
    const next = !voiceOn;
    setVoiceOn(next);
    try { sessionStorage.setItem('newsVoice', next ? '1' : '0'); } catch { /* ignore */ }
    if (!next) {
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    } else {
      // 开启时立刻播一条最新的作为提示
      const list: any[] = data?.data?.list || data?.news || [];
      const t = list[0]?.title || list[0]?.Art_Title || '';
      if (t) speak(t);
    }
  }

  function openNews(n: any) {
    const q = new URLSearchParams();
    q.set('title', n.title || n.Art_Title || '');
    q.set('content', n.content || '');
    q.set('source', n.source || n.Art_Media_Name || '');
    q.set('time', n.showtime || n.time || n.ctime || '');
    onNavigate(`/news?${q.toString()}`);
  }

  function openTopic(h: any) {
    const code = String(h.f12 || '').toLowerCase();
    const m = /^(60|68|90|11|13|50|56|51|58)/.test(code) ? 'sh'
      : /^(00|30|20|12|15|16|18|159)/.test(code) ? 'sz'
      : /^(43|83|87|92|88)/.test(code) ? 'bj' : 'sh';
    onNavigate(`/stock/${m}${code}?name=${encodeURIComponent(h.f14 || '')}`);
  }

  const list: any[] = data?.data?.list || data?.news || [];

  return (
    <div className="content-scroll">
      <div className="discovery-grid">
        {ICONS.map((it) => (
          <button key={it.id} className="dg-item" onClick={() => onNavigate(it.to)}>
            <div className="dg-wrap">
              <div className="dg-ic">{it.icon}</div>
            </div>
            <span className="dg-lb">{it.label}</span>
          </button>
        ))}
      </div>

      <div className="section-hd" style={{ margin: '14px' }}>热门话题 · 人气榜</div>
      <div className="hot-topic-row">
        {hotList.slice(0, 10).map((h) => {
          const chg = Number(h.f3 || 0);
          const up = chg >= 0;
          const rc = Number(h.hisRc || 0);
          return (
            <div key={h.f12} className="hot-topic-card" style={{ cursor: 'pointer' }} onClick={() => openTopic(h)}>
              <div className="rank">{h.rank}</div>
              <div style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.4 }}>{escapeHtml(h.f14 || '')}</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>
                <span className={up ? 'text-up' : 'text-down'}>{up ? '+' : ''}{chg.toFixed(2)}%</span>
                <span className="text-muted" style={{ marginLeft: 6 }}>
                  {rc > 0 ? `↑${rc}` : rc < 0 ? `↓${Math.abs(rc)}` : '—'}
                </span>
              </div>
            </div>
          );
        })}
        {!hotList.length && <div className="loading" style={{ padding: 12 }}>加载中…</div>}
      </div>

      <div className="news-tabs" style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', flex: 1 }}>
          {NEWS_TABS.map((t) => (
            <button key={t.id} className={newsTab === t.id ? 'active' : ''} onClick={() => setNewsTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <button
          className={'icon-btn' + (voiceOn ? ' voice-on' : '')}
          title={voiceOn ? '关闭语音播报' : '开启语音播报'}
          style={{ color: voiceOn ? 'var(--up)' : 'var(--fg-dim)', fontSize: 16 }}
          onClick={toggleVoice}
        >
          {voiceOn ? '🔊' : '🔇'}
        </button>
      </div>

      {loading && !data && <div className="loading">加载中…</div>}
      {list.map((n, idx) => {
        const title = n.title || n.Art_Title || '';
        const src = n.source || n.Art_Media_Name || '';
        const time = n.showtime || n.ctime || n.display_time || n.time || '';
        const comment = n.comment_num || n.comment || '';
        return (
          <div key={idx} className="news-item" onClick={() => openNews(n)}>
            <div className="title">{escapeHtml(title)}</div>
            <div className="meta">
              {src && <span style={{ color: '#4a90e2', marginRight: 8 }}>{escapeHtml(src)}</span>}
              {escapeHtml(time)}{comment ? ` · ${comment}评` : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}
