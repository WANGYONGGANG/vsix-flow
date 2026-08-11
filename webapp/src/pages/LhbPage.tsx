// ============================================
// 龙虎榜
// ============================================

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useRouter } from '../router/useRouter';
import { escapeHtml, fmtYi, upSign } from '../../local-shared/utils';

export default function LhbPage() {
  const { navigate } = useRouter();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    api.lhb().then((r) => {
      const data: any[] = r?.data?.list || r?.data || [];
      setList(data);
      setLoading(false);
    });
  }, []);

  const open = (code: string, name: string) => {
    const c = String(code || '').replace(/^(sh|sz|bj)/i, '').toLowerCase();
    const m = /^(60|68|90|11|13|50|56|51|58)/.test(c) ? 'sh'
      : /^(00|30|20|12|15|16|18|159)/.test(c) ? 'sz'
      : /^(43|83|87|92|88)/.test(c) ? 'bj' : 'sh';
    navigate(`/stock/${m}${c}?name=${encodeURIComponent(name || '')}`);
  };

  function parseSeats(json: any): { name: string; buy: number; sell: number }[] {
    if (!json) return [];
    try {
      const arr = typeof json === 'string' ? JSON.parse(json) : json;
      if (!Array.isArray(arr)) return [];
      return arr.map((s: any) => ({
        name: s[0] || s.name || '',
        buy: Number(s[1] || s.buy || 0),
        sell: Number(s[2] || s.sell || 0),
      }));
    } catch { return []; }
  }

  return (
    <div className="content-scroll">
      <div className="section-hd" style={{ margin: '14px' }}>龙虎榜</div>
      {loading && !list.length && <div className="loading">加载中…</div>}
      {list.map((x, i) => {
        const code = String(x.SECURITY_CODE || x.f12 || '');
        const name = x.SECURITY_NAME_ABBR || x.f14 || '';
        const price = Number(x.CLOSE_PRICE || x.f2 || 0);
        const chg = Number(x.CHANGE_RATE || x.f3 || 0);
        const net = Number(x.BILLBOARD_NET_AMT || x.f62 || 0);
        const buyAmt = Number(x.BILLBOARD_BUY_AMT || 0);
        const sellAmt = Number(x.BILLBOARD_SELL_AMT || 0);
        const explain = String(x.EXPLAIN || x.EXPLANATION || '');
        const buySeats = parseSeats(x.BUY_SEAT);
        const sellSeats = parseSeats(x.SELL_SEAT);
        const up = chg >= 0;
        const expanded = expandedIdx === i;

        return (
          <div key={code + i} style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="watchlist-row" onClick={() => setExpandedIdx(expanded ? null : i)}>
              <div className="info" style={{ minWidth: 72 }}>
                <div className="nm">{escapeHtml(name)}</div>
                <div className="cd">{code}</div>
              </div>
              <div style={{ minWidth: 62, textAlign: 'center' }}>
                <div className={up ? 'text-up' : 'text-down'} style={{ fontWeight: 600 }}>{price.toFixed(2)}</div>
                <div className={up ? 'text-up' : 'text-down'} style={{ fontSize: 11 }}>
                  {upSign(chg)}{chg.toFixed(2)}%
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0, padding: '0 8px' }}>
                <div style={{ fontSize: 11, lineHeight: 1.4, color: 'var(--fg)', wordBreak: 'break-all' }}>
                  {explain ? escapeHtml(explain) : <span className="text-muted">—</span>}
                </div>
              </div>
              <div style={{ minWidth: 66, textAlign: 'right' }}>
                <div className={net >= 0 ? 'text-up' : 'text-down'} style={{ fontWeight: 600 }}>
                  {net >= 0 ? '+' : ''}{fmtYi(net)}
                </div>
                <div className="text-muted" style={{ fontSize: 11 }}>净额</div>
              </div>
              <div style={{ flexShrink: 0, width: 20, textAlign: 'center', color: '#999', fontSize: 12 }}>
                {expanded ? '▲' : '▼'}
              </div>
            </div>
            {expanded && (
              <div style={{ padding: '8px 14px', background: 'rgba(255,255,255,.02)' }}>
                <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 11, color: '#999' }}>
                  <span>买入额：{fmtYi(buyAmt)}</span>
                  <span>卖出额：{fmtYi(sellAmt)}</span>
                </div>
                {buySeats.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: '#23c343', marginBottom: 4, fontWeight: 500 }}>买入席位</div>
                    {buySeats.map((s, j) => (
                      <div key={j} style={{ fontSize: 11, color: 'var(--fg)', lineHeight: 1.8, paddingLeft: 8 }}>
                        {j + 1}. {escapeHtml(s.name)} <span className="text-up">{fmtYi(s.buy)}</span>
                        {s.sell > 0 && <span className="text-muted" style={{ marginLeft: 8 }}>卖出 {fmtYi(s.sell)}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {sellSeats.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: '#ff4d4f', marginBottom: 4, fontWeight: 500 }}>卖出席位</div>
                    {sellSeats.map((s, j) => (
                      <div key={j} style={{ fontSize: 11, color: 'var(--fg)', lineHeight: 1.8, paddingLeft: 8 }}>
                        {j + 1}. {escapeHtml(s.name)} <span className="text-down">{fmtYi(s.sell)}</span>
                        {s.buy > 0 && <span className="text-muted" style={{ marginLeft: 8 }}>买入 {fmtYi(s.buy)}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {buySeats.length === 0 && sellSeats.length === 0 && (
                  <div className="text-muted" style={{ fontSize: 11 }}>暂无席位数据</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
