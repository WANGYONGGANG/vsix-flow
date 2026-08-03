// ============================================
// 股票详情页：顶部价格 + K线(分时/各周期) + 五档盘口 + 资讯/公告/财务/资料 Tab
// ============================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '../router/useRouter';
import { useSettings } from '../store/useSettings';
import { api } from '../api/client';
import KLineChart from '../components/KLineChart';
import {
  fmtYi, upSign, mapEmDiffToStockItem, escapeHtml, normalizeCode,
} from '../../local-shared/utils';

type SubTab = 'news' | 'notice' | 'finance' | 'profile';

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
  const [intraday, setIntraday] = useState<{ minutes: string[]; preClose: number; ticks: any; orderBook: any } | null>(null);
  const [dtab, setDtab] = useState<SubTab>('news');
  const [subData, setSubData] = useState<any>(null);
  const tickRef = useRef<any>(null);

  // Load
  useEffect(() => {
    loadQuote();
    loadKline('intraday');
    loadSubTab('news');
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
    const r = await api.quote([realCode]);
    const diff = r?.data?.diff || [];
    if (diff[0]) setQuote(diff[0]);
  }

  async function loadKline(period: string) {
    setKlinePeriod(period);
    if (period === 'intraday') {
      const r = await api.intraday(realCode);
      if (r?.data) {
        setIntraday({
          minutes: r.data.minutes || [], preClose: r.data.preClose || 0,
          ticks: [], orderBook: null,
        });
        setKlineRows([]);
      }
    } else {
      const r = await api.kline(realCode, period);
      setKlineRows(r?.data?.klines || []);
      setIntraday(null);
    }
  }

  async function loadSubTab(tab: SubTab) {
    setDtab(tab); setSubData(null);
    if (tab === 'news') setSubData(await api.stockNews(realCode));
    else if (tab === 'notice') setSubData(await api.stockNotice(realCode));
    else if (tab === 'finance') setSubData(await api.stockFinance(realCode));
    else if (tab === 'profile') setSubData(await api.stockProfile(realCode, 'essential'));
  }

  const s = quote ? mapEmDiffToStockItem(quote) : null;
  const codeN = s?.code || realCode.replace(/^(sh|sz|bj)/i, '');
  const nm = s?.name || name || codeN;
  const price = Number(s?.price || 0);
  const rate = Number(s?.changeRate || 0);
  const up = rate >= 0;
  const chg = price - Number(s?.preClose || 0);
  const inWatch = (settings.stockPortfolio.groups || []).some((g) => g.codes.includes(realCode));

  // 五档盘口（来自腾讯行情）
  const ob = quote || {};
  const buyLevels = [1,2,3,4,5].map((n) => ({
    price: ob[`buy${n}`], vol: ob[`buy${n}vol`]
  })).filter((x) => x.price > 0);
  const sellLevels = [5,4,3,2,1].map((n) => ({
    price: ob[`sell${n}`], vol: ob[`sell${n}vol`]
  })).filter((x) => x.price > 0);

  const periods = [
    { id: 'intraday', label: '分时' },
    { id: '5m', label: '5分' }, { id: '15m', label: '15分' },
    { id: '30m', label: '30分' }, { id: '60m', label: '60分' },
    { id: 'day', label: '日K' }, { id: 'week', label: '周K' }, { id: 'month', label: '月K' },
  ];

  return (
    <div className="page">
      {/* 顶部：返回 + 价格 */}
      <div className="detail-top">
        <button className="back-btn" onClick={() => navigate('/')}>← 返回</button>
        <div className="detail-hdr">
          <span className="nm">{escapeHtml(nm)}</span>
          <span className="cd">{codeN}</span>
        </div>
        <div className={'detail-price ' + (up ? 'text-up' : 'text-down')}>{price.toFixed(2)}</div>
        <div>
          <span className={'detail-tag ' + (up ? 'tag-up' : 'tag-down')}>
            {upSign(chg)}{chg.toFixed(2)} ({upSign(rate)}{rate.toFixed(2)}%)
          </span>
        </div>
        <div className="detail-grid">
          {[
            ['昨收', Number(s?.preClose || 0).toFixed(2), ''],
            ['开盘', Number(s?.open || 0).toFixed(2), ''],
            ['最高', Number(s?.high || 0).toFixed(2), 'text-up'],
            ['最低', Number(s?.low || 0).toFixed(2), 'text-down'],
            ['成交量', fmtYi((Number(s?.volume || 0))), ''],
            ['成交额', fmtYi(Number(s?.amount || 0)), ''],
            ['换手率', Number(s?.turnoverRate || 0).toFixed(2) + '%', ''],
            ['涨跌额', (upSign(chg) + chg.toFixed(2)), up ? 'text-up' : 'text-down'],
          ].map(([lbl, val, cls], i) => (
            <div key={i} className="detail-cell">
              <div className="lbl">{lbl}</div>
              <div className={'val ' + cls}>{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* K线工具栏 */}
      <div className="kl-toolbar">
        {periods.map((p) => (
          <button key={p.id} className={'kl-pbtn' + (klinePeriod === p.id ? ' active' : '')}
            onClick={() => loadKline(p.id)}>{p.label}</button>
        ))}
      </div>

      {/* K线主图 + 五档盘口（小屏时盘口放在详情 tab 里？这里紧凑布局） */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="kl-chart-wrap">
          <KLineChart
            rows={klineRows}
            intraday={intraday || undefined}
            riseColor={settings.riseColor}
            fallColor={settings.fallColor}
          />
          <div className="kl-side" style={{ display: window.innerWidth < 420 ? 'none' : undefined }}>
            <div className="kl-side-title">五档盘口</div>
            <div id="orderBook">
              {sellLevels.length === 0 && buyLevels.length === 0 && <div className="text-muted" style={{ fontSize: 10 }}>暂无盘口</div>}
              {sellLevels.map((lv, i) => (
                <div className="ob-row" key={'s' + i}>
                  <span className="ob-label">卖{6 - 1 - i}</span>
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
            <div className="kl-side-title" style={{ marginTop: 8 }}>分时成交</div>
            <div className="text-muted" style={{ fontSize: 10 }}>当日分时逐笔</div>
          </div>
        </div>

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
          {!subData && <div className="loading">加载中…</div>}
          {(dtab === 'news' || dtab === 'notice') && (
            <NewsNoticeList list={subData?.data?.list || []} />
          )}
          {dtab === 'finance' && <FinanceItems items={subData?.data?.items || []} />}
          {dtab === 'profile' && <FinanceItems items={subData?.data?.items || []} />}
        </div>
      </div>

      {/* 底部操作 */}
      <div className="detail-actions">
        <button className={inWatch ? 'btn-del' : 'btn-back'} onClick={() => inWatch ? delWatch(realCode) : addWatch(realCode)}>
          {inWatch ? '删除自选' : '加入自选'}
        </button>
        <button className="btn-back" onClick={() => navigate('/')}>返回行情</button>
      </div>
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
