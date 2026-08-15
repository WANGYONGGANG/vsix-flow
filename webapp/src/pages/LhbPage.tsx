// ============================================
// 龙虎榜
// ============================================

import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { useRouter } from '../router/useRouter';
import { escapeHtml, fmtYi, upSign } from '../../local-shared/utils';

interface LhbItem {
  SECURITY_CODE?: string;
  SECURITY_NAME_ABBR?: string;
  CLOSE_PRICE?: number;
  CHANGE_RATE?: number;
  BILLBOARD_NET_AMT?: number;
  BILLBOARD_BUY_AMT?: number;
  BILLBOARD_SELL_AMT?: number;
  EXPLAIN?: string;
  EXPLANATION?: string;
  TRADE_DATE?: string;
  f12?: string;
  f14?: string;
  f2?: number;
  f3?: number;
  f62?: number;
}

interface SeatDetail {
  OPERATEDEPT_NAME?: string;
  BUY?: number;
  SELL?: number;
  NET?: number;
  TOTAL_BUYRIO?: number;
  TOTAL_SELLRIO?: number;
  TOTAL_NETAMT?: number;
}

export default function LhbPage() {
  const { navigate } = useRouter();
  const [list, setList] = useState<LhbItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [buySeats, setBuySeats] = useState<SeatDetail[]>([]);
  const [sellSeats, setSellSeats] = useState<SeatDetail[]>([]);

  useEffect(() => {
    setLoading(true);
    api.lhb().then((r) => {
      const data: LhbItem[] = r?.data?.list || r?.data || [];
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

  const fetchDetail = useCallback(async (code: string, date: string) => {
    setDetailLoading(true);
    try {
      const r = await api.lhbDetail(code, date);
      setBuySeats(r?.data?.buyList || []);
      setSellSeats(r?.data?.sellList || []);
    } catch {
      setBuySeats([]);
      setSellSeats([]);
    }
    setDetailLoading(false);
  }, []);

  const toggleExpand = async (idx: number, code: string, date: string) => {
    if (expandedIdx === idx) {
      setExpandedIdx(null);
      setBuySeats([]);
      setSellSeats([]);
      return;
    }
    setExpandedIdx(idx);
    await fetchDetail(code, date);
  };

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
        const tradeDate = String(x.TRADE_DATE || '').slice(0, 10);
        const up = chg >= 0;
        const expanded = expandedIdx === i;

        return (
          <div key={code + i} style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="watchlist-row" onClick={() => toggleExpand(i, code, tradeDate)}>
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
                  <span>日期：{tradeDate}</span>
                </div>
                {detailLoading && <div className="text-muted" style={{ fontSize: 11 }}>加载席位数据…</div>}
                {!detailLoading && buySeats.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: '#23c343', marginBottom: 4, fontWeight: 500 }}>买入席位</div>
                    {buySeats.map((s, j) => (
                      <div key={j} style={{ fontSize: 11, color: 'var(--fg)', lineHeight: 1.8, paddingLeft: 8 }}>
                        {j + 1}. {escapeHtml(s.OPERATEDEPT_NAME || '')} <span className="text-up">{fmtYi(Number(s.BUY || 0))}</span>
                        {Number(s.SELL || 0) > 0 && <span className="text-muted" style={{ marginLeft: 8 }}>卖出 {fmtYi(Number(s.SELL || 0))}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {!detailLoading && sellSeats.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: '#ff4d4f', marginBottom: 4, fontWeight: 500 }}>卖出席位</div>
                    {sellSeats.map((s, j) => (
                      <div key={j} style={{ fontSize: 11, color: 'var(--fg)', lineHeight: 1.8, paddingLeft: 8 }}>
                        {j + 1}. {escapeHtml(s.OPERATEDEPT_NAME || '')} <span className="text-down">{fmtYi(Number(s.SELL || 0))}</span>
                        {Number(s.BUY || 0) > 0 && <span className="text-muted" style={{ marginLeft: 8 }}>买入 {fmtYi(Number(s.BUY || 0))}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {!detailLoading && buySeats.length === 0 && sellSeats.length === 0 && (
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
