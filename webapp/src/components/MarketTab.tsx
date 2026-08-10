// ============================================
// 行情 Tab（大盘 / 沪深京 / 板块）
// ============================================

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { mapEmDiffToStockItem, fmtYi, upSign, escapeHtml } from '../../local-shared/utils';

const SUB_TABS = [
  { id: 'overall', label: '大盘' },
  { id: 'a', label: '沪深京' },
  { id: 'sector', label: '板块' },
];

// 涨跌分布柱状图
const DIST_LABELS = [
  { key: 'zt', label: '涨停', color: 'var(--up)' },
  { key: 'g5', label: '>5%', color: '#ff6b6b' },
  { key: 'g1', label: '1-5%', color: '#ff8787' },
  { key: 'g0', label: '0-1%', color: '#ffb3b3' },
  { key: 'flat', label: '平盘', color: '#718096' },
  { key: 'd0', label: '0-1%', color: '#87d99b' },
  { key: 'd1', label: '1-5%', color: '#5bc878' },
  { key: 'd5', label: '>5%', color: '#3ab85c' },
  { key: 'dt', label: '跌停', color: 'var(--down)' },
];

export default function MarketTab({ onNavigate }: { onNavigate: (to: string) => void }) {
  const [sub, setSub] = useState('overall');
  const [overview, setOverview] = useState<any>(null);
  const [sectorData, setSectorData] = useState<any[]>([]);
  const [stockList, setStockList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, [sub]);

  async function load() {
    setLoading(true);
    if (sub === 'overall') {
      const [r1, r2] = await Promise.all([api.marketOverview(), api.marketOverviewDetail()]);
      setOverview({ ...(r1 || {}), ...(r2 || {}), data: { ...(r1?.data || {}), ...(r2?.data || {}) } });
    } else if (sub === 'sector') {
      const r = await api.sectorLimit();
      setSectorData(r?.data?.diff || r?.data?.list || []);
    } else {
      const r = await api.allStocks('a');
      setStockList(r?.data?.diff || []);
    }
    setLoading(false);
  }

  const indices: any[] = overview?.data?.diff || [];
  const counts: any = overview?.data?.counts || {};
  const trade: any = overview?.data?.trade || {};
  const yzt: any = overview?.data?.yesterdayZt || {};
  const dist: any = overview?.data?.distribution || null;

  const openStock = (code: string, name: string) => {
    const c = String(code || '').replace(/^(sh|sz|bj)/i, '').toLowerCase();
    const m = /^(60|68|90|11|13|50|56|51|58)/.test(c) ? 'sh'
      : /^(00|30|20|12|15|16|18|159)/.test(c) ? 'sz'
      : /^(43|83|87|92|88)/.test(c) ? 'bj' : 'sh';
    onNavigate(`/stock/${m}${c}?name=${encodeURIComponent(name || '')}`);
  };

  return (
    <div className="content-scroll">
      <div className="market-subtabs">
        {SUB_TABS.map((t) => (
          <button key={t.id} className={sub === t.id ? 'active' : ''} onClick={() => setSub(t.id)}>{t.label}</button>
        ))}
      </div>

      {sub === 'overall' ? (
        <>
          {loading && !indices.length && <div className="loading">加载中…</div>}
          <div className="index-scroll">
            {indices.map((it) => {
              const s = mapEmDiffToStockItem(it); const up = s.changeRate >= 0;
              return (
                <div key={s.code} className="index-card-mini">
                  <div className="nm">{escapeHtml(s.name)}</div>
                  <div className={'pr ' + (up ? 'text-up' : 'text-down')}>{Number(s.price || 0).toFixed(2)}</div>
                  <div className={'chg ' + (up ? 'text-up' : 'text-down')}>
                    {upSign(s.changeRate)}{Number(s.changeRate || 0).toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </div>

          <div className="section-hd" style={{ margin: '14px' }}>市场概况</div>
          <div className="market-summary-grid">
            <div className="market-summary-item">
              <div className="lbl">涨跌分布</div>
              <div className="val" style={{ color: 'var(--up)' }}>
                {counts.up || 0}<span style={{ color: 'var(--fg-dim)', fontSize: 12 }}>:{counts.flat || 0}:{counts.down || 0}</span>
              </div>
            </div>
            <div className="market-summary-item">
              <div className="lbl">主力净流入</div>
              <div className={'val ' + (Number(trade.mainInflow || 0) >= 0 ? 'text-up' : 'text-down')}>{fmtYi(trade.mainInflow || 0)}</div>
            </div>
            <div className="market-summary-item">
              <div className="lbl">昨日涨停表现</div>
              <div className={'val ' + (Number(yzt.avgChange) >= 0 ? 'text-up' : 'text-down')}>
                {upSign(Number(yzt.avgChange || 0))}{Number(yzt.avgChange || 0).toFixed(2)}%
              </div>
            </div>
          </div>

          {dist && (
            <div style={{ background: 'var(--card)', marginBottom: 8, padding: '10px 14px' }}>
              <div className="dist-row">
                {DIST_LABELS.map((d) => {
                  const val = Number((dist as any)[d.key] || 0);
                  const max = Math.max(1, ...DIST_LABELS.map((l) => Number((dist as any)[l.key] || 0)));
                  const h = Math.max(4, Math.round((val / max) * 60));
                  return (
                    <div key={d.key} className="dist-col">
                      <div className="val" style={{ color: d.color }}>{val || ''}</div>
                      <div className="bar" style={{ height: h, background: d.color }} />
                      <div className="lbl">{d.label}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 6 }}>
                <span className="text-up">涨 {counts.up || 0} 家</span>
                <span className="text-down">跌 {counts.down || 0} 家</span>
              </div>
            </div>
          )}

          <div style={{ background: 'var(--card)', padding: '10px 14px', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span className="text-muted">三市成交总额</span>
              <span className="text-up" style={{ fontWeight: 700 }}>{fmtYi(trade.total || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span className="text-muted">较前一日同期</span>
              <span className={Number(trade.volumeRatio) >= 1 ? 'text-up' : 'text-down'}>
                {Number(trade.volumeRatio || 0) >= 1 ? '放量' : '缩量'} {fmtYi(Math.abs(Number(trade.total || 0) - Number(trade.yesterdayTotal || 0)))}
              </span>
            </div>
          </div>
        </>
      ) : sub === 'sector' ? (
        <>
          <div className="section-hd" style={{ margin: '14px' }}>板块涨幅排行</div>
          {loading && !sectorData.length && <div className="loading">加载中…</div>}
          {!loading && !sectorData.length && <div className="loading">暂无数据</div>}
          {sectorData.slice(0, 30).map((x: any, i: number) => {
            const rate = Number(x.change_rate || x.f3 || 0);
            const upN = Number(x.f104 || 0);
            const downN = Number(x.f105 || 0);
            const net = Number(x.f62 || 0);
            return (
              <div key={i} className="sector-row">
                <div className="name">{escapeHtml(x.name || x.f14 || '')}</div>
                <div className={rate >= 0 ? 'text-up' : 'text-down'} style={{ fontWeight: 700, textAlign: 'center' }}>
                  {upSign(rate)}{rate.toFixed(2)}%
                </div>
                <div className="text-muted" style={{ textAlign: 'center', fontSize: 12 }}>
                  {upN || downN ? `${upN}/${downN}` : '—'}
                </div>
                <div className={net >= 0 ? 'text-up' : 'text-down'} style={{ textAlign: 'right', fontSize: 12, fontWeight: 600 }}>
                  {net ? fmtYi(net) : '—'}
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <>
          <div className="section-hd" style={{ margin: '14px' }}>沪深京 涨跌排行</div>
          {loading && !stockList.length && <div className="loading">加载中…</div>}
          {!loading && !stockList.length && <div className="loading">暂无数据</div>}
          {stockList.slice(0, 50).map((it) => {
            const s = mapEmDiffToStockItem(it);
            const up = s.changeRate >= 0;
            return (
              <div key={s.code} className="watchlist-row" onClick={() => openStock(s.code, s.name)}>
                <div className="info" style={{ minWidth: 76 }}>
                  <div className="nm">{escapeHtml(s.name)}</div>
                  <div className="cd">{s.code}</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div className={up ? 'text-up' : 'text-down'} style={{ fontWeight: 600 }}>{Number(s.price || 0).toFixed(2)}</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div className={up ? 'text-up' : 'text-down'} style={{ fontWeight: 600 }}>
                    {upSign(s.changeRate)}{Number(s.changeRate || 0).toFixed(2)}%
                  </div>
                </div>
                <div style={{ minWidth: 56, textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {Number(s.turnoverRate || 0) ? Number(s.turnoverRate).toFixed(2) + '%' : '—'}
                  </div>
                  <div className="text-muted" style={{ fontSize: 10 }}>换手</div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
