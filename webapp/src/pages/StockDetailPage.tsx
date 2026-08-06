// ============================================
// 股票详情页：顶部价格 + K线(分时/各周期/筹码) + 侧边栏(五档/逐笔/筹码) + 资讯/公告/财务/资料 Tab
// ============================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '../router/useRouter';
import { useSettings } from '../store/useSettings';
import { api } from '../api/client';
import KLineChart from '../components/KLineChart';
import ChipsChart from '../components/ChipsChart';
import {
  fmtYi, upSign, mapEmDiffToStockItem, escapeHtml, normalizeCode,
} from '../../local-shared/utils';

type SubTab = 'news' | 'notice' | 'finance' | 'profile';
type ProfileSubTab = 'essential' | 'company' | 'holder' | 'industry';
type SideTab = 'orderbook' | 'ticks' | 'chips';

export default function StockDetailPage({ code }: { code: string }) {
  const { navigate } = useRouter();
  const { settings, addWatch, delWatch } = useSettings();
  const [realCode, name] = useMemo(() => {
    const c = normalizeCode(code.split('?')[0]);
    const q = new URLSearchParams(code.includes('?') ? code.split('?')[1] : '');
    return [c, q.get('name') || ''];
  }, [code]);

  const [quote, setQuote] = useState<any>(null);
  const [klinePeriod, setKlinePeriod] = useState<string>('intraday');
  const [klineRows, setKlineRows] = useState<string[]>([]);
  const [kline120Rows, setKline120Rows] = useState<string[]>([]);
  const [intraday, setIntraday] = useState<{ minutes: string[]; preClose: number; ticks: any[]; orderBook: any } | null>(null);
  const [dtab, setDtab] = useState<SubTab>('news');
  const [profileSubTab, setProfileSubTab] = useState<ProfileSubTab>('essential');
  const [subData, setSubData] = useState<any>(null);
  const [sideTab, setSideTab] = useState<SideTab>('orderbook');
  const [showTickModal, setShowTickModal] = useState<boolean>(false);
  const [mobileSideOpen, setMobileSideOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth < 480 : false);
  const tickRef = useRef<any>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 480);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Load
  useEffect(() => {
    loadQuote();
    loadKline('intraday');
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
      if (klinePeriod === 'intraday') loadKline('intraday');
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

  async function loadKline(period: string) {
    setKlinePeriod(period);
    if (period === 'intraday') {
      const r = await api.intraday(realCode);
      if (r?.data) {
        setIntraday({
          minutes: r.data.minutes || [],
          preClose: r.data.preClose || 0,
          ticks: r.data.ticks || [],
          orderBook: r.data.orderBook || null,
        });
        setKlineRows([]);
      }
    } else if (period === 'chips') {
      setIntraday(null);
    } else {
      const r = await api.kline(realCode, period);
      setKlineRows(r?.data?.klines || []);
      setIntraday(null);
    }
  }

  async function loadKline120() {
    const r = await api.kline(realCode, 'day', 120);
    setKline120Rows(r?.data?.klines || []);
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

  const s = quote ? mapEmDiffToStockItem(quote) : null;
  const codeN = s?.code || realCode.replace(/^(sh|sz|bj)/i, '');
  const nm = s?.name || name || codeN;
  const price = Number(s?.price || 0);
  const rate = Number(s?.changeRate || 0);
  const up = rate >= 0;
  const chg = price - Number(s?.preClose || 0);
  const inWatch = (settings.stockPortfolio.groups || []).some((g) => g.codes.includes(realCode));

  // 五档盘口（来自 quote 字段）
  const ob = quote || {};
  const buyLevels = [1,2,3,4,5].map((n) => ({
    price: ob[`buy${n}`], vol: ob[`buy${n}vol`]
  })).filter((x) => Number(x.price) > 0);
  const sellLevels = [5,4,3,2,1].map((n) => ({
    price: ob[`sell${n}`], vol: ob[`sell${n}vol`]
  })).filter((x) => Number(x.price) > 0);

  // 逐笔 ticks（最新 16 条倒序）
  const allTicks: any[] = intraday?.ticks && Array.isArray(intraday.ticks) ? intraday.ticks : [];
  const latest16Ticks = allTicks.slice(Math.max(0, allTicks.length - 16)).reverse();

  // 流通股本
  const floatShares = Number(quote?.f72) || 0;

  const periods = [
    { id: 'intraday', label: '分时' },
    { id: '5m', label: '5分' }, { id: '15m', label: '15分' },
    { id: '30m', label: '30分' }, { id: '60m', label: '60分' },
    { id: 'day', label: '日K' }, { id: 'week', label: '周K' }, { id: 'month', label: '月K' },
    { id: 'chips', label: '筹码' },
  ];

  const sideTabs: { id: SideTab; label: string }[] = [
    { id: 'orderbook', label: '五档' },
    { id: 'ticks', label: '逐笔' },
    { id: 'chips', label: '筹码' },
  ];

  function renderOrderBook() {
    return (
      <div id="klSideBook">
        <div className="kl-side-title">五档盘口</div>
        <div id="orderBook">
          {sellLevels.length === 0 && buyLevels.length === 0 && <div className="text-muted" style={{ fontSize: 10 }}>暂无盘口</div>}
          {sellLevels.map((lv, i) => (
            <div className="ob-row" key={'s' + i}>
              <span className="ob-label">卖{5 - i}</span>
              <span className="ob-price text-down">{Number(lv.price).toFixed(2)}</span>
              <span className="ob-vol">{fmtVol(lv.vol)}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
          {buyLevels.map((lv, i) => (
            <div className="ob-row" key={'b' + i}>
              <span className="ob-label">买{i + 1}</span>
              <span className="ob-price text-up">{Number(lv.price).toFixed(2)}</span>
              <span className="ob-vol">{fmtVol(lv.vol)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderTicks() {
    return (
      <div id="klSideTicks">
        <div className="kl-side-title">分时逐笔</div>
        <div id="tickList" style={{ maxHeight: isMobile ? 260 : 340, overflowY: 'auto' }}>
          {latest16Ticks.length === 0 && <div className="text-muted" style={{ fontSize: 10, padding: 4 }}>暂无数据</div>}
          {latest16Ticks.map((t: any, i: number) => {
            const timeStr = String(t.time || '');
            const hh = timeStr.slice(0, 2);
            const mm = timeStr.slice(2, 4);
            const prev = i < latest16Ticks.length - 1 ? Number(latest16Ticks[i + 1]?.price || 0) : Number(intraday?.preClose || 0);
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
      </div>
    );
  }

  function renderChips() {
    return (
      <div id="klSideChips">
        <div className="kl-side-title">筹码分布</div>
        <ChipsChart
          rows={kline120Rows}
          floatShares={floatShares}
          riseColor={settings.riseColor}
          fallColor={settings.fallColor}
        />
      </div>
    );
  }

  function renderSidePanel() {
    return (
      <>
        <div className="kl-side-tabs">
          {sideTabs.map((t) => (
            <button key={t.id} className={sideTab === t.id ? 'active' : ''}
              onClick={() => setSideTab(t.id)}>{t.label}</button>
          ))}
        </div>
        {sideTab === 'orderbook' && renderOrderBook()}
        {sideTab === 'ticks' && renderTicks()}
        {sideTab === 'chips' && renderChips()}
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
        <div style={{ display: 'flex', gap: 4, padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
          {subTabs.map((t) => (
            <button key={t.id}
              className={'detail-tab' + (profileSubTab === t.id ? ' active' : '')}
              style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={() => loadProfileSub(t.id)}>{t.label}</button>
          ))}
        </div>
        <div id="profileContent">
          {!subData && <div className="loading">加载中…</div>}
          <FinanceItems items={subData?.data?.items || []} />
        </div>
      </div>
    );
  }

  const mainChartContent = klinePeriod === 'chips' ? (
    <div style={{ flex: 1, padding: '10px 6px', overflow: 'auto' }}>
      <ChipsChart
        rows={kline120Rows}
        floatShares={floatShares}
        riseColor={settings.riseColor}
        fallColor={settings.fallColor}
      />
    </div>
  ) : (
    <KLineChart
      rows={klineRows}
      intraday={intraday || undefined}
      riseColor={settings.riseColor}
      fallColor={settings.fallColor}
    />
  );

  function goBack() {
    let from = '/';
    try { from = sessionStorage.getItem('stockDetailFrom') || '/'; } catch { /* ignore */ }
    navigate(from);
  }

  const [moreInfoOpen, setMoreInfoOpen] = useState(false);

  return (
    <div className="page detail-page">
      {/* 顶部：价格 */}
      <div className="detail-top">
        <div className="detail-hdr">
          <span className="nm">{escapeHtml(nm)}</span>
          <span className="cd">{codeN}</span>
          <span className="detail-tags">
            {s?.isSHConnect && <span className="tag-sh">沪股通</span>}
            {s?.isSZConnect && <span className="tag-sz">深股通</span>}
            {s?.isMargin && <span className="tag-margin">融资融券</span>}
          </span>
        </div>
        {/* 第一行：大价格（左） + 今开/最高/最低（右） */}
        <div className="detail-row-1">
          <span className={'detail-price ' + (up ? 'text-up' : 'text-down')}>{price.toFixed(2)}</span>
          <div className="detail-row-1-right">
            <span className="detail-smi"><i>今开</i><b>{Number(s?.open || 0).toFixed(2)}</b></span>
            <span className="detail-smi"><i>昨收</i><b>{Number(s?.preClose || 0).toFixed(2)}</b></span>
            <span className="detail-smi"><i>最高</i><b className="text-up">{Number(s?.high || 0).toFixed(2)}</b></span>
            <span className="detail-smi"><i>最低</i><b className="text-down">{Number(s?.low || 0).toFixed(2)}</b></span>
          </div>
        </div>
        {/* 第二行：涨跌幅%（大）+涨跌额（小）（左） + 换手/总手/金额（右） */}
        <div className="detail-row-2">
          <div className="detail-row-2-left">
            <span className={'detail-rate ' + (up ? 'text-up' : 'text-down')}>
              {upSign(rate)}{rate.toFixed(2)}%
            </span>
            <span className={'detail-chg ' + (up ? 'text-up' : 'text-down')}>
              {upSign(chg)}{chg.toFixed(2)}
            </span>
          </div>
          <div className="detail-row-2-right">
            <span className="detail-smi"><i>换手</i><b>{Number(s?.turnoverRate || 0).toFixed(2)}%</b></span>
            <span className="detail-smi"><i>总手</i><b>{fmtYi(Number(s?.volume || 0))}</b></span>
            <span className="detail-smi"><i>金额</i><b>{fmtYi(Number(s?.amount || 0))}</b></span>
          </div>
        </div>
        {/* 第三行：市值/PE/PB + 更多按钮 */}
        <div className="detail-row-3">
          <div className="detail-row-3-left">
            <span className="detail-smi"><i>总市值</i><b>{fmtYi(Number(s?.marketCap || 0))}</b></span>
            <span className="detail-smi"><i>流通</i><b>{fmtYi(Number(s?.floatCap || 0))}</b></span>
            <span className="detail-smi"><i>市盈</i><b>{s?.pe ? Number(s.pe).toFixed(2) : '--'}</b></span>
            <span className="detail-smi"><i>市净</i><b>{s?.pb ? Number(s.pb).toFixed(2) : '--'}</b></span>
          </div>
          <button className="detail-more-btn" onClick={() => setMoreInfoOpen(!moreInfoOpen)}>
            {moreInfoOpen ? '收起 ▲' : '更多 ▼'}
          </button>
        </div>
        {/* 展开的详细信息 */}
        {moreInfoOpen && (
          <div className="detail-more">
            <div className="detail-more-row">
              <span className="detail-smi"><i>行业</i><b>{s?.industry || '--'}</b></span>
              <span className="detail-smi"><i>振幅</i><b>{Number(s?.amplitude || 0).toFixed(2)}%</b></span>
            </div>
            {s?.isMargin && (
              <div className="detail-more-row">
                <span className="detail-smi"><i>融资余额</i><b>{fmtYi(Number(s?.marginBalance || 0))}</b></span>
                <span className="detail-smi"><i>融券余额</i><b>{fmtYi(Number(s?.marginBalance || 0))}</b></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* K线工具栏 */}
      <div className="kl-toolbar">
        {periods.map((p) => (
          <button key={p.id} className={'kl-pbtn' + (klinePeriod === p.id ? ' active' : '')}
            onClick={() => loadKline(p.id)}>{p.label}</button>
        ))}
      </div>

      {/* K线主图 + 侧边栏 */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="kl-chart-wrap" style={{ flexDirection: isMobile ? 'column' : 'row' }}>
          <div className="kl-chart" style={{ flex: 1, minWidth: 0 }}>
            {mainChartContent}
          </div>
          {!isMobile && (
            <div className="kl-side">
              {renderSidePanel()}
            </div>
          )}
        </div>

        {/* 移动端：下方可折叠侧边栏 */}
        {isMobile && (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 10px', cursor: 'pointer', fontSize: 12, userSelect: 'none',
              }}
              onClick={() => setMobileSideOpen(!mobileSideOpen)}
            >
              <span style={{ opacity: 0.7 }}>{sideTabs.find((t) => t.id === sideTab)?.label || '盘口'}</span>
              <span style={{ opacity: 0.5 }}>{mobileSideOpen ? '▲' : '▼'}</span>
            </div>
            {mobileSideOpen && (
              <div className="kl-side" style={{ width: '100%', borderLeft: 'none', borderTop: '1px solid var(--border)' }}>
                {renderSidePanel()}
              </div>
            )}
          </div>
        )}

        {/* 详情子 Tabs */}
        <div className="detail-tabs">
          {(['news','notice','finance','profile'] as SubTab[]).map((t) => (
            <button key={t} className={'detail-tab' + (dtab === t ? ' active' : '')}
              onClick={() => loadSubTab(t)}>
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

      {/* 底部操作 */}
      <div className="detail-actions">
        <button className={inWatch ? 'btn-del' : 'btn-back'} onClick={() => inWatch ? delWatch(realCode) : addWatch(realCode)}>
          {inWatch ? '删除自选' : '加入自选'}
        </button>
        <button className="btn-back" onClick={goBack}>返回</button>
      </div>

      {/* 逐笔 Modal */}
      {showTickModal && (
        <div className="kl-modal-overlay" onClick={() => setShowTickModal(false)}>
          <div className="kl-modal" onClick={(e: any) => e.stopPropagation()}>
            <div className="kl-modal-hdr">
              <span>全部成交（{escapeHtml(nm)}）</span>
              <button onClick={() => setShowTickModal(false)}>×</button>
            </div>
            <div className="kl-modal-body">
              {allTicks.length === 0 && <div className="loading">暂无数据</div>}
              {allTicks.slice().reverse().map((t: any, i: number) => {
                const timeStr = String(t.time || '');
                const hh = timeStr.slice(0, 2);
                const mm = timeStr.slice(2, 4);
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
    </div>
  );
}

function fmtVol(v: number | string): string {
  const n = Number(v) || 0;
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return String(n);
}

function NewsNoticeList({ list }: { list: any[] }) {
  if (!list.length) return <div className="loading">暂无数据</div>;
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
