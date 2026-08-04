// ============================================
// 筹码分布图 Canvas 组件（由 stockCenterHtml.ts renderChips 移植）
// 根据日K rows 估算 120 日筹码分布 + 获利比例 + 平均成本
// ============================================

import { useEffect, useRef } from 'react';

interface ChipsChartProps {
  rows: string[];   // date,open,close,high,low,vol
  floatShares?: number; // 流通股本（股），用于换手率估算；未提供时默认 hsl=3%
  riseColor?: string;
  fallColor?: string;
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
function hexA(hex: string, a: number): string {
  const h = String(hex).replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
}

export default function ChipsChart({ rows, floatShares, riseColor = '#ff4d4f', fallColor = '#23c343' }: ChipsChartProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { render(); });

  function render() {
    const canvas = ref.current;
    if (!canvas) return;
    const data = parseRows(rows);
    const dpr = window.devicePixelRatio || 1;
    const W = Math.max(120, (canvas.parentElement?.clientWidth || 180) - 8);
    const H = Math.max(360, W * 2.6);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#12151a'; ctx.fillRect(0, 0, W, H);

    if (data.length < 2) {
      ctx.fillStyle = '#666'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('数据不足', W / 2, H / 2); return;
    }
    const range = 120;
    const start = Math.max(0, data.length - range);
    const use = data.slice(start);
    const factor = 150;
    let maxPrice = 0, minPrice = Infinity;
    for (const d of use) { if (d.high > maxPrice) maxPrice = d.high; if (d.low < minPrice) minPrice = d.low; }
    const accuracy = Math.max(0.01, (maxPrice - minPrice) / (factor - 1));
    const yr: number[] = [], xr: number[] = [];
    for (let i = 0; i < factor; i++) { yr.push(minPrice + accuracy * i); xr.push(0); }

    const shares = Number(floatShares) || 0;
    const lastClose = use[use.length - 1].close;
    for (const k of use) {
      const { open: o, close: c, high: h, low: l, vol: volume } = k;
      const avg = (o + c + h + l) / 4;
      const volShares = volume * 100;
      const hsl = shares > 0 ? Math.min(1, volShares / shares) : 0.03;
      const hsl2 = hsl <= 0 ? 0.02 : hsl;
      const HIdx = Math.floor((h - minPrice) / accuracy);
      const LIdx = Math.ceil((l - minPrice) / accuracy);
      const GPx = (h === l) ? factor - 1 : (2 / (h - l));
      const GPy = Math.floor((avg - minPrice) / accuracy);
      for (let n = 0; n < xr.length; n++) xr[n] *= (1 - hsl2);
      if (h === l) {
        xr[GPy] += GPx * hsl2 / 2;
      } else {
        for (let j = Math.max(0, LIdx); j <= Math.min(factor - 1, HIdx); j++) {
          const cur = minPrice + accuracy * j;
          let add;
          if (cur <= avg) add = Math.abs(avg - l) < 1e-8 ? (GPx * hsl2) : ((cur - l) / (avg - l) * GPx * hsl2);
          else add = Math.abs(h - avg) < 1e-8 ? (GPx * hsl2) : ((h - cur) / (h - avg) * GPx * hsl2);
          xr[j] += add;
        }
      }
    }
    let total = 0; for (const x of xr) total += x;
    let mx = 0; for (const x of xr) if (x > mx) mx = x;
    if (mx <= 0) {
      ctx.fillStyle = '#666'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('暂无筹码数据', W / 2, H / 2); return;
    }
    const padL = 44, padR = 6, padT = 6, padB = 26;
    const barH = (H - padT - padB) / factor;
    for (let i = 0; i < xr.length; i++) {
      const w = (xr[i] / mx) * (W - padL - padR);
      const y = padT + i * barH;
      const cur = yr[i];
      const isUp = cur >= lastClose;
      ctx.fillStyle = isUp ? hexA(riseColor, 0.75) : hexA(fallColor, 0.75);
      ctx.fillRect(W - padR - w, y, Math.max(w, 0.5), Math.max(barH - 1, 0.5));
      if (i % 15 === 0 || i === 0) {
        ctx.fillStyle = '#666'; ctx.font = '8px monospace'; ctx.textAlign = 'right';
        ctx.fillText(cur.toFixed(2), padL - 2, y + 8);
      }
    }
    const lineY = padT + ((lastClose - minPrice) / accuracy) * barH;
    ctx.strokeStyle = '#e8b339'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(padL, lineY); ctx.lineTo(W - padR, lineY); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#e8b339'; ctx.font = '9px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('现价 ' + lastClose.toFixed(2), padL, lineY - 3);
    let benefit = 0;
    for (let i = 0; i < xr.length; i++) if (yr[i] <= lastClose) benefit += xr[i];
    const benefitPct = total > 0 ? (benefit / total * 100) : 0;
    const half = total * 0.5; let acc = 0; let avgCost = 0;
    for (let i = 0; i < xr.length; i++) { acc += xr[i]; if (acc >= half) { avgCost = yr[i]; break; } }
    ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('获利比例 ' + benefitPct.toFixed(1) + '%', padL, H - 24);
    ctx.fillText('平均成本 ' + avgCost.toFixed(2), padL, H - 10);
    ctx.fillStyle = '#666'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('近' + use.length + '日', W - padR, H - 10);
  }
  return <canvas className="kl-canvas" ref={ref} />;
}
