// ============================================
// 涨停专题（强板 / 涨停）
// ============================================

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useRouter } from '../router/useRouter';
import { escapeHtml, upSign } from '../../local-shared/utils';

const SUB_TABS = [
  { id: 'strong', label: '强板' },
  { id: 'limit', label: '涨停' },
];

function fmtTime(n: number): string {
  const s = String(Math.floor(n || 0)).padStart(6, '0');
  return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
}

export default function ZtPage() {
  const { navigate } = useRouter();
  const [sub, setSub] = useState('strong');
  const [pool, setPool] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.ztPool().then((r) => {
      const data: any[] = r?.data?.pool || r?.data?.list || r?.data || [];
      setPool(data);
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

  // 强板：按行业板块聚合涨停数 + 代表股
  const sectorMap = new Map<string, { name: string; count: number; codes: { c: string; n: string }[] }>();
  for (const x of pool) {
    const k = x.hybk || '其他';
    if (!sectorMap.has(k)) sectorMap.set(k, { name: k, count: 0, codes: [] });
    const g = sectorMap.get(k)!;
    g.count++;
    if (g.codes.length < 3) g.codes.push({ c: String(x.c || ''), n: x.n || '' });
  }
  const strongList = [...sectorMap.values()].sort((a, b) => b.count - a.count);

  // 涨停：连板数降序
  const limitList = pool.slice().sort((a, b) => (b.lbc || 0) - (a.lbc || 0) || (b.zdp || 0) - (a.zdp || 0));

  return (
    <div className="content-scroll">
      <div className="market-subtabs">
        {SUB_TABS.map((t) => (
          <button key={t.id} className={sub === t.id ? 'active' : ''} onClick={() => setSub(t.id)}>{t.label}</button>
        ))}
      </div>

      {loading && !pool.length && <div className="loading">加载中…</div>}
      {!loading && !pool.length && <div className="loading">暂无数据</div>}

      {sub === 'strong' ? (
        <>
          <div className="section-hd" style={{ margin: '14px' }}>涨停板块强度</div>
          {strongList.map((s, i) => (
            <div key={s.name + i} className="watchlist-row">
              <div className="info" style={{ flex: 'none', width: 80 }}>
                <div className="nm">{escapeHtml(s.name)}</div>
                <div className="cd">板块</div>
              </div>
              <div style={{ minWidth: 52, flexShrink: 0, textAlign: 'center' }}>
                <div className="text-up" style={{ fontWeight: 700 }}>{s.count}</div>
                <div className="text-muted" style={{ fontSize: 10 }}>涨停家数</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                <div className="text-muted" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.codes.map((c) => escapeHtml(c.n)).join('、')}
                </div>
                <div className="text-muted" style={{ fontSize: 10 }}>代表股</div>
              </div>
              <div style={{ minWidth: 44, textAlign: 'right' }}>
                <div style={{ fontWeight: 600 }}>{s.codes.length}</div>
                <div className="text-muted" style={{ fontSize: 10 }}>代表数</div>
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
          <div className="section-hd" style={{ margin: '14px' }}>涨停池</div>
          {limitList.map((x, i) => {
            const code = String(x.c || x.f12 || '');
            const name = x.n || x.f14 || '';
            const price = (Number(x.p || x.f2 || 0)) / 100;
            const chg = Number(x.zdp || x.f3 || 0);
            const lbc = Number(x.lbc || 0);
            const hybk = String(x.hybk || '');
            const fbt = Number(x.fbt || 0);
            const zbc = Number(x.zbc || 0);
            return (
              <div key={code + i} className="watchlist-row" onClick={() => open(code, name)}>
                <div className="info" style={{ flex: 'none', width: 76 }}>
                  <div className="nm">{escapeHtml(name)}</div>
                  <div className="cd">{code}</div>
                </div>
                <div style={{ minWidth: 60, flexShrink: 0, textAlign: 'center' }}>
                  <div className="text-up">{price.toFixed(2)}</div>
                  <div className="text-up" style={{ fontSize: 11 }}>{upSign(chg)}{chg.toFixed(2)}%</div>
                </div>
                <div style={{ minWidth: 44, flexShrink: 0, textAlign: 'center' }}>
                  <div style={{ fontWeight: 600 }}>{lbc}</div>
                  <div className="text-muted" style={{ fontSize: 10 }}>连板</div>
                </div>
                <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
                  <div style={{ fontSize: 12 }}>{escapeHtml(hybk) || '—'}</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>
                    {fbt ? `${fmtTime(fbt)}封板` : ''}{zbc ? ` · 炸${zbc}次` : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
