// ============================================
// 盘口异动 / 集合竞价（含语音播报 + 异动信息智能解码）
// ============================================

import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useRouter } from '../router/useRouter';
import { CHG_TYPES } from '../../local-shared/constants';
import { escapeHtml, fmtYi } from '../../local-shared/utils';

const AUCTION_TYPES = [8215, 8216];

function fmtTm(t: number | string): string {
  const s = String(Math.floor(Number(t) || 0)).padStart(6, '0');
  return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
}

// 解码东财异动 info 字段（逗号分隔数字串，含义随类型不同）→ 展示文案
function decodeAlertInfo(t: number, i: string): string {
  const raw = String(i || '');
  if (!raw) return '';
  const p = raw.split(',').map((v) => parseFloat(v));
  if (p.some((v) => isNaN(v))) return raw;
  let price: number | undefined, ratio: number | undefined, vol = '', amt = '';
  if (t === 4 || t === 8) { // 秒板/封板: 价,封单量(手),价,涨跌幅
    price = p[0]; vol = p[1] >= 0 ? (p[1] >= 10000 ? (p[1] / 10000).toFixed(2) + '万手' : p[1].toFixed(0) + '手') : ''; ratio = p[3];
  } else if (t === 16 || t === 8211 || t === 8212) { // 打开涨停/跌停: 价,涨跌幅
    price = p[0]; ratio = p[1];
  } else if (t === 32 || t === 64 || t === 128 || t === 8193 || t === 8194) { // 大笔买卖/火箭发射/快速反弹: 量(股),价,涨跌幅,金额
    vol = p[0] >= 0 ? (p[0] >= 10000 ? (p[0] / 10000).toFixed(1) + '万股' : p[0].toFixed(0) + '股') : '';
    price = p[1]; ratio = p[2]; amt = p[3] >= 0 ? fmtYi(p[3]) : '';
  } else if (t === 8215 || t === 8216) { // 集合竞价: 涨跌幅,价,竞价量(手),竞价额(万)
    ratio = p[0]; price = p[1];
    vol = p[2] >= 0 ? (p[2] >= 10000 ? (p[2] / 10000).toFixed(1) + '万手' : p[2].toFixed(0) + '手') : '';
    amt = p[3] >= 0 ? fmtYi(p[3]) : '';
  } else { // 加速/大幅/封涨跌停等: 涨跌幅,价,涨跌幅
    ratio = p[0]; price = p[1];
  }
  const out: string[] = [];
  if (price !== undefined && !isNaN(price)) out.push('价 ' + price.toFixed(2));
  if (vol) out.push('量 ' + vol);
  if (ratio !== undefined && !isNaN(ratio)) out.push((ratio >= 0 ? '+' : '') + (ratio * 100).toFixed(2) + '%');
  if (amt) out.push('额 ' + amt);
  return out.join(' · ');
}

// 异动播报：把数字解码成自然语言
function decodeAlertSpeech(t: number, i: string): string {
  const raw = String(i || '');
  if (!raw) return '';
  const p = raw.split(',').map((v) => parseFloat(v));
  if (p.some((v) => isNaN(v))) return raw;
  let price: number | undefined, ratio: number | undefined, vol = '', amt = '';
  if (t === 4 || t === 8) {
    price = p[0]; vol = p[1] >= 0 ? (p[1] >= 10000 ? (p[1] / 10000).toFixed(2) + '万手' : p[1].toFixed(0) + '手') : ''; ratio = p[3];
  } else if (t === 16 || t === 8211 || t === 8212) {
    price = p[0]; ratio = p[1];
  } else if (t === 32 || t === 64 || t === 128 || t === 8193 || t === 8194) {
    vol = p[0] >= 0 ? (p[0] >= 10000 ? (p[0] / 10000).toFixed(1) + '万股' : p[0].toFixed(0) + '股') : '';
    price = p[1]; ratio = p[2]; amt = p[3] >= 0 ? fmtYi(p[3]) : '';
  } else if (t === 8215 || t === 8216) { // 集合竞价: 涨跌幅,价,竞价量(手),竞价额(万)
    ratio = p[0]; price = p[1];
    vol = p[2] >= 0 ? (p[2] >= 10000 ? (p[2] / 10000).toFixed(1) + '万手' : p[2].toFixed(0) + '手') : '';
    amt = p[3] >= 0 ? fmtYi(p[3]) : '';
  } else {
    ratio = p[0]; price = p[1];
  }
  const out: string[] = [];
  if (price !== undefined && !isNaN(price)) out.push('价格' + price.toFixed(2) + '元');
  if (vol) out.push(vol);
  if (ratio !== undefined && !isNaN(ratio)) out.push((ratio >= 0 ? '上涨' : '下跌') + Math.abs(ratio * 100).toFixed(2) + '%');
  if (amt) out.push('金额' + amt);
  return out.join('，');
}

function speak(text: string) {
  try {
    if (!('speechSynthesis' in window) || !text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

function alertId(x: any): string {
  return `${x.tm || ''}_${x.c || ''}_${x.t || ''}`;
}

export default function ChangesPage() {
  const { path, navigate } = useRouter();
  const isAuction = path === '/auction' || path.startsWith('/auction?');
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [voiceOn, setVoiceOn] = useState(() => {
    try { return sessionStorage.getItem('alertVoice') === '1'; } catch { return false; }
  });
  const lastIdsRef = useRef<string[]>([]);
  const voiceOnRef = useRef(voiceOn);
  voiceOnRef.current = voiceOn;

  async function load() {
    const r = await api.stockChanges();
    const raw: any[] = r?.data?.list || r?.data?.allstock || [];
    const data = isAuction
      ? raw.filter((x: any) => AUCTION_TYPES.includes(Number(x.t)))
      : raw;

    // 语音播报：读出比上次第一条更新的异动
    const newIds = data.map(alertId);
    const prev = lastIdsRef.current;
    if (voiceOnRef.current && prev.length) {
      const firstNew = newIds.indexOf(prev[0]);
      if (firstNew > 0) {
        for (let j = firstNew - 1; j >= 0; j--) {
          const x = data[j];
          if (!x) continue;
          const lbl = CHG_TYPES[Number(x.t)] || '异动';
          speak(`${x.n || ''}，${lbl}，${decodeAlertSpeech(Number(x.t), x.i || '')}`);
        }
      }
    }
    lastIdsRef.current = newIds;

    setList(data);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    lastIdsRef.current = [];
    load();
    const timer = setInterval(load, 20000);
    return () => {
      clearInterval(timer);
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuction]);

  function toggleVoice() {
    const next = !voiceOn;
    setVoiceOn(next);
    try { sessionStorage.setItem('alertVoice', next ? '1' : '0'); } catch { /* ignore */ }
    if (!next) {
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    } else if (list.length) {
      const x = list[0];
      const lbl = CHG_TYPES[Number(x.t)] || '异动';
      speak(`${x.n || ''}，${lbl}，${decodeAlertSpeech(Number(x.t), x.i || '')}`);
    }
  }

  const open = (code: string, name: string) => {
    const c = String(code || '').replace(/^(sh|sz|bj)/i, '').toLowerCase();
    const m = /^(60|68|90|11|13|50|56|51|58)/.test(c) ? 'sh'
      : /^(00|30|20|12|15|16|18|159)/.test(c) ? 'sz'
      : /^(43|83|87|92|88)/.test(c) ? 'bj' : 'sh';
    navigate(`/stock/${m}${c}?name=${encodeURIComponent(name || '')}`);
  };

  return (
    <div className="content-scroll">
      <div style={{ display: 'flex', alignItems: 'center', margin: '14px' }}>
        <div className="section-hd" style={{ margin: 0, flex: 1 }}>{isAuction ? '集合竞价' : '盘口异动'}</div>
        <button
          className={'icon-btn' + (voiceOn ? ' voice-on' : '')}
          title={voiceOn ? '关闭语音播报' : '开启语音播报'}
          style={{ color: voiceOn ? 'var(--up)' : 'var(--fg-dim)', fontSize: 16 }}
          onClick={toggleVoice}
        >
          {voiceOn ? '🔊' : '🔇'}
        </button>
      </div>
      {loading && !list.length && <div className="loading">加载中…</div>}
      {!loading && !list.length && <div className="loading">暂无异动</div>}
      {list.slice(0, 60).map((x, i) => {
        const code = String(x.c || x.f12 || '');
        const name = x.n || x.f14 || '';
        const type = Number(x.t);
        const typeName = CHG_TYPES[type] || '异动';
        const up = [4, 8, 32, 128, 8193, 8194, 8201, 8207, 8209, 8211, 8213, 8215].includes(type);
        const detail = decodeAlertInfo(type, String(x.i || ''));
        return (
          <div key={code + i} className="watchlist-row" onClick={() => open(code, name)}>
            <div className="info" style={{ minWidth: 72 }}>
              <div className="nm">{escapeHtml(name)}</div>
              <div className="cd">{code}</div>
            </div>
            <div style={{ minWidth: 58, textAlign: 'center' }}>
              <div style={{ fontWeight: 600, color: up ? 'var(--up)' : 'var(--down)', fontSize: 12 }}>{escapeHtml(typeName)}</div>
              <div className="text-muted" style={{ fontSize: 10 }}>类型</div>
            </div>
            <div style={{ flex: 1, padding: '0 8px', minWidth: 0 }}>
              <div className="text-muted" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {escapeHtml(detail) || '—'}
              </div>
              <div className="text-muted" style={{ fontSize: 10 }}>详情</div>
            </div>
            <div style={{ minWidth: 44, textAlign: 'right' }}>
              <div className="text-muted" style={{ fontSize: 11 }}>{fmtTm(x.tm)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
