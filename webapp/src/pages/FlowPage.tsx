// ============================================
// 资金流向（板块 / 个股）
// ============================================

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useRouter } from '../router/useRouter';
import { escapeHtml, fmtYi, upSign } from '../../local-shared/utils';

const SUB_TABS = [
  { id: 'sector', label: '板块' },
  { id: 'stock', label: '个股' },
];

export default function FlowPage() {
  const { navigate } = useRouter();
  const [sub, setSub] = useState('sector');
  const [industry, setIndustry] = useState<any[]>([]);
  const [concept, setConcept] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, [sub]);

  async function load() {
    setLoading(true);
    if (sub === 'sector') {
      const [r0, r1] = await Promise.all([api.sinaBkzj(0), api.sinaBkzj(1)]);
      setIndustry(r0?.data?.list || []);
      setConcept(r1?.data?.list || []);
    } else {
      const r = await api.stockFlowRank(100);
      setStocks(r?.data?.diff || r?.data?.list || []);
    }
    setLoading(false);
  }

  const openStock = (code: string, name: string) => {
    const c = String(code || '').replace(/^(sh|sz|bj)/i, '').toLowerCase();
    const m = /^(60|68|90|11|13|50|56|51|58)/.test(c) ? 'sh'
      : /^(00|30|20|12|15|16|18|159)/.test(c) ? 'sz'
      : /^(43|83|87|92|88)/.test(c) ? 'bj' : 'sh';
    navigate(`/stock/${m}${c}?name=${encodeURIComponent(name || '')}`);
  };

  // 板块资金流四象限：流入/流出 TOP10
  const sectorBlock = (title: string, arr: any[], isIn: boolean) => {
    const sorted = arr.slice().sort((a, b) =>
      isIn ? Number(b.netamount || 0) - Number(a.netamount || 0)
        : Number(a.netamount || 0) - Number(b.netamount || 0));
    const rows = sorted.filter((x) => isIn ? Number(x.netamount || 0) > 0 : Number(x.netamount || 0) < 0).slice(0, 10);
    return (
      <>
        <div className="section-hd" style={{ margin: '14px' }}>{title}</div>
        {!rows.length && <div className="loading">暂无数据</div>}
        {rows.map((x, i) => {
          const net = Number(x.netamount || 0);
          const tsRatio = Number(x.ts_changeratio || 0) * 100;
          const tsUp = tsRatio >= 0;
          return (
            <div key={i} className="watchlist-row">
              <div className="info" style={{ minWidth: 76 }}>
                <div className="nm">{escapeHtml(x.name || '')}</div>
                <div className="cd">板块</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div className={net >= 0 ? 'text-up' : 'text-down'} style={{ fontWeight: 600 }}>
                  {net >= 0 ? '+' : ''}{fmtYi(net)}
                </div>
                <div className="text-muted" style={{ fontSize: 11 }}>净流入</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}
                onClick={(e) => { e.stopPropagation(); if (x.ts_symbol) openStock(String(x.ts_symbol), x.ts_name || ''); }}>
                <div style={{ fontWeight: 600, color: '#4a90e2' }}>{escapeHtml(x.ts_name || '—')}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>领涨股</div>
              </div>
              <div style={{ minWidth: 60, textAlign: 'right' }}>
                <div className={tsUp ? 'text-up' : 'text-down'} style={{ fontWeight: 600 }}>
                  {upSign(tsRatio)}{tsRatio.toFixed(2)}%
                </div>
                <div className="text-muted" style={{ fontSize: 11 }}>涨幅</div>
              </div>
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div className="content-scroll">
      <div className="market-subtabs">
        {SUB_TABS.map((t) => (
          <button key={t.id} className={sub === t.id ? 'active' : ''} onClick={() => setSub(t.id)}>{t.label}</button>
        ))}
      </div>

      {sub === 'sector' ? (
        <>
          {loading && !industry.length && !concept.length && <div className="loading">加载中…</div>}
          {sectorBlock('行业资金流入 TOP10', industry, true)}
          {sectorBlock('行业资金流出 TOP10', industry, false)}
          {sectorBlock('概念资金流入 TOP10', concept, true)}
          {sectorBlock('概念资金流出 TOP10', concept, false)}
        </>
      ) : (
        <>
          <div className="section-hd" style={{ margin: '14px' }}>个股资金流向排行</div>
          {loading && !stocks.length && <div className="loading">加载中…</div>}
          {stocks.map((x, i) => {
            const code = String(x.f12 || '');
            const name = x.f14 || '';
            const price = Number(x.f2) || 0;
            const chg = Number(x.f3) || 0;
            const net = Number(x.f62) || 0;
            const up = chg >= 0;
            return (
              <div key={code + i} className="watchlist-row" onClick={() => openStock(code, name)}>
                <div className="info" style={{ minWidth: 76 }}>
                  <div className="nm">{escapeHtml(name)}</div>
                  <div className="cd">{code}</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div className={up ? 'text-up' : 'text-down'} style={{ fontWeight: 600 }}>{price.toFixed(2)}</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>现价</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div className={up ? 'text-up' : 'text-down'} style={{ fontWeight: 600 }}>
                    {upSign(chg)}{chg.toFixed(2)}%
                  </div>
                  <div className="text-muted" style={{ fontSize: 11 }}>涨幅</div>
                </div>
                <div style={{ minWidth: 60, textAlign: 'right' }}>
                  <div className={net >= 0 ? 'text-up' : 'text-down'} style={{ fontWeight: 600 }}>
                    {net >= 0 ? '+' : ''}{fmtYi(net)}
                  </div>
                  <div className="text-muted" style={{ fontSize: 11 }}>净流入</div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
