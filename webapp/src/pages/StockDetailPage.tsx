// ============================================
// 股票详情页：价格面板 + 图表(分时/五日/K线/筹码) + 五档/逐笔侧栏 + 资讯/公告/财务/资料 Tab
// ============================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '../router/useRouter';
import { useSettings } from '../store/useSettings';
import { useSimTrade } from '../store/useSimTrade';
import { api } from '../api/client';
import KLineChart from '../components/KLineChart';
import ChipsChart from '../components/ChipsChart';
import FormulaEditor from '../components/FormulaEditor';
import { executeFormula, KLineData } from '../lib/FormulaEngine';
import {
  fmtYi, fmtWan, upSign, mapEmDiffToStockItem, escapeHtml, normalizeCode,
} from '../../local-shared/utils';

type Period = '分时' | '五日' | '日K' | '周K' | '月K';
const PERIODS: Period[] = ['分时', '五日', '日K', '周K', '月K'];
type SubTab = 'news' | 'notice' | 'finance' | 'profile';
type ProfileSubTab = 'essential' | 'company' | 'holder' | 'industry';
type SideTab = 'orderbook' | 'ticks' | 'chips';

export default function StockDetailPage({ code }: { code: string }) {
  const { navigate } = useRouter();
  const { settings, addWatch, delWatch, formulas, updateFormulas } = useSettings();
  const { placeOrder } = useSimTrade();
  const [realCode, initName] = useMemo(() => {
    const c = normalizeCode(code.split('?')[0]);
    const q = new URLSearchParams(code.includes('?') ? code.split('?')[1] : '');
    return [c, q.get('name') || ''];
  }, [code]);

  const [quote, setQuote] = useState<any>(null);
  const [period, setPeriod] = useState<Period>('分时');
  const [klineRows, setKlineRows] = useState<string[]>([]);
  const [kline120Rows, setKline120Rows] = useState<string[]>([]);
  const [intraday, setIntraday] = useState<{ minutes: string[]; preClose: number; ticks: any[]; days?: { date: string; minutes: string[] }[] } | null>(null);
  const [sideTab, setSideTab] = useState<SideTab>('orderbook');
  const [showTickModal, setShowTickModal] = useState(false);
  const [moreInfoOpen, setMoreInfoOpen] = useState(true);
  const [dtab, setDtab] = useState<SubTab>('news');
  const [profileSubTab, setProfileSubTab] = useState<ProfileSubTab>('essential');
  const [subData, setSubData] = useState<any>(null);
  const [orderModal, setOrderModal] = useState<{ open: boolean; type: 'buy' | 'sell' } | null>(null);
  const [orderAmount, setOrderAmount] = useState<string>('100');
  const [orderPrice, setOrderPrice] = useState<string>('');
  const [toast, setToast] = useState('');
  const [showFormulaEditor, setShowFormulaEditor] = useState(false);
  const tickRef = useRef<any>(null);
  const periodRef = useRef<Period>('分时');

  useEffect(() => {
    loadQuote();
    loadPeriod('分时');
    loadSubTab('news');
    loadKline120();
    schedule();
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realCode]);

  function schedule() {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      loadQuote();
      if (periodRef.current === '分时') loadPeriod('分时');
    }, Math.max(3000, settings.pollIntervalMs || 5000));
  }

  async function loadQuote() {
    const r = await api.quoteDetail(realCode);
    const diff = r?.data?.diff || [];
    if (diff[0]) {
      const n = diff[0];
      // 东财财务字段不稳定（限流返回空），为0时保留上次值避免闪烁
      setQuote((prev: any) => {
        if (prev) {
          if (!Number(n.f9)) n.f9 = prev.f9;
          if (!Number(n.f23)) n.f23 = prev.f23;
          if (!Number(n.f20)) n.f20 = prev.f20;
          if (!Number(n.f21)) n.f21 = prev.f21;
          if (!Number(n.f7)) n.f7 = prev.f7;
          if (!n.f127) n.f127 = prev.f127;
        }
        return n;
      });
    }
  }

  async function loadKline120() {
    const r = await api.kline(realCode, 'day', 120);
    setKline120Rows(r?.data?.klines || []);
  }

  async function loadPeriod(p: Period) {
    periodRef.current = p;
    setPeriod(p);
    if (p === '分时') {
      const r = await api.intraday(realCode);
      if (r?.data) {
        setIntraday({ minutes: r.data.minutes || [], preClose: r.data.preClose || 0, ticks: r.data.ticks || [] });
        setKlineRows([]);
      }
    } else if (p === '五日') {
      const r = await api.intraday(realCode, 5);
      if (r?.data) {
        setIntraday({ minutes: [], preClose: r.data.preClose || 0, ticks: [], days: r.data.days || [] });
        setKlineRows([]);
      }
    } else {
      const map: Record<string, string> = { '日K': 'day', '周K': 'week', '月K': 'month' };
      const r = await api.kline(realCode, map[p], 120);
      setKlineRows(r?.data?.klines || []);
      setIntraday(null);
    }
  }

  async function loadSubTab(tab: SubTab) {
    setDtab(tab); setSubData(null);
    if (tab === 'news') setSubData(await api.stockNews(realCode));
    else if (tab === 'notice') setSubData(await api.stockNotice(realCode));
    else if (tab === 'finance') setSubData(await api.stockFinance(realCode));
    else if (tab === 'profile') {
      setProfileSubTab('essential');
      setSubData(await api.stockProfile(realCode, 'essential'));
    }
  }

  async function loadProfileSub(sub: ProfileSubTab) {
    setProfileSubTab(sub);
    setSubData(await api.stockProfile(realCode, sub));
  }

  const s = useMemo(() => quote ? mapEmDiffToStockItem(quote) : null, [quote]);
  const name = s?.name || initName || realCode;
  const codeDisplay = (s?.code || realCode).replace(/^(sh|sz|bj)/i, '');
  const price = Number(s?.price || 0);
  const preClose = Number(s?.preClose || 0);
  const chg = price - preClose;
  const rate = Number(s?.changeRate || 0);
  const up = rate >= 0;

  const inWatch = useMemo(() => {
    return (settings.stockPortfolio.groups || []).some((g) => g.codes.includes(realCode));
  }, [settings.stockPortfolio, realCode]);

  // 五档盘口（quote 字段 buy1-5/sell1-5）
  const orderBook = useMemo(() => {
    const q = quote || {};
    const sell = [5, 4, 3, 2, 1].map((n) => ({
      idx: '卖' + n,
      price: Number(q[`sell${n}`]) || 0,
      vol: Number(q[`sell${n}vol`]) || 0,
    })).filter((x) => x.price > 0);
    const buy = [1, 2, 3, 4, 5].map((n) => ({
      idx: '买' + n,
      price: Number(q[`buy${n}`]) || 0,
      vol: Number(q[`buy${n}vol`]) || 0,
    })).filter((x) => x.price > 0);
    return { sell, buy };
  }, [quote]);

  const allTicks: any[] = intraday?.ticks || [];
  const latestTicks = useMemo(() => allTicks.slice(Math.max(0, allTicks.length - 16)).reverse(), [intraday]);

  // 流通股本（筹码分布用）
  const floatShares = Number(quote?.f72) || 0;

  // 自定义公式指标：仅在 K 线周期下计算
  const customIndicators = useMemo(() => {
    if (!klineRows.length) return [];
    const data: KLineData[] = [];
    for (const r of klineRows) {
      const p = r.split(',');
      if (p.length < 5) continue;
      data.push({ date: p[0], open: +p[1], close: +p[2], high: +p[3], low: +p[4], vol: +(p[5] || 0) });
    }
    const out: any[] = [];
    for (const f of formulas) {
      if (!f.enabled) continue;
      try {
        const res = executeFormula(f, data);
        if (res.lines.some((l) => l.values.length)) out.push(res);
      } catch { /* 公式执行失败跳过 */ }
    }
    return out;
  }, [klineRows, formulas]);

  function doOrder() {
    const p = Number(orderPrice);
    const a = Number(orderAmount);
    if (!p || !a) return;
    const ok = placeOrder(orderModal?.type || 'buy', realCode, name, p, a);
    if (ok) {
      setToast(`${orderModal?.type === 'buy' ? '买入' : '卖出'}委托已提交`);
      setOrderModal(null);
      setTimeout(() => setToast(''), 2000);
    } else {
      setToast('委托失败（资金或持仓不足）');
      setTimeout(() => setToast(''), 2000);
    }
  }

  function openOrder(type: 'buy' | 'sell') {
    setOrderPrice(price ? price.toFixed(2) : '');
    setOrderAmount('100');
    setOrderModal({ open: true, type });
  }

  function renderOrderBook() {
    return (
      <>
        {orderBook.sell.length === 0 && orderBook.buy.length === 0 && <div className="loading">暂无盘口</div>}
        {orderBook.sell.map((row, i) => (
          <div key={'s' + i} className="ob-row">
            <span className="ob-label">{row.idx}</span>
            <span className="ob-price" style={{ color: row.price >= preClose ? 'var(--up)' : 'var(--down)' }}>
              {row.price.toFixed(2)}
            </span>
            <span className="ob-vol">{fmtVol(row.vol)}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
        {orderBook.buy.map((row, i) => (
          <div key={'b' + i} className="ob-row">
            <span className="ob-label">{row.idx}</span>
            <span className="ob-price" style={{ color: row.price >= preClose ? 'var(--up)' : 'var(--down)' }}>
              {row.price.toFixed(2)}
            </span>
            <span className="ob-vol">{fmtVol(row.vol)}</span>
          </div>
        ))}
      </>
    );
  }

  function renderTicks() {
    return (
      <>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {latestTicks.length === 0 && <div className="loading">暂无数据</div>}
          {latestTicks.map((t: any, i: number) => {
            const timeStr = String(t.time || '');
            const hh = timeStr.slice(0, 2), mm = timeStr.slice(2, 4);
            const prev = i < latestTicks.length - 1 ? Number(latestTicks[i + 1]?.price || 0) : Number(intraday?.preClose || 0);
            const cur = Number(t.price || 0);
            const tickUp = cur >= prev;
            return (
              <div className="tick-row" key={i}>
                <span className="tick-time">{hh}:{mm}</span>
                <span className={'tick-price ' + (tickUp ? 'text-up' : 'text-down')}>{cur.toFixed(2)}</span>
                <span className="tick-vol">{fmtVol(t.vol)}</span>
              </div>
            );
          })}
        </div>
        {allTicks.length > 16 && (
          <div className="kl-more" onClick={() => setShowTickModal(true)}>查看全部</div>
        )}
      </>
    );
  }

  function renderChips() {
    return (
      <>
        <ChipsChart
          rows={kline120Rows}
          floatShares={floatShares}
          riseColor={settings.riseColor}
          fallColor={settings.fallColor}
        />
      </>
    );
  }

  function renderProfilePanel() {
    const subTabs: { id: ProfileSubTab; label: string }[] = [
      { id: 'essential', label: '操盘必读' },
      { id: 'company', label: '公司概况' },
      { id: 'holder', label: '股东研究' },
      { id: 'industry', label: '行业分析' },
    ];
    return (
      <div>
        <div style={{ display: 'flex', gap: 4, padding: '6px 0', flexWrap: 'wrap' }}>
          {subTabs.map((t) => (
            <button key={t.id}
              className={'detail-tab' + (profileSubTab === t.id ? ' active' : '')}
              style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={() => loadProfileSub(t.id)}>{t.label}</button>
          ))}
        </div>
        {!subData && <div className="loading">加载中…</div>}
        <FinanceItems items={subData?.data?.items || []} />
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingBottom: 'calc(72px + var(--safe-bottom))' }}>
      <div className="content-scroll">
        <div className="detail-hdr-bar">
          <div>
            <span className="nm">{escapeHtml(name)}</span>
            <span className="cd">{codeDisplay}</span>
            <span className="detail-tags">
              {s?.isSHConnect && <span className="tag-sh">沪股通</span>}
              {s?.isSZConnect && <span className="tag-sz">深股通</span>}
              {s?.isMargin && <span className="tag-margin">融</span>}
            </span>
          </div>
          <div className="acts">
            <button onClick={() => setMoreInfoOpen(!moreInfoOpen)} style={{ fontSize: 11, padding: '4px 8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 4, color: 'var(--fg)', cursor: 'pointer' }}>
              {moreInfoOpen ? '收起▲' : '更多▼'}
            </button>
            <button onClick={() => navigate('/ai')}>🤖</button>
          </div>
        </div>

        <div className="detail-price-board">
          <div>
            <div className="lbl">最新</div>
            <div className={'big ' + (up ? 'text-up' : 'text-down')}>{price ? price.toFixed(2) : '--'}</div>
          </div>
          <div>
            <div className="lbl">涨跌幅</div>
            <div className={'val ' + (up ? 'text-up' : 'text-down')}>
              {upSign(rate)}{rate.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="lbl">涨跌额</div>
            <div className={'val ' + (up ? 'text-up' : 'text-down')}>
              {upSign(chg)}{chg.toFixed(2)}
            </div>
          </div>
        </div>

        {/* 紧凑字段行（更多=全部展开 / 收起=全部折叠） */}
        {moreInfoOpen && (
          <>
            <div className="detail-compact">
              <span className="detail-smi"><i>今开</i><b>{Number(s?.open || 0).toFixed(2)}</b></span>
              <span className="detail-smi"><i>昨收</i><b>{preClose.toFixed(2)}</b></span>
              <span className="detail-smi"><i>最高</i><b className="text-up">{Number(s?.high || 0).toFixed(2)}</b></span>
              <span className="detail-smi"><i>最低</i><b className="text-down">{Number(s?.low || 0).toFixed(2)}</b></span>
            </div>
            <div className="detail-compact">
              <span className="detail-smi"><i>换手</i><b>{Number(s?.turnoverRate || 0).toFixed(2)}%</b></span>
              <span className="detail-smi"><i>总手</i><b>{fmtWan(s?.volume || 0)}</b></span>
              <span className="detail-smi"><i>金额</i><b>{fmtYi(s?.amount || 0)}</b></span>
              <span className="detail-smi"><i>振幅</i><b>{Number(s?.amplitude || 0).toFixed(2)}%</b></span>
            </div>
            <div className="detail-compact">
              <span className="detail-smi"><i>总市值</i><b>{fmtYi(s?.marketCap || 0)}</b></span>
              <span className="detail-smi"><i>流通值</i><b>{fmtYi(s?.floatCap || 0)}</b></span>
              <span className="detail-smi"><i>市盈</i><b>{s?.pe ? Number(s.pe).toFixed(2) : '--'}</b></span>
              <span className="detail-smi"><i>市净</i><b>{s?.pb ? Number(s.pb).toFixed(2) : '--'}</b></span>
            </div>
            <div className="detail-compact detail-more">
              <span className="detail-smi"><i>行业</i><b>{s?.industry || '--'}</b></span>
              {s?.isMargin && <span className="detail-smi"><i>融资余额</i><b>{fmtYi(Number(s?.marginBalance || 0))}</b></span>}
              <span className="detail-smi"><i>市盈率TTM</i><b>{s?.pe ? Number(s.pe).toFixed(2) : '--'}</b></span>
            </div>
          </>
        )}

        <div className="detail-period-tabs">
          {PERIODS.map((p) => (
            <button key={p} className={period === p ? 'active' : ''} onClick={() => loadPeriod(p)}>{p}</button>
          ))}
          <button style={{ marginLeft: 'auto' }} onClick={() => setShowFormulaEditor(true)} title="指标管理">⚙</button>
        </div>

        <div className="detail-chart-wrap">
          <div className="detail-chart-main">
            <KLineChart
              rows={klineRows}
              intraday={intraday || undefined}
              mainHeight={220}
              riseColor={settings.riseColor}
              fallColor={settings.fallColor}
              customIndicators={customIndicators}
            />
          </div>
          <div className="detail-orderbook">
            <div className="kl-side-tabs">
              <button className={sideTab === 'orderbook' ? 'active' : ''} onClick={() => setSideTab('orderbook')}>五档</button>
              <button className={sideTab === 'ticks' ? 'active' : ''} onClick={() => setSideTab('ticks')}>逐笔</button>
              <button className={sideTab === 'chips' ? 'active' : ''} onClick={() => setSideTab('chips')}>筹码</button>
            </div>
            {sideTab === 'orderbook' && renderOrderBook()}
            {sideTab === 'ticks' && renderTicks()}
            {sideTab === 'chips' && renderChips()}
          </div>
        </div>

        {customIndicators.length > 0 && (
          <div className="detail-sub-indicators">
            {customIndicators.map((ind, i) => (
              <span key={i}>{ind.name}{ind.type === 'main' ? '·主图' : '·副图'}</span>
            ))}
          </div>
        )}

        {/* 详情 Tabs：资讯/公告/财务/资料 */}
        <div className="detail-tabs" style={{ marginTop: 8 }}>
          {(['news', 'notice', 'finance', 'profile'] as SubTab[]).map((t) => (
            <button key={t} className={'detail-tab' + (dtab === t ? ' active' : '')} onClick={() => loadSubTab(t)}>
              {{ news: '资讯', notice: '公告', finance: '财务', profile: '资料' }[t]}
            </button>
          ))}
        </div>
        <div className="detail-panel">
          {(dtab === 'news' || dtab === 'notice') && (
            <>
              {!subData && <div className="loading">加载中…</div>}
              <NewsNoticeList list={subData?.data?.list || []} />
            </>
          )}
          {dtab === 'finance' && (
            <>
              {!subData && <div className="loading">加载中…</div>}
              <FinanceItems items={subData?.data?.items || []} />
            </>
          )}
          {dtab === 'profile' && renderProfilePanel()}
        </div>
      </div>

      <div className="detail-action-bar">
        <button className="btn-buy" onClick={() => openOrder('buy')}>买入</button>
        <button className="btn-sell" onClick={() => openOrder('sell')}>卖出</button>
        <button className="btn-sub" onClick={() => navigate('/settings')}>撤单</button>
        <button className="btn-sub" onClick={() => inWatch ? delWatch(realCode) : addWatch({ code: realCode, name })}>
          {inWatch ? '已自选' : '设自选'}
        </button>
        <button className="btn-sub" onClick={() => setShowFormulaEditor(true)}>指标</button>
      </div>

      {/* 逐笔全部成交 Modal */}
      {showTickModal && (
        <div className="modal-overlay" onClick={() => setShowTickModal(false)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>全部成交（{escapeHtml(name)}）</div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {allTicks.slice().reverse().map((t: any, i: number) => {
                const timeStr = String(t.time || '');
                const hh = timeStr.slice(0, 2), mm = timeStr.slice(2, 4);
                const prev = i > 0 ? Number(allTicks[allTicks.length - i]?.price || 0) : Number(intraday?.preClose || 0);
                const cur = Number(t.price || 0);
                const tickUp = cur >= prev;
                return (
                  <div className="tick-row" key={i}>
                    <span className="tick-time">{hh}:{mm}</span>
                    <span className={'tick-price ' + (tickUp ? 'text-up' : 'text-down')}>{cur.toFixed(2)}</span>
                    <span className="tick-vol">{fmtVol(t.vol)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {orderModal?.open && (
        <div className="modal-overlay" onClick={() => setOrderModal(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: orderModal.type === 'buy' ? 'var(--up)' : '#4a6cf7' }}>
              {orderModal.type === 'buy' ? '买入' : '卖出'} {name}
            </div>
            <div className="field"><label>代码</label><input readOnly value={codeDisplay} /></div>
            <div className="field"><label>价格</label><input type="number" value={orderPrice} onChange={(e) => setOrderPrice(e.target.value)} /></div>
            <div className="field"><label>数量</label><input type="number" value={orderAmount} onChange={(e) => setOrderAmount(e.target.value)} /></div>
            <div className="actions">
              <button className="ghost" onClick={() => setOrderModal(null)}>取消</button>
              <button className="primary" onClick={doOrder}>确认{orderModal.type === 'buy' ? '买入' : '卖出'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,.8)', color: '#fff', padding: '10px 18px', borderRadius: 6, zIndex: 300, fontSize: 13 }}>
          {toast}
        </div>
      )}

      {showFormulaEditor && (
        <FormulaEditor
          formulas={formulas}
          onChange={updateFormulas}
          onClose={() => setShowFormulaEditor(false)}
        />
      )}
    </div>
  );
}

function fmtVol(v: number | string): string {
  const n = Number(v) || 0;
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return String(n);
}

function NewsNoticeList({ list }: { list: any[] }) {
  if (!list || !list.length) return <div className="loading">暂无数据</div>;
  return (
    <>
      {list.map((n, i) => {
        const url = n.url || '';
        const open = () => { if (url) window.open(url, '_blank', 'noopener'); };
        return (
          <div key={i} className="news-item" onClick={open}>
            <div className="time">{escapeHtml(n.time || '')}{n.source ? ' · ' + escapeHtml(n.source) : ''}</div>
            <div className="title">{escapeHtml(n.title || '')}</div>
            {n.content && <div className="digest">{escapeHtml(String(n.content).replace(/<[^>]+>/g, ''))}</div>}
          </div>
        );
      })}
    </>
  );
}

function FinanceItems({ items }: { items: { label: string; value: string; color?: string }[] }) {
  if (!items || !items.length) return <div className="loading">暂无数据</div>;
  return (
    <div className="card" style={{ padding: 0, borderRadius: 8, overflow: 'hidden', background: 'transparent' }}>
      {items.map((it, i) => (
        <div key={i} className="flex items-center jcsb"
          style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
          <div className="text-muted" style={{ fontSize: 12 }}>{it.label}</div>
          <div className={'val ' + (it.color === '#23c343' ? 'text-down' : it.color ? 'text-up' : '')}
            style={{ color: it.color || undefined, fontSize: 13 }}>
            {it.value || '-'}
          </div>
        </div>
      ))}
    </div>
  );
}
