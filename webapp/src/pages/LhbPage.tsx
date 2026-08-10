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
        const up = chg >= 0;
        return (
          <div key={code + i} className="watchlist-row" onClick={() => open(code, name)}>
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
              <div className="text-muted" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {escapeHtml(String(x.EXPLAIN || x.EXPLANATION || '')) || '—'}
              </div>
              <div className="text-muted" style={{ fontSize: 10 }}>上榜原因</div>
            </div>
            <div style={{ minWidth: 66, textAlign: 'right' }}>
              <div className={net >= 0 ? 'text-up' : 'text-down'} style={{ fontWeight: 600 }}>
                {net >= 0 ? '+' : ''}{fmtYi(net)}
              </div>
              <div className="text-muted" style={{ fontSize: 11 }}>净额</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
