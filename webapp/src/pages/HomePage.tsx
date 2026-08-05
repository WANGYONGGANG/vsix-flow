// ============================================
// 首页：行情中心（12 个 Tabs + 轮询）
// ============================================

import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../store/useSettings';
import { useRouter } from '../router/useRouter';
import { api } from '../api/client';
import {
  fmtYi, upSign, normalizeCode, mapEmDiffToStockItem, escapeHtml,
} from '../../local-shared/utils';
import { CHG_TYPES, isAStockTradingHours } from '../../local-shared/constants';

type TabId = 'market_overview' | 'fundFlow' | 'em_news' | 'realtime_news' |
  'sector_limit' | 'limit_leader' | 'strong_sector' | 'dragon_tiger' |
  'yesterday_limit' | 'alert' | 'hot_stocks' | 'watchlist';

export type { TabId };

const TABS: { id: TabId; label: string; icon: string; tip?: string }[] = [
  { id: 'market_overview', label: '概况', icon: '📊', tip: '指数涨跌家数/三市成交' },
  { id: 'fundFlow',       label: '资金', icon: '💰', tip: '板块资金流入流出 TOP10' },
  { id: 'em_news',        label: '新闻', icon: '📰', tip: '财经新闻搜索' },
  { id: 'realtime_news',  label: '快讯', icon: '⚡', tip: '实时财经快讯（可播报）' },
  { id: 'sector_limit',   label: '板块', icon: '🧩', tip: '板块涨幅/流入/涨跌家数' },
  { id: 'limit_leader',   label: '龙头', icon: '👑', tip: '今日连板龙头 ≥2 连板' },
  { id: 'strong_sector',  label: '强板', icon: '🔥', tip: '涨停股所属板块统计' },
  { id: 'dragon_tiger',   label: '龙虎', icon: '🐯', tip: '龙虎榜上榜个股/游资' },
  { id: 'yesterday_limit',label: '涨停', icon: '📈', tip: '今日涨停全池/封板时间' },
  { id: 'alert',          label: '异动', icon: '🚨', tip: '盘中异动实时提醒（可播报）' },
  { id: 'hot_stocks',     label: '热股', icon: '🌶️', tip: '热门/热门股票排行' },
  { id: 'watchlist',      label: '自选', icon: '⭐', tip: '我的自选股，支持拖拽排序' },
];
export { TABS };

export default function HomePage({
    initialTab = 'market_overview' as TabId,
    initialOnNavigate,
  }: { initialTab?: TabId; initialOnNavigate?: (to: string) => void } = {}) {
  const { settings, addWatch, delWatch, getWatchCodes, moveWatch, reorderWatch } = useSettings();
  const { navigate: routerNavigate } = useRouter();
  const navigate = initialOnNavigate || routerNavigate;
  const [tab, setTab] = useState<TabId>(initialTab);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [addDialog, setAddDialog] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const tickRef = useRef<any>(null);

  useEffect(() => { if (tab !== initialTab) setTab(initialTab); /* sync external control */ }, [initialTab]);

  function speakText(text: string) {
    if (!text) return;
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 1.1;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  }

  function getLatestText(): string {
    if (tab === 'realtime_news' || tab === 'em_news') {
      const list: any[] = data?.data?.list || data?.news || [];
      if (!list.length) return '';
      const n = list[0];
      const title = n.title || n.Art_Title || '';
      const content = n.content || n.digest || '';
      return (title + ' ' + content).replace(/<[^>]+>/g, '').trim();
    }
    if (tab === 'alert') {
      const list: any[] = data?.data?.list || data?.data?.allstock || [];
      if (!list.length) return '';
      const x = list[0];
      const label = CHG_TYPES[x.t] || ('类型' + x.t);
      return `${x.n || ''} ${label} ${x.i || ''}`;
    }
    return '';
  }

  function toggleVoice() {
    const next = !voiceOn;
    setVoiceOn(next);
    if (next) {
      const t = getLatestText();
      if (t) speakText(t);
    } else {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }
  }

  // 轮询：概况 / 自选 / 快讯 / 异动
  useEffect(() => {
    load();
    schedule();
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function schedule() {
    if (tickRef.current) clearInterval(tickRef.current);
    const pollOnly = settings.pollOnlyDuringAStockHours;
    tickRef.current = setInterval(() => {
      if (pollOnly && !isAStockTradingHours()) return;
      if (['market_overview', 'watchlist', 'realtime_news', 'alert'].includes(tab)) load();
    }, Math.max(3000, settings.pollIntervalMs || 5000));
  }

  async function load() {
    setLoading(true);
    try {
      let d: any = null;
      switch (tab) {
        case 'market_overview': {
          const [r1, r2] = await Promise.all([api.marketOverview(), api.marketOverviewDetail()]);
          d = { ...(r1 || {}), ...(r2 || {}), data: { ...(r1?.data || {}), ...(r2?.data || {}) } };
          break;
        }
        case 'fundFlow': {
          const [hy, gn] = await Promise.all([api.sinaBkzj(0), api.sinaBkzj(1)]);
          d = { industry: hy?.data?.list || [], concept: gn?.data?.list || [] };
          break;
        }
        case 'em_news': d = await api.emNewsSearch('A股 股市'); break;
        case 'realtime_news': d = await api.emNews(1, 60); break;
        case 'sector_limit': d = await api.sectorLimit(); break;
        case 'limit_leader':
        case 'strong_sector':
        case 'yesterday_limit': d = await api.ztPool(); break;
        case 'dragon_tiger': d = await api.lhb(); break;
        case 'alert': d = await api.stockChanges(); break;
        case 'hot_stocks': d = await api.hotStocks(); break;
        case 'watchlist': {
          const codes = getWatchCodes();
          d = codes.length ? (await api.quote(codes)) : { data: { diff: [] } };
          break;
        }
      }
      setData(d);
    } finally { setLoading(false); }
  }

  const voiceTabs: TabId[] = ['em_news', 'realtime_news', 'alert'];
  const showVoiceBtn = voiceTabs.includes(tab);

  return (
    <div className="page home-layout">
      {/* 移动端：保留顶部横滚 tab-bar（.tab-bar-mobile）；桌面端隐藏，使用 App 侧左侧栏 */}
      <div className="tab-bar-mobile">
        {TABS.map((t) => (
          <button
            key={t.id}
            title={t.tip}
            className={'tab-btn' + (tab === t.id ? ' active' : '')}
            onClick={() => setTab(t.id)}
          >
            <span className="tb-ic">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
        {showVoiceBtn && (
          <button
            className={'voice-toggle' + (voiceOn ? ' on' : '')}
            onClick={toggleVoice}
            title="语音播报最新一条"
          >
            <span className="tb-ic">{voiceOn ? '🔊' : '🔇'}</span>
            <span>{voiceOn ? '播报中' : '播报'}</span>
          </button>
        )}
      </div>

      <div className="content-scroll">
        {loading && !data && <div className="loading">加载中…</div>}

        {tab === 'market_overview' && <MarketOverview data={data} onNavigate={navigate} />}
        {tab === 'fundFlow' && <FundFlow data={data} onNavigate={navigate} />}
        {tab === 'em_news' && <NewsList data={data} search />}
        {tab === 'realtime_news' && <NewsList data={data} />}
        {tab === 'sector_limit' && <SectorLimit data={data} onNavigate={navigate} />}
        {tab === 'yesterday_limit' && <YesterdayLimit data={data} onNavigate={navigate} />}
        {tab === 'limit_leader' && <LimitLeader data={data} onNavigate={navigate} />}
        {tab === 'strong_sector' && <StrongSector data={data} />}
        {tab === 'dragon_tiger' && <LHBList data={data} onNavigate={navigate} />}
        {tab === 'alert' && <AlertList data={data} onNavigate={navigate} />}
        {tab === 'hot_stocks' && <HotStocks data={data} onNavigate={navigate} />}
        {tab === 'watchlist' && (
          <Watchlist
            data={data}
            onNavigate={navigate}
            onAdd={() => setAddDialog(true)}
            onDel={delWatch}
            moveWatch={moveWatch}
            reorderWatch={reorderWatch}
          />
        )}
      </div>

      {addDialog && (
        <AddWatchDialog
          onClose={() => setAddDialog(false)}
          onAdd={(c) => { addWatch(c); setAddDialog(false); setTimeout(() => load(), 100); }}
        />
      )}
    </div>
  );
}

// =============== 各 Tab 渲染函数 ===============
function aiNavigate(prompt: string, onNavigate: (t: string) => void) {
  onNavigate('/ai?prompt=' + encodeURIComponent(prompt));
}
function MarketOverview({ data, onNavigate }: any) {
  const diff: any[] = data?.data?.diff || data?.diff || [];
  const d = data?.data || data || {};
  const counts: any = d.counts || {};
  const trade: any = d.trade || {};
  const yzt: any = d.yesterdayZt || {};
  if (!diff.length) return <div className="loading">暂无指数数据</div>;
  const open = (code: string, name: string) => onNavigate(`/stock/${code}?name=${encodeURIComponent(name)}`);

  // 找到 涨停/跌停 数（如果 counts 里有）
  const ztCount = counts.zt || counts.limitUp || 0;
  const dtCount = counts.dt || counts.limitDown || 0;

  return (
    <>
      {/* 三大指数 — 东财风格大卡片 */}
      <div className="idx-banner">
        {diff.slice(0, 3).map((it) => {
          const s = mapEmDiffToStockItem(it); const up = s.changeRate >= 0;
          const bg = up ? 'var(--up)' : 'var(--down)';
          return (
            <div key={s.code} className="idx-card" style={{ background: bg }} onClick={() => open(s.code, s.name)}>
              <div className="idx-name">{escapeHtml(s.name)}</div>
              <div className="idx-price">{Number(s.price || 0).toFixed(2)}</div>
              <div className="idx-chg">
                {upSign(s.changeRate)}{Number(s.changeRate || 0).toFixed(2)}%
                <span className="idx-chg-abs">
                  {upSign(Number(s.change || 0))}{Number(s.change || 0).toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 涨跌家数 + 涨停跌停概览 */}
      {(counts.up > 0 || counts.down > 0) && (
        <div className="card market-summary-card">
          <div className="updown-bar">
            <div className="updown-rect">
              <div style={{ width: pct(counts.up, counts) + '%', background: 'var(--up)' }}></div>
              <div style={{ width: pct(counts.flat, counts) + '%', background: '#999' }}></div>
              <div style={{ width: pct(counts.down, counts) + '%', background: 'var(--down)' }}></div>
            </div>
            <div className="updown-legend">
              <span className="text-up">涨 {counts.up || 0}</span>
              <span className="text-muted">平 {counts.flat || 0}</span>
              <span className="text-down">跌 {counts.down || 0}</span>
            </div>
          </div>
          {(ztCount > 0 || dtCount > 0) && (
            <div className="limit-row">
              <span className="lr-item up">涨停 <b>{ztCount}</b></span>
              <span className="lr-sep">·</span>
              <span className="lr-item down">跌停 <b>{dtCount}</b></span>
            </div>
          )}
        </div>
      )}

      {/* 三市成交 + 昨日涨停 — 东财统计行 */}
      <div className="stat-row">
        {trade.total > 0 && (
          <div className="stat-card">
            <div className="stat-lbl">三市成交</div>
            <div className="stat-val text-accent">{fmtYi(trade.total || 0)}</div>
            <div className="stat-sub">沪 {fmtYi(trade.sh || 0)} · 深 {fmtYi(trade.sz || 0)}</div>
          </div>
        )}
        {yzt && yzt.count > 0 && (
          <div className="stat-card">
            <div className="stat-lbl">昨涨停表现</div>
            <div className="stat-val">{yzt.count} 家</div>
            <div className={Number(yzt.avgChange) >= 0 ? 'stat-sub text-up' : 'stat-sub text-down'}>
              均 {upSign(Number(yzt.avgChange))}{Number(yzt.avgChange || 0).toFixed(2)}%
            </div>
          </div>
        )}
      </div>

      {/* 快捷入口 — 九宫格风格 */}
      <div className="quick-grid">
        <button className="qg-item" onClick={() => aiNavigate('简单说说今天 A 股整体盘面', onNavigate)}>
          <span className="qg-ic">🎯</span><span className="qg-lb">盘面解读</span>
        </button>
        <button className="qg-item" onClick={() => aiNavigate('最近哪些板块 / 概念持续有资金流入？', onNavigate)}>
          <span className="qg-ic">💡</span><span className="qg-lb">资金主线</span>
        </button>
        <button className="qg-item" onClick={() => aiNavigate('给我一份适合上班族的选股 checklist', onNavigate)}>
          <span className="qg-ic">📈</span><span className="qg-lb">选股清单</span>
        </button>
        <button className="qg-item" onClick={() => aiNavigate('如何判断主力资金是真流入还是诱多？', onNavigate)}>
          <span className="qg-ic">🧠</span><span className="qg-lb">主力识别</span>
        </button>
      </div>

      {/* 指数列表 */}
      {diff.length > 3 && (
        <>
          <div className="section-title">全部指数</div>
          <table>
            <tbody>
              {diff.map((it) => {
                const s = mapEmDiffToStockItem(it); const up = s.changeRate >= 0;
                return (
                  <tr key={s.code} className="stock-row" onClick={() => open(s.code, s.name)}>
                    <td>{escapeHtml(s.name)}</td>
                    <td className={up ? 'text-up' : 'text-down'}>
                      {Number(s.price || 0).toFixed(2)}
                    </td>
                    <td className={up ? 'text-up' : 'text-down'}>
                      {upSign(s.changeRate)}{Number(s.changeRate || 0).toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
function pct(n: number, c: any): number {
  const t = (c.up || 0) + (c.down || 0) + (c.flat || 0);
  if (!t) return 0; return Math.round((n || 0) / t * 100);
}

function NewsList({ data, search }: any) {
  const list: any[] = data?.data?.list || data?.news || [];
  if (!list.length) return <div className="loading">暂无新闻</div>;
  return (
    <>
      {list.slice(0, 80).map((n, idx) => {
        const url = n.url_w || n.url_m || n.url || '';
        const title = n.title || n.Art_Title || '';
        const time = n.showtime || n.ctime || n.display_time || n.time || '';
        const src = n.source || n.Art_Media_Name || n.site || '';
        const content = n.content || n.digest || '';
        const open = () => { if (url) window.open(url, '_blank', 'noopener'); };
        return (
          <div key={idx} className="news-item" onClick={open}>
            <div className="time">{escapeHtml(time)}{src ? ' · ' + escapeHtml(src) : ''}</div>
            <div className="title">{escapeHtml(title)}</div>
            {content && (
              <div className="digest">{escapeHtml(String(content).replace(/<[^>]+>/g, ''))}</div>
            )}
          </div>
        );
      })}
    </>
  );
}

function FundFlow({ data, onNavigate }: any) {
  const hy: any[] = data?.industry || [];
  const gn: any[] = data?.concept || [];
  if (!hy.length && !gn.length) return <div className="loading">暂无资金数据</div>;
  return (
    <>
      <SectionFlow title="行业资金流入 TOP10" list={hy.slice().sort(sortNet)} up onNavigate={onNavigate} />
      <SectionFlow title="行业资金流出 TOP10" list={hy.slice().sort((a: any, b: any) => sortNet(a, b) * -1)} up={false} onNavigate={onNavigate} />
      <SectionFlow title="概念资金流入 TOP10" list={gn.slice().sort(sortNet)} up onNavigate={onNavigate} />
      <SectionFlow title="概念资金流出 TOP10" list={gn.slice().sort((a: any, b: any) => sortNet(a, b) * -1)} up={false} onNavigate={onNavigate} />
    </>
  );
}
const sortNet = (a: any, b: any) => (Number(b.netamount || 0) - Number(a.netamount || 0));

function SectionFlow({ title, list, up, onNavigate }: any) {
  const items = up ? list.slice(0, 10).filter((x: any) => Number(x.netamount || 0) > 0)
    : list.slice(-10).reverse().filter((x: any) => Number(x.netamount || 0) < 0);
  if (!items.length) return null;
  return (
    <div className="card">
      <div className="section-title" style={{ marginTop: 0 }}>{title}</div>
      <table>
        <thead>
          <tr><th>板块</th><th>净流入</th><th>领涨股</th></tr>
        </thead>
        <tbody>
          {items.map((x: any, i: number) => {
            const f = Number(x.netamount || 0);
            const sc = (x.ts_symbol || '').replace(/^(sh|sz|bj)/, (m: string) => m.toUpperCase());
            return (
              <tr key={i}>
                <td>{escapeHtml(x.name || '')}</td>
                <td className={f >= 0 ? 'text-up' : 'text-down'}>{upSign(f)}{fmtYi(f)}</td>
                <td className="stock-row" onClick={() => sc && onNavigate(`/stock/${sc}?name=${encodeURIComponent(x.ts_name || '')}`)}>
                  {escapeHtml(x.ts_name || '')}
                  <span className={Number(x.ts_changeratio || 0) >= 0 ? ' text-up' : ' text-down'}>
                    {' '}{upSign(Number(x.ts_changeratio || 0) * 100)}{(Number(x.ts_changeratio || 0) * 100).toFixed(2)}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SectorLimit({ data, onNavigate }: any) {
  const diff: any[] = data?.data?.diff || [];
  if (!diff.length) return <div className="loading">暂无数据</div>;
  return (
    <div className="card">
      <table>
        <thead><tr><th>板块</th><th>涨幅</th><th>净流入</th><th>涨/跌</th></tr></thead>
        <tbody>
          {diff.slice(0, 50).map((x) => (
            <tr key={x.f12}>
              <td>{escapeHtml(x.f14 || '')}</td>
              <td className={Number(x.f3 || 0) >= 0 ? 'text-up' : 'text-down'}>
                {upSign(Number(x.f3 || 0))}{Number(x.f3 || 0).toFixed(2)}%
              </td>
              <td className={Number(x.f62 || 0) >= 0 ? 'text-up' : 'text-down'}>
                {upSign(Number(x.f62 || 0))}{fmtYi(x.f62)}
              </td>
              <td><span className="tag tag-up">{x.f104 || 0}</span> <span className="tag tag-down">{x.f105 || 0}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function YesterdayLimit({ data, onNavigate }: any) {
  const pool: any[] = data?.data?.pool || [];
  if (!pool.length) return <div className="loading">暂无涨停数据</div>;
  const open = (c: string, n: string) => onNavigate(`/stock/${c}?name=${encodeURIComponent(n)}`);
  const sorted = pool.slice().sort((a, b) => ((b.lbc || 0) - (a.lbc || 0)) || ((b.zdp || 0) - (a.zdp || 0)));
  return (
    <div className="card">
      <table>
        <thead><tr><th>名称/代码</th><th>连板</th><th>原因</th><th>封板</th><th>炸板</th></tr></thead>
        <tbody>
          {sorted.map((x) => (
            <tr key={x.c} className="stock-row" onClick={() => open(x.c, x.n)}>
              <td>{escapeHtml(x.n || '')}<div className="text-muted" style={{ fontSize: 10 }}>{x.c || ''}</div></td>
              <td><span className="tag tag-up">{x.lbc || 1}板</span></td>
              <td className="text-muted">{escapeHtml(x.hybk || '')}</td>
              <td>{fmtTime(x.fbt)}</td>
              <td>{x.zbc || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function LimitLeader({ data, onNavigate }: any) {
  const pool: any[] = (data?.data?.pool || []).filter((x: any) => (x.lbc || 1) >= 2);
  if (!pool.length) return <div className="loading">今日暂无连板股</div>;
  const open = (c: string, n: string) => onNavigate(`/stock/${c}?name=${encodeURIComponent(n)}`);
  pool.sort((a: any, b: any) => ((b.lbc || 0) - (a.lbc || 0)) || ((b.zdp || 0) - (a.zdp || 0)));
  return (
    <div className="card">
      <table>
        <thead><tr><th>名称/代码</th><th>连板</th><th>涨幅</th><th>板块</th></tr></thead>
        <tbody>
          {pool.map((x: any) => (
            <tr key={x.c} className="stock-row" onClick={() => open(x.c, x.n)}>
              <td>{escapeHtml(x.n || '')}<div className="text-muted" style={{ fontSize: 10 }}>{x.c || ''}</div></td>
              <td><span className="tag tag-accent">{x.lbc || 1}板</span></td>
              <td className="text-up">+{(Number(x.zdp || 0)).toFixed(2)}%</td>
              <td className="text-muted">{escapeHtml(x.hybk || '')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function StrongSector({ data }: any) {
  const pool: any[] = data?.data?.pool || [];
  if (!pool.length) return <div className="loading">暂无数据</div>;
  const map: Record<string, { name: string; count: number; codes: string[] }> = {};
  for (const x of pool) {
    const k = x.hybk || '其他';
    if (!map[k]) map[k] = { name: k, count: 0, codes: [] };
    map[k].count++;
    if (map[k].codes.length < 3) map[k].codes.push(x.n);
  }
  const arr = Object.values(map).sort((a, b) => b.count - a.count);
  return (
    <div className="card">
      <table>
        <thead><tr><th>板块</th><th>涨停数</th><th>代表股</th></tr></thead>
        <tbody>
          {arr.map((s) => (
            <tr key={s.name}>
              <td>{escapeHtml(s.name)}</td>
              <td><span className="tag tag-up">{s.count}</span></td>
              <td className="text-muted">{escapeHtml(s.codes.join('、'))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LHBList({ data, onNavigate }: any) {
  const list: any[] = data?.data?.list || [];
  if (!list.length) return <div className="loading">暂无龙虎榜</div>;
  const open = (c: string, n: string) => onNavigate(`/stock/${c}?name=${encodeURIComponent(n)}`);
  return (
    <div className="card">
      <table>
        <thead><tr><th>名称/代码</th><th>涨跌幅</th><th>净买额</th><th>原因</th></tr></thead>
        <tbody>
          {list.slice(0, 50).map((x) => {
            const net = Number(x.BILLBOARD_NET_AMT || 0);
            const change = Number(x.CHANGE_RATE || 0);
            return (
              <tr key={x.SECURITY_CODE} className="stock-row"
                onClick={() => open(x.SECURITY_CODE, x.SECURITY_NAME_ABBR)}>
                <td>
                  {escapeHtml(x.SECURITY_NAME_ABBR || '')}
                  <div className="text-muted" style={{ fontSize: 10 }}>{x.SECURITY_CODE || ''}</div>
                </td>
                <td className={change >= 0 ? 'text-up' : 'text-down'}>{upSign(change)}{change.toFixed(2)}%</td>
                <td className={net >= 0 ? 'text-up' : 'text-down'}>{upSign(net)}{fmtYi(net)}</td>
                <td className="text-muted">{escapeHtml(x.EXPLANATION || x.EXPLAIN || '')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AlertList({ data, onNavigate }: any) {
  const list: any[] = data?.data?.list || data?.data?.allstock || [];
  if (!list.length) return <div className="loading">暂无异动</div>;
  const open = (c: string, n: string) => onNavigate(`/stock/${c}?name=${encodeURIComponent(n)}`);
  return (
    <div className="card">
      <table>
        <thead><tr><th>时间</th><th>名称</th><th>异动</th><th>信息</th></tr></thead>
        <tbody>
          {list.slice(0, 80).map((x, i) => {
            const label = CHG_TYPES[x.t] || ('类型' + x.t);
            const isUp = [4, 8, 32, 128, 8193, 8194, 8201, 8207, 8209, 8211, 8213, 8215].includes(x.t);
            return (
              <tr key={i} className="stock-row" onClick={() => open(x.c, x.n)}>
                <td className="text-muted">{fmtTime(x.tm)}</td>
                <td>
                  {escapeHtml(x.n || '')}
                  <div className="text-muted" style={{ fontSize: 10 }}>{x.c || ''}</div>
                </td>
                <td><span className={'tag ' + (isUp ? 'tag-up' : 'tag-down')}>{label}</span></td>
                <td className="text-muted">{escapeHtml(x.i || '')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HotStocks({ data, onNavigate }: any) {
  const diff: any[] = data?.data?.diff || [];
  if (!diff.length) return <div className="loading">暂无数据</div>;
  const open = (c: string, n: string) => onNavigate(`/stock/${c}?name=${encodeURIComponent(n)}`);
  return (
    <div className="card">
      <table>
        <thead><tr><th>代码</th><th>名称</th><th>最新价</th><th>涨跌幅</th></tr></thead>
        <tbody>
          {diff.map((x) => {
            const rate = Number(x.f3 || 0);
            return (
              <tr key={x.f12} className="stock-row" onClick={() => open(x.f12, x.f14)}>
                <td>{x.f12}</td><td>{escapeHtml(x.f14 || '')}</td>
                <td>{(Number(x.f2 || 0)).toFixed(2)}</td>
                <td className={rate >= 0 ? 'text-up' : 'text-down'}>{upSign(rate)}{rate.toFixed(2)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Watchlist({ data, onNavigate, onAdd, onDel, moveWatch, reorderWatch }: any) {
  const diff: any[] = data?.data?.diff || [];
  const dragElRef = useRef<any>(null);

  function getDragAfter(container: HTMLElement, y: number) {
    const list = Array.from(container.querySelectorAll<HTMLElement>('.wl-card:not(.dragging)'));
    for (const el of list) {
      const box = el.getBoundingClientRect();
      if (y < box.top + box.height / 2) return el;
    }
    return null;
  }

  function commitOrder(container: HTMLElement) {
    const codes: string[] = [];
    const all = container.querySelectorAll<HTMLElement>('.wl-card');
    all.forEach((c) => { const code = c.getAttribute('data-code'); if (code) codes.push(code); });
    reorderWatch(codes);
  }

  if (!diff.length) {
    return (
      <>
        <div className="loading">暂无自选股</div>
        <button className="wl-add-btn" onClick={onAdd}>+ 添加自选股</button>
      </>
    );
  }
  return (
    <>
      {diff.map((x) => {
        const s = mapEmDiffToStockItem(x); const up = s.changeRate >= 0;
        return (
          <div
            className="wl-card"
            key={s.code}
            data-code={s.code}
            draggable
            onDragStart={(e: any) => {
              dragElRef.current = e.currentTarget;
              e.currentTarget.classList.add('dragging');
              try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', s.code); } catch (_err) { /* noop */ }
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
            style={{ cursor: 'grab' }}
          >
            <div className="wl-row" onClick={() => onNavigate(`/stock/${s.code}?name=${encodeURIComponent(s.name)}`)}>
              <div className="wl-name">
                <div className="nm">{escapeHtml(s.name)}</div>
                <div className="cd">{s.code}</div>
              </div>
              <div className="wl-price">
                <div className={'pr ' + (up ? 'text-up' : 'text-down')}>{Number(s.price || 0).toFixed(2)}</div>
              </div>
              <div className="wl-chg">
                <span className={'tag ' + (up ? 'tag-up' : 'tag-down')}>
                  {upSign(s.changeRate)}{Number(s.changeRate || 0).toFixed(2)}%
                </span>
              </div>
              <div className="wl-acts" style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                <button
                  className="wl-code-act"
                  title="置顶"
                  onClick={() => moveWatch(s.code, 'top')}
                  style={{
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--fg)', fontSize: 10, lineHeight: 1, padding: '4px 7px',
                    borderRadius: 4, cursor: 'pointer', opacity: 0.85,
                  }}
                >⤒ 置顶</button>
                <button
                  className="wl-code-act"
                  title="置底"
                  onClick={() => moveWatch(s.code, 'bottom')}
                  style={{
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--fg)', fontSize: 10, lineHeight: 1, padding: '4px 7px',
                    borderRadius: 4, cursor: 'pointer', opacity: 0.85,
                  }}
                >⤓ 置底</button>
              </div>
              <button className="wl-del" onClick={(e) => { e.stopPropagation(); onDel(s.code); }}>删除</button>
            </div>
          </div>
        );
      })}
      <button className="wl-add-btn" onClick={onAdd}>+ 添加自选股</button>
    </>
  );
}

function AddWatchDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (c: string) => void }) {
  const [v, setV] = useState('');
  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h3>添加自选股</h3>
        <div className="form-item" style={{ padding: '0 0 14px' }}>
          <div className="lbl">股票代码</div>
          <div className="val">
            <input autoFocus type="text" value={v} onChange={(e) => setV(e.target.value)}
              placeholder="600519 或 sh600519" />
            <div className="text-muted" style={{ fontSize: 11, marginTop: 6 }}>
              自动识别：60/68 开头→沪市，00/30 开头→深市
            </div>
          </div>
        </div>
        <button className="primary-btn" onClick={() => {
          const c = normalizeCode(v.trim());
          if (c.length >= 7) onAdd(c);
        }}>确认添加</button>
        <button className="ghost-btn" style={{ marginBottom: 12 }} onClick={onClose}>取消</button>
      </div>
    </div>
  );
}

function fmtTime(t: string | number): string {
  const s = String(t || '');
  if (s.length >= 6) return s.slice(0, 2) + ':' + s.slice(2, 4);
  return s;
}
