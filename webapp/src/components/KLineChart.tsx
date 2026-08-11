// ============================================
// K 线 Canvas 渲染组件（MA/Vol/MACD/RSI + 分时 + 自定义指标）
// 从 VSCode 扩展 stockCenterHtml.ts 移植 + 适配移动端
// ============================================

import { useEffect, useRef, useState } from 'react';
import { FormulaResult } from '../lib/FormulaEngine';

export interface KLineProps {
  rows: string[];        // K线：time,open,close,high,low,vol  （CSV 字符串数组）
  intraday?: {           // 分时：如果提供则优先画分时
    minutes: string[];   // "HHMM,price[,vol]"
    preClose: number;
    ticks?: { time: string; price: number; vol: number; bs?: number }[];
    orderBook?: { buy: number[][]; sell: number[][] };
    days?: { date: string; minutes: string[] }[]; // 五日分时（提供时画五日图）
  };
  riseColor?: string;
  fallColor?: string;
  mainHeight?: number;
  customIndicators?: FormulaResult[]; // 自定义指标（主图叠加 + 副图窗格）
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

export default function KLineChart({ rows, intraday, riseColor = '#ff4d4f', fallColor = '#23c343', mainHeight, customIndicators }: KLineProps) {
  const mainRef = useRef<HTMLCanvasElement>(null);
  const volRef = useRef<HTMLCanvasElement>(null);
  const amountRef = useRef<HTMLCanvasElement>(null);
  const macdRef = useRef<HTMLCanvasElement>(null);
  const rsiRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const mainBoxRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const customRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const [subs, setSubs] = useState<string[]>(['vol']);
  const scrollRef = useRef<{ scroll: number; touched?: boolean }>({ scroll: 0 });
  const visBarsRef = useRef(60); // 可视 K 线根数（滚轮缩放）
  const dragRef = useRef<{ x: number; scroll: number } | null>(null);
  const crossRef = useRef(false); // 十字光标模式（双击/双击屏幕开关）
  const crossPosRef = useRef<{ x: number; y: number } | null>(null);
  const touchRef = useRef<{ x: number; scroll: number } | null>(null);
  const lastTapRef = useRef<{ t: number; x: number; y: number }>({ t: 0, x: 0, y: 0 });
  const pinchRef = useRef<{ dist: number; visBars: number } | null>(null);

  const subRefMap: Record<string, React.RefObject<HTMLCanvasElement>> = {
    vol: volRef,
    amount: amountRef,
    macd: macdRef,
    rsi: rsiRef,
  };

  const mainOverlays = (customIndicators || []).filter((x) => x?.type === 'main' && x.lines.length);
  const subPanes = (customIndicators || []).filter((x) => x?.type === 'sub' && x.lines.length);
  const customIds = subPanes.map((_, i) => 'custom:' + i);

  // 新增的副图指标自动开启显示（不强制恢复用户手动关闭的）
  useEffect(() => {
    if (!customIds.length) return;
    setSubs((prev) => {
      const add = customIds.filter((id) => !prev.includes(id));
      return add.length ? [...prev, ...add] : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customIds.join(',')]);

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
      if (intraday?.days?.length) drawIntraday5(ctx, W, mainH, intraday, riseColor, fallColor);
      else if (intraday) drawIntraday(ctx, W, mainH, intraday, riseColor, fallColor);
      else drawMain(ctx, W, mainH, data, riseColor, fallColor, scrollRef.current, mainOverlays, visBarsRef.current);
    }

    for (const sid of subs) {
      const isCustom = sid.startsWith('custom:');
      const sub = isCustom ? customRefs.current[sid] : subRefMap[sid]?.current;
      if (!sub) continue;
      sub.style.width = W + 'px';
      sub.style.height = subH + 'px';
      sub.width = W * dpr; sub.height = subH * dpr;
      const sctx = sub.getContext('2d')!;
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (sid === 'vol') {
        if (intraday?.days?.length) drawIntraday5Vol(sctx, W, subH, intraday, riseColor, fallColor);
        else if (intraday) drawIntradayVol(sctx, W, subH, intraday, riseColor, fallColor);
        else drawVol(sctx, W, subH, data, riseColor, fallColor, scrollRef.current, visBarsRef.current);
      } else if (sid === 'amount') {
        if (intraday && !intraday.days) drawIntradayAmount(sctx, W, subH, intraday, riseColor, fallColor);
        else if (!intraday) drawAmount(sctx, W, subH, data, riseColor, fallColor, scrollRef.current, visBarsRef.current);
      } else if (sid === 'macd') {
        if (!intraday) drawMACD(sctx, W, subH, data, riseColor, fallColor, scrollRef.current, visBarsRef.current);
      } else if (sid === 'rsi') {
        if (!intraday) drawRSI(sctx, W, subH, data, scrollRef.current, visBarsRef.current);
      } else if (isCustom) {
        const ind = subPanes[Number(sid.split(':')[1])];
        if (!intraday && ind) drawCustomIndicator(sctx, W, subH, data, ind, scrollRef.current, false, visBarsRef.current);
      }
    }
    // 刷新后恢复十字光标（轮询更新数据时不丢失）
    if (crossRef.current && crossPosRef.current) {
      drawCross(crossPosRef.current.x, crossPosRef.current.y);
    }
  }

  // ---------- 十字光标 ----------
  function mainGeo() {
    const wrap = wrapRef.current;
    if (!wrap) return null;
    const W = wrap.clientWidth;
    const mainH = mainHeight || Math.max(180, Math.min(280, W * 0.55));
    return { W, mainH, padL: 46, padR: 8, padT: 6, padB: 18 };
  }

  function clearCross() {
    const ov = overlayRef.current;
    if (ov) {
      const ctx = ov.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, ov.width, ov.height);
    }
    if (tipRef.current) tipRef.current.style.display = 'none';
  }

  function drawCross(px: number, py: number) {
    const g = mainGeo();
    const ov = overlayRef.current;
    if (!g || !ov) return;
    crossPosRef.current = { x: px, y: py };
    const dpr = dprOf();
    ov.width = g.W * dpr; ov.height = g.mainH * dpr;
    ov.style.width = g.W + 'px'; ov.style.height = g.mainH + 'px';
    const ctx = ov.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, g.W, g.mainH);
    const cW = g.W - g.padL - g.padR;
    const y = Math.max(g.padT, Math.min(g.mainH - g.padB, py));
    let cx = -1;
    let tip1 = '', tip2 = '', tip3 = '';
    if (intraday?.days?.length) {
      // 五日图不支持十字光标
      crossRef.current = false;
      crossPosRef.current = null;
      clearCross();
      return;
    } else if (intraday) {
      const pts = parseMinuteRows(intraday.minutes);
      if (!pts.length) return;
      const frac = Math.max(0, Math.min(1, (px - g.padL) / cW));
      const idx = Math.round(frac * (pts.length - 1));
      const d = pts[idx];
      cx = g.padL + (pts.length === 1 ? cW / 2 : cW * (idx / (pts.length - 1)));
      const pre = Number(intraday.preClose) || 0;
      const chg = d.p - pre;
      const t = d.t.length >= 4 ? d.t.slice(0, 2) + ':' + d.t.slice(2, 4) : d.t;
      tip1 = t + '  ' + d.p.toFixed(2) + '  ' + (chg >= 0 ? '+' : '') + chg.toFixed(2);
      tip2 = pre > 0 ? '涨跌 ' + (chg >= 0 ? '+' : '') + ((chg / pre) * 100).toFixed(2) + '%' : '';
      tip3 = d.v > 0 ? '量 ' + (d.v >= 10000 ? (d.v / 10000).toFixed(1) + '万' : String(Math.round(d.v))) : '';
    } else {
      const data = parseRows(rows);
      if (!data.length) return;
      const bars = visBarsRef.current;
      const gap = cW / bars;
      const totalBars = Math.floor(cW / gap);
      const maxScroll = Math.max(0, data.length - totalBars);
      const scroll = Math.max(0, Math.min(scrollRef.current.scroll, maxScroll));
      const start = Math.floor(scroll);
      let idx = start + Math.floor((px - g.padL) / gap);
      idx = Math.max(0, Math.min(data.length - 1, idx));
      if (idx < start || idx > start + totalBars) return;
      const d = data[idx];
      cx = g.padL + gap * (idx - start) + gap / 2;
      const dir = d.close >= d.open ? '▲' : '▼';
      tip1 = d.date + ' ' + dir;
      tip2 = '开 ' + d.open.toFixed(2) + ' 高 ' + d.high.toFixed(2);
      tip3 = '低 ' + d.low.toFixed(2) + ' 收 ' + d.close.toFixed(2) + ' 量 ' + (d.vol >= 10000 ? (d.vol / 10000).toFixed(1) + '万' : String(Math.round(d.vol)));
    }
    if (cx < 0) return;
    // 十字虚线 + 中心圆点
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.2; ctx.setLineDash([5, 3]);
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, g.mainH); ctx.stroke();
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(g.W, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(232,179,57,.9)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(cx, y, 3.5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(232,179,57,.25)';
    ctx.beginPath(); ctx.arc(cx, y, 3.5, 0, Math.PI * 2); ctx.fill();
    // 提示框
    const tip = tipRef.current;
    if (tip) {
      tip.innerHTML = '';
      for (const line of [tip1, tip2, tip3]) {
        if (!line) continue;
        const div = document.createElement('div');
        div.textContent = line;
        tip.appendChild(div);
      }
      tip.style.display = 'block';
      tip.style.left = (cx > g.W / 2 ? Math.max(4, cx - 150) : Math.min(g.W - 146, cx + 10)) + 'px';
      tip.style.top = '6px';
    }
  }

  function toggleCross(px: number, py: number) {
    crossRef.current = !crossRef.current;
    dragRef.current = null;
    touchRef.current = null;
    if (crossRef.current) drawCross(px, py);
    else { crossPosRef.current = null; clearCross(); }
  }

  // 主图区域相对坐标
  function mainPos(clientX: number, clientY: number) {
    const box = mainBoxRef.current;
    if (!box) return null;
    const r = box.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  return (
    <div
      className="kl-chart"
      ref={wrapRef}
      onWheel={(e) => {
        if (intraday) return;
        scrollRef.current.touched = true;
        visBarsRef.current = Math.max(20, Math.min(200, Math.round(visBarsRef.current * (e.deltaY > 0 ? 1.15 : 0.87))));
        render();
      }}
      onMouseDown={(e) => {
        if (intraday || crossRef.current) return;
        dragRef.current = { x: e.clientX, scroll: scrollRef.current.scroll };
        scrollRef.current.touched = true;
      }}
      onMouseMove={(e) => {
        const wrap = wrapRef.current;
        if (!wrap || intraday) return;
        const d = dragRef.current;
        if (d && !crossRef.current) {
          const gap = Math.max(1, (wrap.clientWidth - 54) / visBarsRef.current);
          scrollRef.current.scroll = Math.max(0, d.scroll - (e.clientX - d.x) / gap);
          render();
        }
      }}
      onMouseUp={() => { dragRef.current = null; }}
      onMouseLeave={() => { dragRef.current = null; }}
    >
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
      <div
        ref={mainBoxRef}
        style={{ position: 'relative', touchAction: 'none', cursor: 'crosshair' }}
        onDoubleClick={(e) => {
          const p = mainPos(e.clientX, e.clientY);
          if (p) toggleCross(p.x, p.y);
        }}
        onMouseMove={(e) => {
          if (!crossRef.current) return;
          const p = mainPos(e.clientX, e.clientY);
          if (p) drawCross(p.x, p.y);
        }}
        onTouchStart={(e) => {
          const touches = e.touches;
          // 双指缩放
          if (touches.length === 2) {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            pinchRef.current = { dist: Math.sqrt(dx * dx + dy * dy), visBars: visBarsRef.current };
            touchRef.current = null;
            return;
          }
          const t = touches[0];
          if (!t) return;
          const p = mainPos(t.clientX, t.clientY);
          if (!p) return;
          // 单击切换十字光标
          const now = Date.now();
          const lt = lastTapRef.current;
          if (now - lt.t < 320 && Math.abs(t.clientX - lt.x) < 30 && Math.abs(t.clientY - lt.y) < 30) {
            toggleCross(p.x, p.y);
            lastTapRef.current = { t: 0, x: 0, y: 0 };
            return;
          }
          lastTapRef.current = { t: now, x: t.clientX, y: t.clientY };
          if (crossRef.current) drawCross(p.x, p.y);
          else if (!intraday) touchRef.current = { x: t.clientX, scroll: scrollRef.current.scroll };
        }}
        onTouchMove={(e) => {
          const touches = e.touches;
          // 双指缩放
          if (touches.length === 2 && pinchRef.current) {
            e.preventDefault();
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const scale = pinchRef.current.dist / dist;
            visBarsRef.current = Math.max(20, Math.min(200, Math.round(pinchRef.current.visBars * scale)));
            render();
            return;
          }
          const t = touches[0];
          if (!t) return;
          const p = mainPos(t.clientX, t.clientY);
          if (!p) return;
          if (crossRef.current) {
            drawCross(p.x, p.y);
            return;
          }
          const td = touchRef.current;
          const wrap = wrapRef.current;
          if (td && !intraday && wrap) {
            scrollRef.current.touched = true;
            const gap = Math.max(1, (wrap.clientWidth - 54) / visBarsRef.current);
            scrollRef.current.scroll = Math.max(0, td.scroll - (t.clientX - td.x) / gap);
            render();
          }
        }}
        onTouchEnd={() => { touchRef.current = null; pinchRef.current = null; }}
      >
        <canvas className="kl-canvas" ref={mainRef} style={{ display: 'block' }} />
        <canvas
          ref={overlayRef}
          style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
        />
        <div
          ref={tipRef}
          style={{
            position: 'absolute', display: 'none', pointerEvents: 'none',
            background: 'rgba(0,0,0,.78)', border: '1px solid rgba(255,255,255,.18)',
            borderRadius: 4, padding: '4px 8px', fontSize: 10, lineHeight: 1.6,
            color: '#e8e8e8', whiteSpace: 'nowrap', zIndex: 5,
          }}
        />
      </div>
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
      {subPanes.map((ind, i) => {
        const cid = 'custom:' + i;
        if (!subs.includes(cid)) return null;
        return (
          <div key={cid} className="kl-sub" style={{ borderTop: '1px solid #1f2124', position: 'relative' }}>
            <div className="kl-sub-hdr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 8px 0', fontSize: '10px', opacity: 0.6 }}>
              <span style={{ color: '#666' }}>
                {ind.lines.map((l, j) => (
                  <span key={j} style={{ color: l.color, marginRight: 6 }}>{l.label}</span>
                ))}
                <span>{ind.name}</span>
              </span>
            </div>
            <canvas
              className="kl-canvas"
              ref={(el) => { customRefs.current[cid] = el; }}
              style={{ width: '100%', display: 'block' }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ---------- Main K线 ----------
function drawMain(ctx: CanvasRenderingContext2D, W: number, H: number, data: Row[], up: string, down: string, scrollS: { scroll: number; touched?: boolean }, overlays: FormulaResult[] | undefined, bars: number) {
  ctx.fillStyle = '#12151a'; ctx.fillRect(0, 0, W, H);
  if (!data.length) return;
  const padL = 46, padR = 8, padT = 6, padB = 18;
  const cW = W - padL - padR, cH = H - padT - padB;
  const gap = cW / bars;
  const barW = Math.max(2, Math.min(14, gap * 0.7));
  const totalBars = Math.floor(cW / gap);
  const maxScroll = Math.max(0, data.length - totalBars);
  scrollS.scroll = Math.max(0, Math.min(scrollS.scroll, maxScroll));
  // 首次定位到最新（用户手动拖动/缩放后不再回弹）
  if (!scrollS.touched && data.length > totalBars) scrollS.scroll = data.length - totalBars;
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
  // 主图叠加自定义指标：与 K 线使用同一可视区间/价格坐标
  if (overlays && overlays.length) {
    const pRv = maxP - minP || 1;
    for (const ind of overlays) {
      for (const line of ind.lines) {
        if (!line.values.length) continue;
        ctx.strokeStyle = line.color; ctx.lineWidth = 1; ctx.beginPath();
        let st = false;
        for (let i = 0; i < vis.length; i++) {
          const gi = start + i;
          if (gi >= line.values.length) break;
          const v = line.values[gi];
          if (v == null || isNaN(v)) continue;
          const x = padL + gap * (i - (start % 1)) + gap / 2;
          const y = padT + cH * (1 - (v - minP) / pRv);
          if (!st) { ctx.moveTo(x, y); st = true; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
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
  // 叠加指标图例
  if (overlays && overlays.length) {
    let ox = padL + 3 * 44;
    for (const ind of overlays) {
      for (const line of ind.lines) {
        ctx.fillStyle = line.color;
        ctx.fillText(line.label, ox, padT + 6);
        ox += ctx.measureText(line.label).width + 8;
      }
    }
  }
}

function drawVol(ctx: CanvasRenderingContext2D, W: number, H: number, data: Row[], up: string, down: string, scrollS: { scroll: number }, bars: number) {
  ctx.fillStyle = '#12151a'; ctx.fillRect(0, 0, W, H);
  if (!data.length) return;
  const padL = 46, padR = 8, padT = 4, padB = 4;
  const cW = W - padL - padR, cH = H - padT - padB;
  const gap = cW / bars;
  const barW = Math.max(2, Math.min(14, gap * 0.7));
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

function drawAmount(ctx: CanvasRenderingContext2D, W: number, H: number, data: Row[], up: string, down: string, scrollS: { scroll: number }, bars: number) {
  ctx.fillStyle = '#12151a'; ctx.fillRect(0, 0, W, H);
  if (!data.length) return;
  const padL = 46, padR = 8, padT = 4, padB = 4;
  const cW = W - padL - padR, cH = H - padT - padB;
  const gap = cW / bars;
  const barW = Math.max(2, Math.min(14, gap * 0.7));
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

function drawMACD(ctx: CanvasRenderingContext2D, W: number, H: number, data: Row[], up: string, down: string, scrollS: { scroll: number }, bars: number) {
  ctx.fillStyle = '#12151a'; ctx.fillRect(0, 0, W, H);
  if (!data.length) return;
  const padL = 46, padR = 8, padT = 4, padB = 4;
  const cW = W - padL - padR, cH = H - padT - padB;
  const gap = cW / bars;
  const barW = Math.max(2, Math.min(14, gap * 0.7));
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

function drawRSI(ctx: CanvasRenderingContext2D, W: number, H: number, data: Row[], scrollS: { scroll: number }, bars: number) {
  ctx.fillStyle = '#12151a'; ctx.fillRect(0, 0, W, H);
  if (!data.length) return;
  const padL = 46, padR = 8, padT = 4, padB = 4;
  const cW = W - padL - padR, cH = H - padT - padB;
  const gap = cW / bars;
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
// 解析分钟行 "HHMM,price[,vol]"
function parseMinuteRows(minutes: string[]): { t: string; p: number; v: number }[] {
  const pts: { t: string; p: number; v: number }[] = [];
  for (const m of minutes) {
    const p = String(m).split(',');
    if (p.length < 2) continue;
    pts.push({ t: p[0], p: parseFloat(p[1]), v: parseFloat(p[2] || '0') || 0 });
  }
  return pts;
}

function drawIntraday(ctx: CanvasRenderingContext2D, W: number, H: number, id: NonNullable<KLineProps['intraday']>, up: string, down: string) {
  ctx.fillStyle = '#12151a'; ctx.fillRect(0, 0, W, H);
  if (!id.minutes.length) return;
  const padL = 46, padR = 8, padT = 6, padB = 18;
  const cW = W - padL - padR, cH = H - padT - padB;
  const preClose = Number(id.preClose) || 0;
  const points = parseMinuteRows(id.minutes);
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
  const padL = 46, padR = 8, padT = 4, padB = 4;
  const cW = W - padL - padR, cH = H - padT - padB;
  const pts = parseMinuteRows(id.minutes);
  let maxV = 0;
  for (const p of pts) if (p.v > maxV) maxV = p.v;
  if (maxV === 0 && id.ticks) for (const t of id.ticks) if (t.vol > maxV) maxV = t.vol;
  if (maxV === 0) return;
  const bw = Math.max(1, cW / Math.max(pts.length, 241) * 0.8);
  if (pts.length && maxV > 0) {
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const x = padL + (pts.length === 1 ? cW / 2 : cW * (i / (pts.length - 1)));
      const h = cH * (p.v / maxV);
      const prev = i > 0 ? pts[i - 1].p : Number(id.preClose) || p.p;
      const col = p.p > prev ? up : p.p < prev ? down : '#888';
      ctx.fillStyle = hexA(col, 0.45);
      ctx.fillRect(x - bw / 2, padT + cH - h, bw, h);
    }
  } else if (id.ticks) {
    for (let i = 0; i < id.ticks.length; i++) {
      const t = id.ticks[i];
      const x = padL + (id.ticks.length === 1 ? cW / 2 : cW * (i / (id.ticks.length - 1)));
      const h = cH * (t.vol / maxV);
      const col = (t.bs ?? 0) >= 0 ? up : down;
      ctx.fillStyle = hexA(col, 0.45);
      ctx.fillRect(x - 1, padT + cH - h, 2, h);
    }
  }
  ctx.fillStyle = '#666'; ctx.font = '9px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.fillText((maxV / 100).toFixed(0) + '手', padL - 4, padT + 4);
}

function drawIntradayAmount(ctx: CanvasRenderingContext2D, W: number, H: number, id: NonNullable<KLineProps['intraday']>, up: string, down: string) {
  ctx.fillStyle = '#12151a'; ctx.fillRect(0, 0, W, H);
  const padL = 46, padR = 8, padT = 4, padB = 4;
  const cW = W - padL - padR, cH = H - padT - padB;
  const pts = parseMinuteRows(id.minutes);
  let maxV = 0;
  for (const p of pts) { const amt = p.v * p.p * 100; if (amt > maxV) maxV = amt; }
  if (maxV === 0 && id.ticks) for (const t of id.ticks) { const amt = t.vol * t.price; if (amt > maxV) maxV = amt; }
  if (maxV === 0) return;
  const bw = Math.max(1, cW / Math.max(pts.length, 241) * 0.8);
  if (pts.length) {
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const x = padL + (pts.length === 1 ? cW / 2 : cW * (i / (pts.length - 1)));
      const h = cH * ((p.v * p.p * 100) / maxV);
      const prev = i > 0 ? pts[i - 1].p : Number(id.preClose) || p.p;
      const col = p.p > prev ? up : p.p < prev ? down : '#888';
      ctx.fillStyle = hexA(col, 0.45);
      ctx.fillRect(x - bw / 2, padT + cH - h, bw, h);
    }
  } else if (id.ticks) {
    for (let i = 0; i < id.ticks.length; i++) {
      const t = id.ticks[i];
      const x = padL + (id.ticks.length === 1 ? cW / 2 : cW * (i / (id.ticks.length - 1)));
      const amt = t.vol * t.price;
      const h = cH * (amt / maxV);
      const col = (t.bs ?? 0) >= 0 ? up : down;
      ctx.fillStyle = hexA(col, 0.45);
      ctx.fillRect(x - 1, padT + cH - h, 2, h);
    }
  }
  ctx.fillStyle = '#666'; ctx.font = '9px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.fillText(formatAmount(maxV), padL - 4, padT + 4);
}

// ---------- 五日分时 ----------
function drawIntraday5(ctx: CanvasRenderingContext2D, W: number, H: number, id: NonNullable<KLineProps['intraday']>, up: string, down: string) {
  ctx.fillStyle = '#12151a'; ctx.fillRect(0, 0, W, H);
  const days = id.days || [];
  if (!days.length) return;
  const padL = 46, padR = 8, padT = 6, padB = 18;
  const cW = W - padL - padR, cH = H - padT - padB;
  const preClose = Number(id.preClose) || 0;
  const series = days.map((d) => parseMinuteRows(d.minutes));
  let minP = Infinity, maxP = -Infinity;
  for (const pts of series) for (const p of pts) { if (p.p < minP) minP = p.p; if (p.p > maxP) maxP = p.p; }
  if (!isFinite(minP)) return;
  if (preClose > 0) {
    const dr = Math.max(Math.abs(maxP - preClose), Math.abs(minP - preClose), preClose * 0.01);
    minP = preClose - dr * 1.1; maxP = preClose + dr * 1.1;
  } else { const r = (maxP - minP) * 0.1 || 1; minP -= r; maxP += r; }
  const pR = maxP - minP || 1;
  const maxBars = Math.max(...series.map((s) => s.length), 1);
  const colW = cW / days.length;
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
    const y0 = padT + cH * (1 - (preClose - minP) / pR);
    ctx.beginPath(); ctx.moveTo(padL, y0); ctx.lineTo(W - padR, y0); ctx.stroke(); ctx.setLineDash([]);
  }
  for (let di = 0; di < days.length; di++) {
    const pts = series[di];
    const x0 = padL + colW * di;
    if (di > 0) {
      ctx.strokeStyle = '#1f2124';
      ctx.beginPath(); ctx.moveTo(x0, padT); ctx.lineTo(x0, padT + cH); ctx.stroke();
    }
    if (!pts.length) continue;
    const xs = (i: number) => x0 + colW * (i / Math.max(maxBars - 1, 1));
    const yp = (v: number) => padT + cH * (1 - (v - minP) / pR);
    const lastP = pts[pts.length - 1].p;
    const cUp = lastP >= (preClose || lastP);
    ctx.strokeStyle = cUp ? up : down; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const x = xs(i), y = yp(pts[i].p);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#888'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const d8 = String(days[di].date);
    ctx.fillText(d8.length === 8 ? d8.slice(4, 6) + '/' + d8.slice(6) : d8, x0 + colW / 2, H - 4);
  }
}

// ---------- 自定义指标 ----------
function drawCustomIndicator(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  data: Row[],
  indicator: FormulaResult,
  scrollS: { scroll: number },
  isMain: boolean,
  bars = 60
) {
  if (!indicator.lines.length || !indicator.lines[0].values.length) return;
  
  const padL = 46, padR = 8, padT = isMain ? 6 : 4, padB = isMain ? 18 : 4;
  const cW = W - padL - padR, cH = H - padT - padB;
  const gap = cW / bars;
  const totalBars = Math.floor(cW / gap);
  const start = Math.floor(scrollS.scroll);
  
  if (isMain) {
    // 主图叠加：使用 K 线的价格范围
    let minP = Infinity, maxP = -Infinity;
    for (const d of data) { if (d.low < minP) minP = d.low; if (d.high > maxP) maxP = d.high; }
    const pR = maxP - minP || 1;
    const ext = pR * 0.08; minP -= ext; maxP += ext;
    
    // 绘制指标线
    for (const line of indicator.lines) {
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      let started = false;
      
      for (let i = 0; i < totalBars + 2; i++) {
        const gi = start + i;
        if (gi >= line.values.length) break;
        const v = line.values[gi];
        if (isNaN(v) || v === null) continue;
        
        const x = padL + gap * (i - (start % 1)) + gap / 2;
        const y = padT + cH * (1 - (v - minP) / (maxP - minP));
        
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else {
    // 副图：独立范围
    ctx.fillStyle = '#12151a';
    ctx.fillRect(0, 0, W, H);
    
    let minV = Infinity, maxV = -Infinity;
    for (const line of indicator.lines) {
      for (let i = start; i < Math.min(line.values.length, start + totalBars + 2); i++) {
        const v = line.values[i];
        if (!isNaN(v) && v !== null) {
          if (v < minV) minV = v;
          if (v > maxV) maxV = v;
        }
      }
    }
    
    if (minV === Infinity || maxV === -Infinity) return;
    
    // 添加边距
    const vRange = maxV - minV || 1;
    minV -= vRange * 0.1;
    maxV += vRange * 0.1;
    const vSpan = maxV - minV;
    
    // 绘制网格
    ctx.strokeStyle = '#1f2124';
    ctx.lineWidth = 0.5;
    ctx.fillStyle = '#666';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i <= 2; i++) {
      const y = padT + cH * i / 2;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      const val = maxV - (vSpan * i) / 2;
      ctx.fillText(val.toFixed(2), padL - 4, y);
    }
    
    // 绘制指标线
    for (const line of indicator.lines) {
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      let started = false;
      
      for (let i = 0; i < totalBars + 2; i++) {
        const gi = start + i;
        if (gi >= line.values.length) break;
        const v = line.values[gi];
        if (isNaN(v) || v === null) continue;
        
        const x = padL + gap * (i - (start % 1)) + gap / 2;
        const y = padT + cH * (1 - (v - minV) / vSpan);
        
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    
    // 绘制指标名称
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let offsetX = padL;
    for (const line of indicator.lines) {
      ctx.fillStyle = line.color;
      ctx.fillText(line.label, offsetX, padT + 4);
      offsetX += ctx.measureText(line.label).width + 10;
    }
  }
}

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// 五日分时量柱
function drawIntraday5Vol(ctx: CanvasRenderingContext2D, W: number, H: number, id: NonNullable<KLineProps['intraday']>, up: string, down: string) {
  ctx.fillStyle = '#12151a'; ctx.fillRect(0, 0, W, H);
  const days = id.days || [];
  if (!days.length) return;
  const padL = 46, padR = 8, padT = 4, padB = 4;
  const cW = W - padL - padR, cH = H - padT - padB;
  const preClose = Number(id.preClose) || 0;
  const series = days.map((d) => parseMinuteRows(d.minutes));
  let maxV = 0;
  for (const pts of series) for (const p of pts) if (p.v > maxV) maxV = p.v;
  if (maxV === 0) return;
  const maxBars = Math.max(...series.map((s) => s.length), 1);
  const colW = cW / days.length;
  for (let di = 0; di < days.length; di++) {
    const pts = series[di];
    const x0 = padL + colW * di;
    if (di > 0) {
      ctx.strokeStyle = '#1f2124';
      ctx.beginPath(); ctx.moveTo(x0, padT); ctx.lineTo(x0, padT + cH); ctx.stroke();
    }
    const bw = Math.max(1, colW / Math.max(maxBars, 1) * 0.8);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const x = x0 + colW * (i / Math.max(maxBars - 1, 1));
      const h = cH * (p.v / maxV);
      const prev = i > 0 ? pts[i - 1].p : preClose || p.p;
      const col = p.p > prev ? up : p.p < prev ? down : '#888';
      ctx.fillStyle = hexA(col, 0.45);
      ctx.fillRect(x - bw / 2, padT + cH - h, bw, h);
    }
  }
  ctx.fillStyle = '#666'; ctx.font = '9px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.fillText((maxV / 100).toFixed(0) + '手', padL - 4, padT + 4);
}
