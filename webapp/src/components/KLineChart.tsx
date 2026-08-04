// ============================================
// K 线 Canvas 渲染组件（MA/Vol/MACD/RSI + 分时）
// 从 VSCode 扩展 stockCenterHtml.ts 移植 + 适配移动端
// ============================================

import { useEffect, useRef, useState } from 'react';

export interface KLineProps {
  rows: string[];        // K线：time,open,close,high,low,vol  （CSV 字符串数组）
  intraday?: {           // 分时：如果提供则优先画分时
    minutes: string[];   // "HHMM,price"
    preClose: number;
    ticks?: { time: string; price: number; vol: number; bs?: number }[];
    orderBook?: { buy: number[][]; sell: number[][] };
  };
  riseColor?: string;
  fallColor?: string;
  mainHeight?: number;
}

type Row = { date: string; open: number; close: number; high: number; low: number; vol: number };

function parseRows(rows: string[]): Row[] {
  const out: Row[] = [];
  for (const r of rows) {
    const p = r.split(',');
    if (p.length < 5) continue;
    out.push({ date: p[0], open: +p[1], close: +p[2], high: +p[3], low: +p[4], vol: +(p[5] || 0) });
  }
  return out;
}
const MA = (data: Row[], n: number): (number | null)[] => {
  const r: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < n - 1) { r.push(null); continue; }
    let s = 0; for (let j = i - n + 1; j <= i; j++) s += data[j].close;
    r.push(s / n);
  }
  return r;
};

function calcMACD(data: Row[]): { dif: number[]; dea: number[]; macd: number[] } {
  const ema12: number[] = [], ema26: number[] = [], dif: number[] = [], dea: number[] = [], macd: number[] = [];
  const a12 = 2 / 13, a26 = 2 / 27, aD = 2 / 10;
  for (let i = 0; i < data.length; i++) {
    const c = data[i].close;
    ema12.push(i === 0 ? c : ema12[i - 1] + a12 * (c - ema12[i - 1]));
    ema26.push(i === 0 ? c : ema26[i - 1] + a26 * (c - ema26[i - 1]));
    const d = ema12[i] - ema26[i];
    dif.push(d);
    dea.push(i === 0 ? d : dea[i - 1] + aD * (d - dea[i - 1]));
    macd.push((dif[i] - dea[i]) * 2);
  }
  return { dif, dea, macd };
}

function calcRSI(data: Row[], n: number): number[] {
  const r: number[] = [];
  let avgG = 0, avgL = 0;
  for (let i = 0; i < data.length; i++) {
    if (i === 0) { r.push(50); continue; }
    const chg = data[i].close - data[i - 1].close;
    const g = chg > 0 ? chg : 0, l = chg < 0 ? -chg : 0;
    if (i <= n) {
      avgG = (avgG * (i - 1) + g) / i;
      avgL = (avgL * (i - 1) + l) / i;
    } else {
      avgG = (avgG * (n - 1) + g) / n;
      avgL = (avgL * (n - 1) + l) / n;
    }
    r.push(avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL));
  }
  return r;
}

const SUB_OPTIONS: { id: string; label: string }[] = [
  { id: 'vol', label: '成交量' },
  { id: 'amount', label: '成交额' },
  { id: 'macd', label: 'MACD' },
  { id: 'rsi', label: 'RSI' },
];

export default function KLineChart({ rows, intraday, riseColor = '#ff4d4f', fallColor = '#23c343', mainHeight }: KLineProps) {
  const mainRef = useRef<HTMLCanvasElement>(null);
  const volRef = useRef<HTMLCanvasElement>(null);
  const amountRef = useRef<HTMLCanvasElement>(null);
  const macdRef = useRef<HTMLCanvasElement>(null);
  const rsiRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [subs, setSubs] = useState<string[]>(['vol']);
  const scrollRef = useRef<{ scroll: number }>({ scroll: 0 });

  const subRefMap: Record<string, React.RefObject<HTMLCanvasElement>> = {
    vol: volRef,
    amount: amountRef,
    macd: macdRef,
    rsi: rsiRef,
  };

  useEffect(() => { render(); });

  function dprOf() { return window.devicePixelRatio || 1; }

  function toggleSub(id: string) {
    setSubs((prev) => {
      if (prev.includes(id)) {
        return prev.filter((s) => s !== id);
      }
      return [...prev, id];
    });
  }

  function render() {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const dpr = dprOf();
    const W = wrap.clientWidth - 0;
    const mainH = mainHeight || Math.max(180, Math.min(280, W * 0.55));
    const subH = Math.max(70, W * 0.22);
    const data = parseRows(rows);

    const main = mainRef.current;
    if (main) {
      main.style.width = W + 'px';
      main.style.height = mainH + 'px';
      main.width = W * dpr; main.height = mainH * dpr;
      const ctx = main.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (intraday) drawIntraday(ctx, W, mainH, intraday, riseColor, fallColor);
      else drawMain(ctx, W, mainH, data, riseColor, fallColor, scrollRef.current);
    }

    for (const sid of subs) {
      const sub = subRefMap[sid]?.current;
      if (!sub) continue;
      sub.style.width = W + 'px';
      sub.style.height = subH + 'px';
      sub.width = W * dpr; sub.height = subH * dpr;
      const sctx = sub.getContext('2d')!;
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (sid === 'vol') {
        if (intraday) drawIntradayVol(sctx, W, subH, intraday, riseColor, fallColor);
        else drawVol(sctx, W, subH, data, riseColor, fallColor, scrollRef.current);
      } else if (sid === 'amount') {
        if (intraday) drawIntradayAmount(sctx, W, subH, intraday, riseColor, fallColor);
        else drawAmount(sctx, W, subH, data, riseColor, fallColor, scrollRef.current);
      } else if (sid === 'macd') {
        if (!intraday) drawMACD(sctx, W, subH, data, riseColor, fallColor, scrollRef.current);
      } else if (sid === 'rsi') {
        if (!intraday) drawRSI(sctx, W, subH, data, scrollRef.current);
      }
    }
  }

  return (
    <div className="kl-chart" ref={wrapRef}>
      <div className="kl-toolbar" style={{ display: 'flex', gap: '6px', padding: '6px 8px', flexWrap: 'wrap' }}>
        {SUB_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => toggleSub(opt.id)}
            style={{
              padding: '3px 10px',
              border: '1px solid #1f2124',
              borderRadius: '4px',
              background: subs.includes(opt.id) ? riseColor : 'transparent',
              color: subs.includes(opt.id) ? '#fff' : '#b8bfc6',
              fontSize: '11px',
              cursor: 'pointer',
              opacity: subs.includes(opt.id) ? 1 : 0.7,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <canvas className="kl-canvas" ref={mainRef} />
      {subs.includes('vol') && (
        <div className="kl-sub" style={{ borderTop: '1px solid #1f2124', position: 'relative' }}>
          <div className="kl-sub-hdr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 8px 0', fontSize: '10px', opacity: 0.6 }}>
            <span>成交量</span>
          </div>
          <canvas className="kl-canvas" ref={volRef} style={{ width: '100%', display: 'block' }} />
        </div>
      )}
      {subs.includes('amount') && (
        <div className="kl-sub" style={{ borderTop: '1px solid #1f2124', position: 'relative' }}>
          <div className="kl-sub-hdr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 8px 0', fontSize: '10px', opacity: 0.6 }}>
            <span>成交额</span>
          </div>
          <canvas className="kl-canvas" ref={amountRef} style={{ width: '100%', display: 'block' }} />
        </div>
      )}
      {subs.includes('macd') && (
        <div className="kl-sub" style={{ borderTop: '1px solid #1f2124', position: 'relative' }}>
          <div className="kl-sub-hdr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 8px 0', fontSize: '10px', opacity: 0.6 }}>
            <span style={{ color: '#666' }}>
              <span style={{ color: '#36a2eb' }}>DIF</span>{' '}
              <span style={{ color: '#e8b393' }}>DEA</span>{' '}
              <span>MACD(12,26,9)</span>
            </span>
          </div>
          <canvas className="kl-canvas" ref={macdRef} style={{ width: '100%', display: 'block' }} />
        </div>
      )}
      {subs.includes('rsi') && (
        <div className="kl-sub" style={{ borderTop: '1px solid #1f2124', position: 'relative' }}>
          <div className="kl-sub-hdr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 8px 0', fontSize: '10px', opacity: 0.6 }}>
            <span style={{ color: '#666' }}>
              <span style={{ color: '#36a2eb' }}>RSI6</span>{' '}
              <span style={{ color: '#e8b393' }}>RSI12</span>
            </span>
          </div>
          <canvas className="kl-canvas" ref={rsiRef} style={{ width: '100%', display: 'block' }} />
        </div>
      )}
    </div>
  );
}

// ---------- Main K线 ----------
function drawMain(ctx: CanvasRenderingContext2D, W: number, H: number, data: Row[], up: string, down: string, scrollS: { scroll: number }) {
  ctx.fillStyle = '#12151a'; ctx.fillRect(0, 0, W, H);
  if (!data.length) return;
  const padL = 46, padR = 8, padT = 6, padB = 18;
  const cW = W - padL - padR, cH = H - padT - padB;
  const barW = Math.max(2, Math.min(14, cW / 60 * 0.7));
  const gap = cW / 60;
  const totalBars = Math.floor(cW / gap);
  const maxScroll = Math.max(0, data.length - totalBars);
  scrollS.scroll = Math.max(0, Math.min(scrollS.scroll, maxScroll));
  if (scrollS.scroll === 0 && data.length > totalBars) scrollS.scroll = data.length - totalBars;
  const start = Math.floor(scrollS.scroll);
  const vis: Row[] = [];
  for (let i = start; i < Math.min(data.length, start + totalBars + 2); i++) vis.push(data[i]);
  if (!vis.length) return;
  let minP = Infinity, maxP = -Infinity;
  for (const d of vis) { if (d.low < minP) minP = d.low; if (d.high > maxP) maxP = d.high; }
  const pR = maxP - minP || 1;
  const ext = pR * 0.08; minP -= ext; maxP += ext;
  ctx.strokeStyle = '#1f2124'; ctx.lineWidth = 0.5;
  ctx.fillStyle = '#666'; ctx.font = '10px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const y = padT + cH * i / 4;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
    ctx.fillStyle = '#666';
    ctx.fillText((maxP - (pR + 2 * ext) * i / 4).toFixed(2), padL - 4, y);
  }
  for (let i = 0; i < vis.length; i++) {
    const d = vis[i];
    const x = padL + gap * (i - (start % 1)) + gap / 2;
    const isUp = d.close >= d.open; const color = isUp ? up : down;
    const oy = padT + cH * (1 - (d.open - minP) / (maxP - minP));
    const cy = padT + cH * (1 - (d.close - minP) / (maxP - minP));
    const hy = padT + cH * (1 - (d.high - minP) / (maxP - minP));
    const ly = padT + cH * (1 - (d.low - minP) / (maxP - minP));
    ctx.strokeStyle = color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, hy); ctx.lineTo(x, ly); ctx.stroke();
    const bTop = Math.min(oy, cy), bH = Math.max(Math.abs(oy - cy), 1);
    ctx.fillStyle = color;
    ctx.fillRect(x - barW / 2, bTop, barW, bH);
  }
  const ma5 = MA(data, 5), ma10 = MA(data, 10), ma20 = MA(data, 20);
  const maColors = ['#e8b339', '#36a2eb', '#cc65fe'];
  const mas = [ma5, ma10, ma20];
  for (let m = 0; m < mas.length; m++) {
    ctx.strokeStyle = maColors[m]; ctx.lineWidth = 1; ctx.beginPath();
    let started = false;
    for (let i = 0; i < vis.length; i++) {
      const gi = start + i; const v = mas[m][gi];
      if (v == null) continue;
      const x = padL + gap * (i - (start % 1)) + gap / 2;
      const y = padT + cH * (1 - (v - minP) / (maxP - minP));
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = '#666'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const step = Math.max(1, Math.floor(vis.length / 5));
  for (let i = 0; i < vis.length; i += step) {
    const x = padL + gap * (i - (start % 1)) + gap / 2;
    const label = vis[i].date.length >= 10 ? vis[i].date.slice(5) : vis[i].date;
    ctx.fillText(label, x, H - 4);
  }
  ctx.font = '10px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const labs = ['MA5', 'MA10', 'MA20'];
  for (let m = 0; m < 3; m++) { ctx.fillStyle = maColors[m]; ctx.fillText(labs[m], padL + m * 44, padT + 6); }
}

function drawVol(ctx: CanvasRenderingContext2D, W: number, H: number, data: Row[], up: string, down: string, scrollS: { scroll: number }) {
  ctx.fillStyle = '#12151a'; ctx.fillRect(0, 0, W, H);
  if (!data.length) return;
  const padL = 46, padR = 8, padT = 4, padB = 4;
  const cW = W - padL - padR, cH = H - padT - padB;
  const barW = Math.max(2, Math.min(14, cW / 60 * 0.7));
  const gap = cW / 60;
  const totalBars = Math.floor(cW / gap);
  const start = Math.floor(scrollS.scroll);
  const vis: Row[] = [];
  for (let i = start; i < Math.min(data.length, start + totalBars + 2); i++) vis.push(data[i]);
  if (!vis.length) return;
  let maxV = 0; for (const d of vis) if (d.vol > maxV) maxV = d.vol;
  if (maxV === 0) return;
  ctx.strokeStyle = '#1f2124'; ctx.lineWidth = 0.5;
  for (let i = 0; i <= 2; i++) {
    const y = padT + cH * i / 2;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
  }
  for (let i = 0; i < vis.length; i++) {
    const d = vis[i], x = padL + gap * (i - (start % 1)) + gap / 2;
    const h = cH * (d.vol / maxV); const isUp = d.close >= d.open;
    ctx.fillStyle = isUp ? hexA(up, 0.4) : hexA(down, 0.4);
    ctx.fillRect(x - barW / 2, padT + cH - h, barW, h);
  }
  ctx.fillStyle = '#666'; ctx.font = '9px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.fillText((maxV / 10000).toFixed(0) + '万', padL - 4, padT + 6);
}

function drawAmount(ctx: CanvasRenderingContext2D, W: number, H: number, data: Row[], up: string, down: string, scrollS: { scroll: number }) {
  ctx.fillStyle = '#12151a'; ctx.fillRect(0, 0, W, H);
  if (!data.length) return;
  const padL = 46, padR = 8, padT = 4, padB = 4;
  const cW = W - padL - padR, cH = H - padT - padB;
  const barW = Math.max(2, Math.min(14, cW / 60 * 0.7));
  const gap = cW / 60;
  const totalBars = Math.floor(cW / gap);
  const start = Math.floor(scrollS.scroll);
  const vis: Row[] = [];
  for (let i = start; i < Math.min(data.length, start + totalBars + 2); i++) vis.push(data[i]);
  if (!vis.length) return;
  let maxV = 0;
  for (const d of vis) {
    const amt = d.vol * d.close;
    if (amt > maxV) maxV = amt;
  }
  if (maxV === 0) return;
  ctx.strokeStyle = '#1f2124'; ctx.lineWidth = 0.5;
  for (let i = 0; i <= 2; i++) {
    const y = padT + cH * i / 2;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
  }
  for (let i = 0; i < vis.length; i++) {
    const d = vis[i], x = padL + gap * (i - (start % 1)) + gap / 2;
    const amt = d.vol * d.close;
    const h = cH * (amt / maxV);
    const isUp = d.close >= d.open;
    ctx.fillStyle = isUp ? hexA(up, 0.4) : hexA(down, 0.4);
    ctx.fillRect(x - barW / 2, padT + cH - h, barW, h);
  }
  ctx.fillStyle = '#666'; ctx.font = '9px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.fillText(formatAmount(maxV), padL - 4, padT + 6);
}

function formatAmount(v: number): string {
  if (v >= 100000000) return (v / 100000000).toFixed(2) + '亿';
  if (v >= 10000) return (v / 10000).toFixed(2) + '万';
  return v.toFixed(0);
}

function drawMACD(ctx: CanvasRenderingContext2D, W: number, H: number, data: Row[], up: string, down: string, scrollS: { scroll: number }) {
  ctx.fillStyle = '#12151a'; ctx.fillRect(0, 0, W, H);
  if (!data.length) return;
  const padL = 46, padR = 8, padT = 4, padB = 4;
  const cW = W - padL - padR, cH = H - padT - padB;
  const barW = Math.max(2, Math.min(14, cW / 60 * 0.7));
  const gap = cW / 60;
  const totalBars = Math.floor(cW / gap);
  const start = Math.floor(scrollS.scroll);
  const md = calcMACD(data);
  const visMacd: number[] = [];
  const visLines: { dif: number; dea: number }[] = [];
  for (let i = start; i < Math.min(data.length, start + totalBars + 2); i++) {
    visMacd.push(md.macd[i]);
    visLines.push({ dif: md.dif[i], dea: md.dea[i] });
  }
  if (!visMacd.length) return;
  let mx = 0;
  for (let i = 0; i < visMacd.length; i++) {
    const a = Math.abs(visMacd[i]);
    if (a > mx) mx = a;
    const d2 = Math.abs(visLines[i].dif);
    if (d2 > mx) mx = d2;
    const d3 = Math.abs(visLines[i].dea);
    if (d3 > mx) mx = d3;
  }
  mx = mx * 1.2 || 1;
  const sc = cH / (mx * 2);
  const mid = padT + cH / 2;
  ctx.strokeStyle = '#1f2124'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(padL, mid); ctx.lineTo(W - padR, mid); ctx.stroke();
  for (let i = 0; i <= 2; i++) {
    const y = padT + cH * i / 4;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
    const y2 = padT + cH * (3 - i) / 4;
    if (y2 !== y) {
      ctx.beginPath(); ctx.moveTo(padL, y2); ctx.lineTo(W - padR, y2); ctx.stroke();
    }
  }
  for (let i = 0; i < visMacd.length; i++) {
    const x = padL + gap * (i - (start % 1)) + gap / 2;
    const v = visMacd[i];
    const bH = Math.abs(v) * sc;
    ctx.fillStyle = v >= 0 ? hexA(up, 0.6) : hexA(down, 0.6);
    ctx.fillRect(x - barW / 2, v >= 0 ? mid - bH : mid, barW, Math.max(bH, 1));
  }
  const lineColors = ['#36a2eb', '#e8b393'];
  for (let L = 0; L < 2; L++) {
    ctx.strokeStyle = lineColors[L]; ctx.lineWidth = 1; ctx.beginPath();
    let st = false;
    for (let i = 0; i < visLines.length; i++) {
      const x = padL + gap * (i - (start % 1)) + gap / 2;
      const v = L === 0 ? visLines[i].dif : visLines[i].dea;
      const y = mid - v * sc;
      if (!st) { ctx.moveTo(x, y); st = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = '#666'; ctx.font = '9px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText(mx.toFixed(3), padL - 4, padT + 6);
  ctx.fillText((-mx).toFixed(3), padL - 4, padT + cH - 2);
}

function drawRSI(ctx: CanvasRenderingContext2D, W: number, H: number, data: Row[], scrollS: { scroll: number }) {
  ctx.fillStyle = '#12151a'; ctx.fillRect(0, 0, W, H);
  if (!data.length) return;
  const padL = 46, padR = 8, padT = 4, padB = 4;
  const cW = W - padL - padR, cH = H - padT - padB;
  const gap = cW / 60;
  const totalBars = Math.floor(cW / gap);
  const start = Math.floor(scrollS.scroll);
  const rsi6 = calcRSI(data, 6);
  const rsi12 = calcRSI(data, 12);
  const vis6: number[] = [];
  const vis12: number[] = [];
  for (let i = start; i < Math.min(data.length, start + totalBars + 2); i++) {
    vis6.push(rsi6[i]);
    vis12.push(rsi12[i]);
  }
  if (!vis6.length) return;
  const sc = cH / 100;
  ctx.strokeStyle = '#1f2124'; ctx.lineWidth = 0.5;
  ctx.fillStyle = '#555'; ctx.font = '9px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  [30, 50, 70].forEach((v) => {
    const y = padT + cH * (1 - v / 100);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
    ctx.fillText(String(v), padL - 4, y + 3);
  });
  const colors = ['#36a2eb', '#e8b393'];
  [vis6, vis12].forEach((vis, ci) => {
    ctx.strokeStyle = colors[ci]; ctx.lineWidth = 1; ctx.beginPath();
    let st = false;
    for (let i = 0; i < vis.length; i++) {
      const x = padL + gap * (i - (start % 1)) + gap / 2;
      const y = padT + cH * (1 - vis[i] / 100);
      if (!st) { ctx.moveTo(x, y); st = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });
}

// ---------- 分时 ----------
function drawIntraday(ctx: CanvasRenderingContext2D, W: number, H: number, id: NonNullable<KLineProps['intraday']>, up: string, down: string) {
  ctx.fillStyle = '#12151a'; ctx.fillRect(0, 0, W, H);
  if (!id.minutes.length) return;
  const padL = 46, padR = 8, padT = 6, padB = 18;
  const cW = W - padL - padR, cH = H - padT - padB;
  const preClose = Number(id.preClose) || 0;
  const points: { t: string; p: number }[] = [];
  for (const m of id.minutes) {
    const p = String(m).split(',');
    if (p.length < 2) continue;
    points.push({ t: p[0], p: parseFloat(p[1]) });
  }
  if (!points.length) return;
  let minP = Infinity, maxP = -Infinity;
  for (const d of points) { if (d.p < minP) minP = d.p; if (d.p > maxP) maxP = d.p; }
  if (preClose > 0) {
    const dr = Math.max(Math.abs(maxP - preClose), Math.abs(minP - preClose), preClose * 0.01);
    minP = preClose - dr * 1.1; maxP = preClose + dr * 1.1;
  } else { const r = (maxP - minP) * 0.1; minP -= r; maxP += r; }
  const pR = maxP - minP || 1;
  const xs = (i: number) => padL + (points.length === 1 ? cW / 2 : cW * (i / (points.length - 1)));
  const yp = (v: number) => padT + cH * (1 - (v - minP) / pR);
  ctx.strokeStyle = '#1f2124'; ctx.lineWidth = 0.5;
  ctx.fillStyle = '#666'; ctx.font = '10px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const y = padT + cH * i / 4;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
    ctx.fillStyle = '#666';
    ctx.fillText((maxP - pR * i / 4).toFixed(2), padL - 4, y);
  }
  if (preClose > 0) {
    ctx.strokeStyle = '#666'; ctx.setLineDash([4, 4]);
    ctx.beginPath(); const y = yp(preClose); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#888'; ctx.textAlign = 'right'; ctx.fillText(preClose.toFixed(2), padL - 4, y);
  }
  if (preClose > 0) {
    ctx.textAlign = 'left';
    for (let i = 0; i <= 4; i++) {
      const y = padT + cH * i / 4;
      const prc = maxP - pR * i / 4;
      const pct = ((prc - preClose) / preClose * 100).toFixed(2);
      ctx.fillStyle = prc >= preClose ? up : down;
      ctx.fillText((prc >= preClose ? '+' : '') + pct + '%', W - padR + 4, y);
    }
  }
  ctx.beginPath();
  ctx.moveTo(xs(0), yp(points[0].p));
  for (let i = 1; i < points.length; i++) ctx.lineTo(xs(i), yp(points[i].p));
  ctx.lineTo(xs(points.length - 1), padT + cH); ctx.lineTo(xs(0), padT + cH); ctx.closePath();
  const grad = ctx.createLinearGradient(0, padT, 0, padT + cH);
  const lastP = points[points.length - 1].p;
  const cUp = lastP >= (preClose || lastP);
  grad.addColorStop(0, hexA(cUp ? up : down, 0.35));
  grad.addColorStop(1, hexA(cUp ? up : down, 0.02));
  ctx.fillStyle = grad; ctx.fill();
  ctx.strokeStyle = cUp ? up : down; ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const x = xs(i), y = yp(points[i].p);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = '#666'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const fmt = (t: string) => t.length >= 4 ? `${t.slice(0,2)}:${t.slice(2,4)}` : t;
  const keyPoints = ['0930','1030','1130','1300','1400','1500'];
  for (const k of keyPoints) {
    const i = points.findIndex((p) => p.t >= k);
    if (i < 0) continue;
    ctx.fillText(fmt(k), xs(i), H - 4);
  }
}

function drawIntradayVol(ctx: CanvasRenderingContext2D, W: number, H: number, id: NonNullable<KLineProps['intraday']>, up: string, down: string) {
  ctx.fillStyle = '#12151a'; ctx.fillRect(0, 0, W, H);
  if (!id.ticks || !id.ticks.length) return;
  const padL = 46, padR = 8, padT = 4, padB = 4;
  const cW = W - padL - padR, cH = H - padT - padB;
  const ticks = id.ticks;
  let maxV = 0; for (const t of ticks) if (t.vol > maxV) maxV = t.vol;
  if (maxV === 0) return;
  for (let i = 0; i < ticks.length; i++) {
    const t = ticks[i];
    const x = padL + (ticks.length === 1 ? cW / 2 : cW * (i / (ticks.length - 1)));
    const h = cH * (t.vol / maxV);
    const col = (t.bs ?? 0) >= 0 ? up : down;
    ctx.fillStyle = hexA(col, 0.45);
    ctx.fillRect(x - 1, padT + cH - h, Math.max(2, 2), h);
  }
  ctx.fillStyle = '#666'; ctx.font = '9px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.fillText((maxV / 100).toFixed(0) + '手', padL - 4, padT + 4);
}

function drawIntradayAmount(ctx: CanvasRenderingContext2D, W: number, H: number, id: NonNullable<KLineProps['intraday']>, up: string, down: string) {
  ctx.fillStyle = '#12151a'; ctx.fillRect(0, 0, W, H);
  if (!id.ticks || !id.ticks.length) return;
  const padL = 46, padR = 8, padT = 4, padB = 4;
  const cW = W - padL - padR, cH = H - padT - padB;
  const ticks = id.ticks;
  let maxV = 0;
  for (const t of ticks) {
    const amt = t.vol * t.price;
    if (amt > maxV) maxV = amt;
  }
  if (maxV === 0) return;
  for (let i = 0; i < ticks.length; i++) {
    const t = ticks[i];
    const x = padL + (ticks.length === 1 ? cW / 2 : cW * (i / (ticks.length - 1)));
    const amt = t.vol * t.price;
    const h = cH * (amt / maxV);
    const col = (t.bs ?? 0) >= 0 ? up : down;
    ctx.fillStyle = hexA(col, 0.45);
    ctx.fillRect(x - 1, padT + cH - h, Math.max(2, 2), h);
  }
  ctx.fillStyle = '#666'; ctx.font = '9px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.fillText(formatAmount(maxV), padL - 4, padT + 4);
}

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
