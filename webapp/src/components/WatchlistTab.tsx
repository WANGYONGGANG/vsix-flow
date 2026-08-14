// ============================================
// 自选 Tab（拖拽排序 + 长按菜单 + 左滑删除）
// ============================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../store/useSettings';
import { useSimTrade } from '../store/useSimTrade';
import { api } from '../api/client';
import Sparkline from './Sparkline';
import { mapEmDiffToStockItem, fmtPrice, upSign, normalizeCode } from '../../local-shared/utils';

const CHG_TYPES: Record<number, string> = {
  4: '秒板', 8: '封板', 16: '打开涨停', 32: '大笔买入', 64: '大笔卖出',
  128: '大笔买入', 8193: '火箭发射', 8194: '快速反弹', 8201: '加速上涨',
  8202: '高台跳水', 8203: '加速下跌', 8204: '大笔卖出', 8207: '大幅上升',
  8208: '大幅下降', 8209: '封涨停', 8210: '封跌停', 8211: '打开涨停',
  8212: '打开跌停', 8213: '创历史新高', 8214: '创历史新低', 8215: '竞价上涨', 8216: '竞价下跌'
};

export default function WatchlistTab({ onNavigate }: { onNavigate: (to: string) => void }) {
  const { settings, watchlist, delWatch, getWatchCodes, moveWatch, reorderWatch } = useSettings();
  const { holdings } = useSimTrade();
  const [filter, setFilter] = useState('全部');
  const [quotes, setQuotes] = useState<any[]>([]);
  const [sparks, setSparks] = useState<Record<string, number[]>>({});
  const [alerts, setAlerts] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [swipedCode, setSwipedCode] = useState<string | null>(null);
  const [menuCode, setMenuCode] = useState<string | null>(null);
  const dragElRef = useRef<any>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const longPressTimer = useRef<any>(null);

  const groups = settings.stockPortfolio.groups || [];
  const filters = ['全部', '持仓', '沪深京', ...groups.map((g) => g.name)];

  const codes = useMemo(() => {
    if (filter === '全部') return getWatchCodes();
    if (filter === '持仓') return holdings.map((h) => h.code);
    if (filter === '沪深京') return getWatchCodes().filter((c) => /^(sh|sz)/.test(c));
    const g = groups.find((x) => x.name === filter);
    return g ? g.codes : getWatchCodes();
  }, [filter, getWatchCodes, holdings, groups]);

  // 仅"全部"视图支持拖拽排序（排序写回第一个分组）
  const draggable = filter === '全部';

  async function load() {
    if (!codes.length) { setQuotes([]); setSparks({}); setAlerts({}); return; }
    setLoading(true);
    const r = await api.quote(codes);
    const diff: any[] = r?.data?.diff || [];
    setQuotes(diff);
    
    // 加载异动数据
    try {
      const alertR = await api.stockChanges();
      const alertList: any[] = alertR?.data?.list || [];
      const alertMap: Record<string, any[]> = {};
      for (const a of alertList) {
        const code = normalizeCode(a.c || '');
        if (!codes.includes(code)) continue;
        if (!alertMap[code]) alertMap[code] = [];
        alertMap[code].push({
          t: a.t,
          i: a.i,
          label: CHG_TYPES[a.t] || '异动',
          isUp: [4, 8, 32, 128, 8193, 8194, 8201, 8207, 8209, 8211, 8213, 8215].includes(a.t)
        });
      }
      setAlerts(alertMap);
    } catch {
      setAlerts({});
    }
    
    // 加载分时 sparkline
    const sparkMap: Record<string, number[]> = {};
    await Promise.all(codes.slice(0, 15).map(async (code) => {
      const intr = await api.intraday(code);
      const mins: string[] = intr?.data?.minutes || [];
      if (mins.length) {
        sparkMap[code] = mins.map((m) => Number(m.split(',')[1]) || 0);
      }
    }));
    setSparks(sparkMap);
    setLoading(false);
  }

  useEffect(() => { load(); }, [codes.join(',')]);
  useEffect(() => {
    const t = setInterval(load, Math.max(5000, settings.pollIntervalMs || 5000));
    return () => clearInterval(t);
  }, [codes.join(','), settings.pollIntervalMs]);

  const nameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of watchlist) m.set(normalizeCode(w.code), w.name || w.code);
    return m;
  }, [watchlist]);

  // ===== 拖拽排序 =====
  function getDragAfter(container: HTMLElement, y: number) {
    const list = Array.from(container.querySelectorAll<HTMLElement>('.wl-card-wrap:not(.dragging)'));
    for (const el of list) {
      const box = el.getBoundingClientRect();
      if (y < box.top + box.height / 2) return el;
    }
    return null;
  }

  function commitOrder(container: HTMLElement) {
    const arr: string[] = [];
    container.querySelectorAll<HTMLElement>('.wl-card-wrap').forEach((c) => {
      const code = c.getAttribute('data-code');
      if (code) arr.push(code);
    });
    reorderWatch(arr);
  }

  // ===== 触摸：长按菜单 + 左滑删除 =====
  function handleTouchStart(e: React.TouchEvent, code: string) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    longPressTimer.current = setTimeout(() => {
      setMenuCode(code);
      setSwipedCode(null);
    }, 600);
  }

  function handleTouchMove(e: React.TouchEvent) {
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    }
  }

  function handleTouchEnd(e: React.TouchEvent, code: string) {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -50) {
      setSwipedCode(code);
      setMenuCode(null);
    } else if (deltaX > 30) {
      setSwipedCode(null);
    }
  }

  return (
    <div className="content-scroll">
      <div className="watchlist-filter">
        {filters.map((f) => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      {loading && !quotes.length && <div className="loading">加载中…</div>}
      {!codes.length && <div className="loading">暂无自选股，点击右上角搜索添加</div>}

      {quotes.map((it) => {
        const s = mapEmDiffToStockItem(it);
        const code = normalizeCode(s.code || String(it.f12 || ''));
        const nm = s.name || nameMap.get(code) || code;
        const up = s.changeRate >= 0;
        const isSwiped = swipedCode === code;
        return (
          <div
            key={code}
            className="wl-card-wrap"
            data-code={code}
            draggable={draggable}
            onDragStart={(e: any) => {
              dragElRef.current = e.currentTarget;
              e.currentTarget.classList.add('dragging');
              try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', code); } catch { /* noop */ }
            }}
            onDragOver={(e: any) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; }}
            onDragEnter={(e: any) => { e.preventDefault(); }}
            onDrop={(e: any) => {
              e.preventDefault();
              const self = e.currentTarget;
              const dragEl = dragElRef.current;
              if (!dragEl || dragEl === self) return;
              const after = getDragAfter(self.parentNode as HTMLElement, e.clientY);
              const container = self.parentNode as HTMLElement;
              if (after == null) container.appendChild(dragEl);
              else container.insertBefore(dragEl, after);
              commitOrder(container);
            }}
            onDragEnd={(e: any) => {
              e.currentTarget.classList.remove('dragging');
              dragElRef.current = null;
            }}
            style={{ cursor: draggable ? 'grab' : 'default' }}
          >
            <button
              className="wl-swipe-del"
              onClick={(e) => { e.stopPropagation(); delWatch(code); setSwipedCode(null); }}
            >删除</button>
            <div
              className={'wl-card watchlist-row' + (isSwiped ? ' swiped' : '')}
              onTouchStart={(e) => handleTouchStart(e, code)}
              onTouchMove={handleTouchMove}
              onTouchEnd={(e) => handleTouchEnd(e, code)}
              onClick={() => {
                if (isSwiped) { setSwipedCode(null); return; }
                onNavigate(`/stock/${code}?name=${encodeURIComponent(nm)}`);
              }}
            >
              <div className="info">
                <div className="nm">
                  {nm}
                  {alerts[code]?.slice(0, 2).map((a, idx) => (
                    <span key={idx} className={'wl-alert-tag ' + (a.isUp ? 'up' : 'down')}>
                      {a.label}
                    </span>
                  ))}
                </div>
                <div className="cd">{code.replace(/^(sh|sz|bj)/, '')}</div>
              </div>
              <div className="spark">
                <Sparkline data={sparks[code] || []} color={up ? 'var(--up)' : 'var(--down)'} />
              </div>
              <div className={'price ' + (up ? 'text-up' : 'text-down')}>{fmtPrice(s.price || 0)}</div>
              <div className={'chg ' + (up ? 'text-up' : 'text-down')}>
                {upSign(s.changeRate)}{Number(s.changeRate || 0).toFixed(2)}%
              </div>
              <button className="icon-btn" style={{ color: 'var(--fg-dim)' }} onClick={(e) => { e.stopPropagation(); if (confirm(`删除 ${nm}？`)) delWatch(code); }}>✕</button>
            </div>
          </div>
        );
      })}

      {/* 添加自选按钮 */}
      {codes.length > 0 && (
        <div style={{ position: 'sticky', bottom: 0, padding: '10px 0', textAlign: 'center', background: 'var(--bg)', borderTop: '1px solid var(--border)', zIndex: 10 }}>
          <button
            onClick={() => {
              // 触发全局搜索（通过自定义事件）
              const evt = new CustomEvent('openSearch');
              window.dispatchEvent(evt);
            }}
            style={{ padding: '8px 24px', border: '1px solid #3596f0', borderRadius: 6, background: 'transparent', color: '#5cabff', fontSize: 13, cursor: 'pointer', width: '100%', maxWidth: 200 }}
          >
            + 添加自选
          </button>
        </div>
      )}

      {/* 长按菜单 */}
      {menuCode && (
        <div className="modal-mask" onClick={() => setMenuCode(null)}>
          <div className="wl-menu" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { moveWatch(menuCode, 'top'); setMenuCode(null); }}>⤒ 置顶</button>
            <button onClick={() => { moveWatch(menuCode, 'bottom'); setMenuCode(null); }}>⤓ 置底</button>
            <button onClick={() => { moveWatch(menuCode, 'up'); setMenuCode(null); }}>↑ 上移</button>
            <button onClick={() => { moveWatch(menuCode, 'down'); setMenuCode(null); }}>↓ 下移</button>
            <button className="danger" onClick={() => { delWatch(menuCode); setMenuCode(null); }}>🗑 删除</button>
            <button className="cancel" onClick={() => setMenuCode(null)}>取消</button>
          </div>
        </div>
      )}
    </div>
  );
}
