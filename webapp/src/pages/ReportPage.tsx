// ============================================
// 选股报告页：复现 stock-extension 的 stockReportGenerator
// 六维评分（资金/行业/走势/财务/基本面/股东）+ SVG 雷达/K线/资金流图 + 完整报告
// ============================================

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from '../router/useRouter';
import { api } from '../api/client';

type FetchFn = (path: string) => Promise<any>;

interface RankItem {
  f12: string; f14: string; f2: number; f3: number; f6: number;
  f9: number; f20: number; f23: number; f8: number;
  f62: number; f66: number; f72: number; f100: string; f124: string;
}
interface SectorItem { f12: string; f14: string; f3: number; f62: number; f104: number; f105: number; f204: string; f205: string; }
interface FlowDay { date: string; main: number; small: number; mid: number; big: number; super: number; mainRatio: number; close: number; pct: number; }
interface HolderItem { endDate: string; holderNum: number; preHolderNum: number; holderNumRatio: number; closePrice: number; }
interface DeepData {
  closes: number[]; vols: number[]; ma5: number; ma10: number; ma20: number;
  rsi14: number; macdDif: number; macdDea: number; macdHist: number;
  flow: FlowDay[]; fin: Record<string, string>; holders: HolderItem[];
}
interface ScoredStock extends RankItem {
  dims: { money: number; trend: number; industry: number; finance: number; basic: number; holder: number };
  total: number; deep: DeepData; rank: number;
}

// ========== 通用工具（与 stockReportGenerator 保持一致） ==========
function esc(s: any): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function emMarket(code: string, isIndex = false): string {
  const c = String(code || '');
  if (isIndex) return /^399/.test(c) ? 'sz' : 'sh';
  if (/^(60|68|9|11|13|50|56|51|58)/.test(c)) return 'sh';
  if (/^(43|83|87|92|88)/.test(c)) return 'bj';
  if (/^(00|30|20|12|15|16|18)/.test(c)) return 'sz';
  return 'sh';
}
function emUrl(code: string, isIndex = false): string {
  return `https://quote.eastmoney.com/${emMarket(code, isIndex)}${String(code || '')}.html`;
}
function emLink(code: string, text: string, isIndex = false): string {
  const url = emUrl(code, isIndex);
  return `<a href="${url}" data-em="1" target="_blank" rel="noopener">${text}</a>`;
}
function fmtYi(v: number): string { return (Number(v || 0) / 1e8).toFixed(2); }
function fmtN(v: any, d = 2): string { const n = Number(v); return isNaN(n) ? '-' : n.toFixed(d); }
function pctStr(v: number): string { const n = Number(v || 0); return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'; }
function upDownCls(v: number): string { const n = Number(v || 0); return n > 0 ? 'up' : n < 0 ? 'down' : 'flat'; }
function avg(arr: number[]): number { if (!arr.length) return 0; return arr.reduce((a, b) => a + b, 0) / arr.length; }
function sum(arr: number[]): number { return arr.reduce((a, b) => a + b, 0); }
function seg(v: number, s: [number, number][]): number {
  for (const [threshold, score] of s) if (v >= threshold) return score;
  return s[s.length - 1][1];
}
function parseFinance(items: any[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const it of items || []) if (it && it.label) map[it.label] = String(it.value ?? '');
  return map;
}
function numOf(s: string): number {
  const m = String(s || '').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}
function scoreColor(s: number): string {
  if (s >= 80) return '#d6336c';
  if (s >= 70) return '#e8590c';
  if (s >= 60) return '#f08c00';
  if (s >= 50) return '#5c7cfa';
  return '#868e96';
}
function calcMA(closes: number[], n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < n - 1) { out.push(NaN); continue; }
    let s = 0; for (let j = i - n + 1; j <= i; j++) s += closes[j];
    out.push(s / n);
  }
  return out;
}
function calcRSI(closes: number[], n = 14): number {
  if (closes.length < n + 1) return NaN;
  let gain = 0, loss = 0;
  for (let i = 1; i <= n; i++) { const d = closes[i] - closes[i - 1]; if (d >= 0) gain += d; else loss -= d; }
  if (gain === 0) return 0; if (loss === 0) return 100;
  let ag = gain / n, al = loss / n;
  for (let i = n + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    ag = (ag * (n - 1) + (d > 0 ? d : 0)) / n;
    al = (al * (n - 1) + (d < 0 ? -d : 0)) / n;
  }
  const rs = al === 0 ? 100 : ag / al;
  return 100 - 100 / (1 + rs);
}
function calcMACD(closes: number[]): { dif: number; dea: number; hist: number } {
  const ema = (n: number): number => { let k = 2 / (n + 1), e = closes[0]; for (let i = 1; i < closes.length; i++) e = closes[i] * k + e * (1 - k); return e; };
  const dif = ema(12) - ema(26);
  const dea = dif; const hist = dif - dea;
  return { dif, dea, hist };
}
function parseKlineRows(rows: string[]): { closes: number[]; vols: number[] } {
  const closes: number[] = [], vols: number[] = [];
  for (const row of rows) {
    const p = row.split(',');
    if (p.length >= 6) { const c = parseFloat(p[2]); if (!isNaN(c)) { closes.push(c); vols.push(parseFloat(p[5]) || 0); } }
  }
  return { closes, vols };
}
async function fetchDeep(fetchFn: FetchFn, code: string): Promise<DeepData> {
  const [k, f, fi, h] = await Promise.all([
    fetchFn(`/api/kline?code=${code}&period=day`),
    fetchFn(`/api/stock-fflow-day?code=${code}&lmt=30`),
    fetchFn(`/api/stock-finance?code=${code}`),
    fetchFn(`/api/stock-holder?code=${code}`),
  ]);
  const rows: string[] = (k?.data?.klines || []).slice(-60);
  const { closes, vols } = parseKlineRows(rows);
  const ma5Arr = calcMA(closes, 5), ma10Arr = calcMA(closes, 10), ma20Arr = calcMA(closes, 20);
  const last = closes.length - 1; const macd = calcMACD(closes);
  return {
    closes, vols,
    ma5: last >= 0 && !isNaN(ma5Arr[last]) ? ma5Arr[last] : NaN,
    ma10: last >= 0 && !isNaN(ma10Arr[last]) ? ma10Arr[last] : NaN,
    ma20: last >= 0 && !isNaN(ma20Arr[last]) ? ma20Arr[last] : NaN,
    rsi14: calcRSI(closes),
    macdDif: macd.dif, macdDea: macd.dea, macdHist: macd.hist,
    flow: (f?.data?.list || []),
    fin: parseFinance(fi?.data?.items || []),
    holders: (h?.data?.list || []),
  };
}

// ========== 六维评分 ==========
function scoreMoney(it: RankItem, flow: FlowDay[]): number {
  const inflowYi = (it.f62 || 0) / 1e8;
  const ratio = it.f6 ? (((it.f62 || 0) / it.f6) * 100) : 0;
  const superRatio = it.f62 > 0 ? (((it.f66 || 0) / it.f62) * 100) : 0;
  const sIn = seg(inflowYi, [[15, 100], [10, 90], [5, 80], [2, 65], [0, 50], [-5, 30]]);
  const sRatio = seg(ratio, [[20, 100], [15, 90], [10, 80], [5, 65], [0, 50], [-99, 30]]);
  const sSuper = seg(superRatio, [[100, 100], [80, 90], [60, 80], [40, 65], [-99, 50]]);
  let p5 = 50, p20 = 50;
  if (flow.length) { const last5 = flow.slice(-5), last20 = flow.slice(-20); p5 = (last5.filter((d) => d.main > 0).length / last5.length) * 100; p20 = (last20.filter((d) => d.main > 0).length / last20.length) * 100; }
  return Math.round(0.3 * sIn + 0.2 * sRatio + 0.15 * sSuper + 0.175 * p5 + 0.175 * p20);
}
function vols20(vols: number[], n: number): number[] { return vols.length ? vols.slice(-n) : []; }
function scoreTrend(it: RankItem, deep: DeepData): number {
  const { closes, ma5, ma10, ma20, rsi14, macdDif, macdDea, macdHist } = deep;
  const price = it.f2 || 0; if (!closes.length || !price) return 50;
  let maAlign = 40;
  if (price > ma5 && ma5 > ma10 && ma10 > ma20) maAlign = 100;
  else if (price > ma5 && ma5 > ma20) maAlign = 85;
  else if (price > ma20) maAlign = 70;
  else if (price > ma5) maAlign = 60;
  const win20 = closes.slice(-20);
  const min20 = Math.min(...win20), max20 = Math.max(...win20);
  const pos = max20 > min20 ? ((price - min20) / (max20 - min20)) * 100 : 50;
  const sPos = seg(pos, [[90, 80], [75, 95], [60, 100], [40, 85], [20, 70], [-99, 55]]);
  const v5 = avg(vols20(deep.vols, 5)), v20 = avg(vols20(deep.vols, 20));
  const vr = v20 > 0 ? v5 / v20 : 1;
  const sVr = seg(vr, [[2, 60], [1.3, 75], [0.8, 90], [0.5, 70], [0, 50]]);
  const sRsi = isNaN(rsi14) ? 50 : seg(rsi14, [[80, 50], [70, 70], [55, 95], [45, 80], [30, 55], [0, 35]]);
  const rising = macdHist >= 0 && macdDif >= macdDea;
  const sMacd = macdDif > macdDea ? (rising ? 95 : 80) : (macdDif > 0 ? 70 : 40);
  const chg20 = win20[0] ? ((price - win20[0]) / win20[0]) * 100 : 0;
  const sChg = seg(chg20, [[20, 95], [10, 85], [5, 75], [0, 65], [-99, 45]]);
  return Math.round(0.25 * maAlign + 0.15 * sPos + 0.15 * sVr + 0.15 * sRsi + 0.15 * sMacd + 0.15 * sChg);
}
function scoreIndustry(sector: SectorItem | undefined): number {
  if (!sector) return 50;
  const sChg = seg(sector.f3, [[5, 100], [3, 90], [2, 80], [1, 65], [0, 50], [-99, 30]]);
  const sFlow = seg((sector.f62 || 0) / 1e8, [[50, 100], [30, 90], [15, 80], [5, 65], [0, 50], [-99, 30]]);
  const tot = (sector.f104 || 0) + (sector.f105 || 0);
  const upRatio = tot > 0 ? (sector.f104 / tot) : 0.5;
  const sUp = seg(upRatio * 100, [[90, 100], [80, 90], [70, 75], [50, 55], [0, 35]]);
  return Math.round(0.4 * sChg + 0.3 * sFlow + 0.3 * sUp);
}
function scoreFinance(fin: Record<string, string>): number {
  const roe = numOf(fin['净资产收益率']); const margin = numOf(fin['净利率']);
  const rev = numOf(fin['营收同比增长']); const profit = numOf(fin['净利润同比增长']); const debt = numOf(fin['资产负债率']);
  const sRoe = isNaN(roe) ? 50 : seg(roe, [[15, 95], [10, 85], [8, 75], [5, 65], [0, 50], [-99, 25]]);
  const sMargin = isNaN(margin) ? 50 : seg(margin, [[20, 90], [10, 80], [5, 70], [0, 55], [-99, 30]]);
  const sRev = isNaN(rev) ? 50 : seg(rev, [[30, 95], [15, 85], [5, 75], [0, 60], [-99, 40]]);
  const sProfit = isNaN(profit) ? 50 : seg(profit, [[50, 95], [20, 85], [5, 75], [0, 60], [-99, 35]]);
  const sDebt = isNaN(debt) ? 50 : seg(debt, [[-1, 85], [40, 85], [55, 75], [70, 65], [1000, 45]]);
  return Math.round(0.25 * sRoe + 0.2 * sMargin + 0.2 * sRev + 0.2 * sProfit + 0.15 * sDebt);
}
function scoreBasic(it: RankItem): number {
  const pe = it.f9 || NaN; const pb = it.f23 || NaN; const capYi = (it.f20 || 0) / 1e8;
  const sPe = isNaN(pe) || pe <= 0 ? (pe < 0 ? 35 : 50) : seg(pe, [[20, 90], [30, 80], [50, 70], [80, 60], [1000, 45]]);
  const sPb = isNaN(pb) ? 50 : seg(pb, [[3, 90], [5, 80], [8, 70], [15, 60], [1000, 45]]);
  const sCap = seg(capYi, [[5000, 65], [1000, 75], [100, 80], [0, 70]]);
  const sTurn = seg(it.f8 || 0, [[30, 40], [15, 55], [8, 70], [2, 85], [0, 60]]);
  return Math.round(0.3 * sPe + 0.25 * sPb + 0.25 * sCap + 0.2 * sTurn);
}
function scoreHolder(holders: HolderItem[]): number {
  const h0 = holders[0]; if (!h0 || isNaN(h0.holderNumRatio)) return 50;
  let consec = 0; for (const h of holders) { if (h.holderNumRatio != null && h.holderNumRatio < 0) consec++; else break; }
  const sConsec = seg(consec, [[3, 95], [2, 85], [1, 70], [0, 50]]);
  const ratio = Number(h0.holderNumRatio);
  const sRatio = seg(ratio, [[-20, 100], [-10, 90], [-5, 80], [0, 70], [5, 55], [10, 40], [1000, 30]]);
  return Math.round(0.7 * sRatio + 0.3 * sConsec);
}

// ========== SVG 图表 ==========
function radarSvg(scores: number[]): string {
  const cx = 115, cy = 115; const angles = [-90, -30, 30, 90, 150, 210];
  const rad = (d: number) => (d * Math.PI) / 180;
  const pt = (r: number, a: number) => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))];
  const rings = [20.2, 40.5, 60.75, 81]; let s = '';
  for (const r of rings) s += `<polygon points="${angles.map((a) => pt(r, a).map((x) => x.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="#dee2e6" stroke-width="1"></polygon>`;
  for (const a of angles) { const p = pt(81, a); s += `<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${p[0].toFixed(1)}" y2="${p[1].toFixed(1)}" stroke="#dee2e6" stroke-width="1"></line>`; }
  const dataPts = scores.map((sc, i) => { const r = 20.2 + sc * 0.6; return pt(r, angles[i]); });
  s += `<polygon points="${dataPts.map((p) => p.map((x) => x.toFixed(1)).join(',')).join(' ')}" fill="rgba(224,49,49,0.18)" stroke="#e03131" stroke-width="2" stroke-linejoin="round"></polygon>`;
  for (const p of dataPts) s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="#e03131"></circle>`;
  const labels = [
    { t: '资金面', x: cx, y: 18, anchor: 'middle' },
    { t: '行业异动', x: 202.5, y: 68.5, anchor: 'start' },
    { t: '走势分析', x: 202.5, y: 169.5, anchor: 'start' },
    { t: '财务分析', x: cx, y: 214, anchor: 'middle' },
    { t: '基本面', x: 27.5, y: 169.5, anchor: 'end' },
    { t: '股东分析', x: 27.5, y: 68.5, anchor: 'end' },
  ];
  for (let i = 0; i < 6; i++) {
    const L = labels[i];
    s += `<text x="${L.x.toFixed(1)}" y="${L.y.toFixed(1)}" text-anchor="${L.anchor}" class="radar-lbl">${L.t}</text>`;
    s += `<text x="${L.x.toFixed(1)}" y="${(L.y + 12).toFixed(1)}" text-anchor="${L.anchor}" class="radar-val">${Math.round(scores[i])}</text>`;
  }
  return s;
}
function klineSvg(closes: number[], vols: number[]): string {
  if (closes.length < 2) return '<div class="nodata">K线数据不足</div>';
  const ma5 = calcMA(closes, 5), ma20 = calcMA(closes, 20);
  const all = closes.concat(ma5.filter((x) => !isNaN(x)), ma20.filter((x) => !isNaN(x)));
  const min = Math.min(...all), max = Math.max(...all);
  const W = 470, yTop = 6, yBot = 96;
  const y = (v: number) => (max > min ? yTop + ((max - v) / (max - min)) * (yBot - yTop) : (yTop + yBot) / 2);
  const x = (i: number) => (i / Math.max(1, closes.length - 1)) * W;
  const pts = closes.map((c, i) => `${x(i).toFixed(1)},${y(c).toFixed(1)}`);
  const ma5Pts = ma5.map((v, i) => (isNaN(v) ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean);
  const ma20Pts = ma20.map((v, i) => (isNaN(v) ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean);
  const maxVol = Math.max(...vols, 1); const volW = W / vols.length * 0.7;
  let volBars = '';
  for (let i = 0; i < vols.length; i++) {
    const h = (vols[i] / maxVol) * 26;
    volBars += `<rect x="${(x(i) - volW / 2).toFixed(1)}" y="${(126 - h).toFixed(1)}" width="${volW.toFixed(1)}" height="${h.toFixed(1)}" fill="#adb5bd" opacity="0.5"></rect>`;
  }
  return `<svg viewBox="0 0 470 130" class="kline" preserveAspectRatio="none">` +
    `<polygon points="0,${yBot} ${pts.join(' ')} ${W},${yBot}" fill="rgba(224,49,49,0.10)"></polygon>` +
    `<polyline points="${pts.join(' ')}" fill="none" stroke="#e03131" stroke-width="1.8"></polyline>` +
    `<polyline points="${ma5Pts.join(' ')}" fill="none" stroke="#f59f00" stroke-width="1.4"></polyline>` +
    `<polyline points="${ma20Pts.join(' ')}" fill="none" stroke="#4c6ef5" stroke-width="1.4"></polyline>` +
    volBars +
    `<text x="2" y="10" class="mini">${fmtN(max)}</text><text x="2" y="${yBot + 14}" class="mini">${fmtN(min)}</text>` +
    `</svg>`;
}
function flowSvg(flow: FlowDay[]): string {
  if (!flow.length) return '<div class="nodata">资金流历史数据缺失</div>';
  const W = 470, zeroY = 46, step = W / flow.length, bw = 11;
  const maxAbs = Math.max(...flow.map((d) => Math.abs(d.main)), 1);
  let bars = '';
  for (let i = 0; i < flow.length; i++) {
    const v = flow[i].main / 1e8;
    const h = (Math.abs(v) / (maxAbs / 1e8)) * 38; const x0 = i * step + (step - bw) / 2; const isUp = v >= 0;
    bars += `<rect x="${x0.toFixed(1)}" y="${isUp ? (zeroY - h).toFixed(1) : zeroY.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h, 0.5).toFixed(1)}" fill="${isUp ? '#e03131' : '#0f9960'}" opacity="0.8"></rect>`;
  }
  return `<svg viewBox="0 0 470 92" class="flowchart" preserveAspectRatio="none">` +
    `<line x1="0" y1="${zeroY}" x2="470" y2="${zeroY}" stroke="#ced4da" stroke-width="1" stroke-dasharray="3 3"></line>` +
    bars +
    `<text x="2" y="14" class="mini">+${fmtN((maxAbs / 1e8))}亿</text><text x="2" y="84" class="mini">-${fmtN((maxAbs / 1e8))}亿</text>` +
    `</svg>`;
}
function dimBars(dims: ScoredStock['dims']): string {
  const names = ['资金面', '行业异动', '走势分析', '财务分析', '基本面', '股东分析'];
  const keys = ['money', 'industry', 'trend', 'finance', 'basic', 'holder'] as const;
  let h = '';
  for (let i = 0; i < 6; i++) {
    const v = Math.round(dims[keys[i]]); const c = scoreColor(v);
    h += `<div class="dimrow"><span class="dimname">${names[i]}</span><span class="dimbar"><i style="width:${v}%;background:${c}"></i></span><span class="dimscore" style="color:${c}">${v}</span></div>`;
  }
  return h;
}
function planHtml(it: RankItem, deep: DeepData): string {
  const price = it.f2 || 0; const ma5 = deep.ma5, ma20 = deep.ma20; if (!price) return '';
  const buyLo = !isNaN(ma5) ? Math.min(ma5, price) : price * 0.98;
  const buyHi = !isNaN(ma5) ? Math.max(ma5, price) : price;
  const support = !isNaN(ma20) ? ma20 : price * 0.97;
  const stop = support * 0.97; const t1 = price * 1.08; const t2 = price * 1.18;
  const rr = (price - stop) > 0 ? (t1 - price) / (price - stop) : 0;
  return `<div class="plan">
    <div class="pitem"><span>参考买入区</span><b>${fmtN(buyLo)} ~ ${fmtN(buyHi)}</b></div>
    <div class="pitem"><span>关键支撑</span><b>${fmtN(support)}</b></div>
    <div class="pitem"><span>止损位</span><b class="down">${fmtN(stop)}</b></div>
    <div class="pitem"><span>目标位①</span><b class="up">${fmtN(t1)}</b></div>
    <div class="pitem"><span>目标位②</span><b class="up">${fmtN(t2)}</b></div>
    <div class="pitem"><span>盈亏比</span><b>${rr.toFixed(2)} : 1</b></div>
  </div>`;
}
function moneyReason(it: RankItem, deep: DeepData): string[] {
  const out: string[] = [];
  out.push(`当日主力净流入 ${fmtYi(it.f62 || 0)} 亿元`);
  const ratio = it.f6 ? (((it.f62 || 0) / it.f6) * 100) : 0;
  out.push(`主力净占成交额 ${ratio.toFixed(2)}%`);
  const superRatio = it.f62 > 0 ? (((it.f66 || 0) / it.f62) * 100) : 0;
  out.push(`超大单净流入 ${fmtYi(it.f66 || 0)} 亿（占主力 ${superRatio.toFixed(0)}%）`);
  if (deep.flow.length) {
    const last5 = deep.flow.slice(-5), last20 = deep.flow.slice(-20);
    const s5 = sum(last5.map((d) => d.main)), s20 = sum(last20.map((d) => d.main));
    const n5 = last5.filter((d) => d.main > 0).length;
    out.push(`近5日主力累计 ${(s5 / 1e8).toFixed(2)} 亿（${n5}/${last5.length} 日净流入）、近20日累计 ${(s20 / 1e8).toFixed(2)} 亿`);
  } else out.push('资金流历史数据缺失');
  return out;
}
function industryReason(it: RankItem, sector: SectorItem | undefined): string[] {
  if (!sector) return ['行业板块数据缺失，按中性处理'];
  const tot = (sector.f104 || 0) + (sector.f105 || 0);
  const upRatio = tot > 0 ? (((sector.f104 || 0) / tot) * 100).toFixed(0) : '-';
  return [
    `所属行业「${it.f100 || '-'}」当日涨 ${pctStr(sector.f3)}`,
    `行业主力净流入 ${(sector.f62 / 1e8).toFixed(2)} 亿元`,
    `板块赚钱效应：${sector.f104 || 0} 涨 / ${sector.f105 || 0} 跌（上涨占比 ${upRatio}%）`,
  ];
}
function trendReason(it: RankItem, deep: DeepData): string[] {
  const price = it.f2 || 0; if (!deep.closes.length) return ['K线数据不足，走势按中性处理'];
  const ma5 = deep.ma5, ma10 = deep.ma10, ma20 = deep.ma20;
  const f = (v: number) => (isNaN(v) ? '-' : v.toFixed(2));
  let alignDesc = '均线纠缠';
  if (price > ma5 && ma5 > ma10 && ma10 > ma20) alignDesc = '完美多头排列';
  else if (price > ma5 && ma5 > ma20) alignDesc = '均线偏强';
  else if (price > ma20) alignDesc = '站上MA20';
  else if (price > ma5) alignDesc = '均线纠缠偏强';
  const win20 = deep.closes.slice(-20);
  const min20 = Math.min(...win20), max20 = Math.max(...win20);
  const pos = max20 > min20 ? (((price - min20) / (max20 - min20)) * 100).toFixed(0) : '-';
  const v5 = avg(deep.vols.slice(-5)), v20 = avg(deep.vols.slice(-20));
  const vr = v20 > 0 ? (v5 / v20) : 1;
  const chg20 = win20[0] ? (((price - win20[0]) / win20[0]) * 100).toFixed(1) : '-';
  const rsi = isNaN(deep.rsi14) ? '-' : deep.rsi14.toFixed(1);
  let macdDesc = 'MACD 零轴下方且绿柱延续';
  if (deep.macdDif > deep.macdDea && deep.macdHist >= 0) macdDesc = 'MACD 零轴上方且红柱放大，趋势加速';
  else if (deep.macdDif > deep.macdDea) macdDesc = 'MACD 零轴下方金叉，底部转强';
  else if (deep.macdDif > 0) macdDesc = 'MACD 零轴上方运行';
  return [
    `${alignDesc}（价${f(price)} / MA5 ${f(ma5)} / MA10 ${f(ma10)} / MA20 ${f(ma20)}）`,
    `处于近20日区间 ${pos}% 位置（${fmtN(min20)}~${fmtN(max20)}）`,
    `5日均量/20日均量 = ${vr.toFixed(2)}（${vr >= 1.2 ? '量能放大' : vr <= 0.8 ? '量能萎缩' : '量能偏温和'}）`,
    `近20日累计涨幅 ${chg20}%`,
    `RSI(14) = ${rsi}${rsi !== '-' ? (deep.rsi14 >= 50 ? '，处于强势健康区间' : '，动能偏弱') : ''}`,
    macdDesc,
  ];
}
function basicReason(it: RankItem): string[] {
  const pe = it.f9; const pb = it.f23;
  const peStr = pe == null || isNaN(pe) ? (pe != null && pe < 0 ? '亏损' : '-') : pe.toFixed(1);
  const peDesc = peStr === '亏损' ? '当前处于亏损状态，估值无参考意义' : pe > 0 && pe < 25 ? '估值合理' : pe > 0 && pe < 60 ? '估值偏高' : pe > 0 ? '估值较高，靠预期支撑' : '估值无参考意义';
  return [
    `PE(TTM) = ${peStr} 倍（${peDesc}）`,
    `PB = ${isNaN(pb) ? '-' : pb.toFixed(2)} 倍`,
    `总市值 ${fmtYi(it.f20 || 0)} 亿元`,
    `当日换手率 ${fmtN(it.f8, 2)}%`,
  ];
}
function financeReason(fin: Record<string, string>): string[] {
  const roe = numOf(fin['净资产收益率']); const margin = numOf(fin['净利率']);
  const debt = numOf(fin['资产负债率']); const rev = fin['营收同比增长'] || '-'; const profit = fin['净利润同比增长'] || '-';
  const roeStr = isNaN(roe) ? '-' : roe.toFixed(1); const period = fin['报告期'] || '';
  return [
    `年化 ROE ≈ ${roeStr}%（${esc(period)}累计折算）`,
    `销售净利率 ≈ ${isNaN(margin) ? '-' : margin.toFixed(1)}%`,
    `资产负债率 ≈ ${isNaN(debt) ? '-' : debt.toFixed(1)}%`,
    `${esc(period || '最新报告期')} 营收同比 ${rev}`,
    `${esc(period || '最新报告期')} 归母净利同比 ${profit}`,
  ];
}
function holderReason(holders: HolderItem[]): string[] {
  const h0 = holders[0]; if (!h0 || isNaN(h0.holderNumRatio)) return ['股东户数数据缺失，按中性处理'];
  const ratio = Number(h0.holderNumRatio);
  const trend = ratio < 0 ? '筹码明显集中，主力吸筹迹象' : '筹码趋于分散，需警惕散户接盘';
  return [
    `最新股东户数 ${Number(h0.holderNum).toLocaleString()} 户（${String(h0.endDate).slice(0, 10)}），环比 ${pctStr(ratio)}`,
    trend,
  ];
}
function riskList(it: RankItem, deep: DeepData, holders: HolderItem[]): string[] {
  const out: string[] = []; const price = it.f2 || 0;
  if (deep.closes.length) { const win20 = deep.closes.slice(-20); const max20 = Math.max(...win20); if (price >= max20 * 0.99) out.push('股价贴近20日高点，压力位附近换手需求大'); }
  if ((it.f8 || 0) >= 15) out.push(`换手率 ${it.f8.toFixed(1)}% 过热，短期博弈激烈`);
  if ((it.f3 || 0) >= 9.8) out.push('当日涨停，次日高开幅度决定实际成本');
  const h0 = holders[0]; if (h0 && !isNaN(h0.holderNumRatio) && Number(h0.holderNumRatio) > 0) out.push('股东户数明显增加，筹码趋于分散');
  if ((it.f9 != null) && !isNaN(it.f9) && it.f9 < 0) out.push('公司仍处亏损，缺乏业绩支撑，纯资金与题材驱动');
  if (!out.length) out.push('市场系统性风险与突发消息不可预测，注意仓位管理');
  return out.slice(0, 3);
}
function themeLine(it: RankItem, sector: SectorItem | undefined): string {
  if (sector && sector.f204) return `板块效应归因：<b>${esc(it.f100 || '')}资金流入居前 · 领涨 ${esc(sector.f204)}</b>`;
  return `板块效应归因：<b>所属行业「${esc(it.f100 || '-')}」当日主力资金流向</b>`;
}
function cardHtml(st: ScoredStock, idx: number, sectorMap: Record<string, SectorItem>): string {
  const it = st, deep = st.deep, d = st.dims; const sector = sectorMap[st.f100];
  const total = Math.round(st.total * 10) / 10; const tc = scoreColor(total);
  const metrics = [
    ['现价', fmtN(it.f2, 2), ''], ['当日涨跌', pctStr(it.f3), upDownCls(it.f3)],
    ['主力净流入', fmtYi(it.f62 || 0) + '亿', upDownCls(it.f62 || 0)],
    ['净占比', it.f6 ? (((it.f62 || 0) / it.f6) * 100).toFixed(1) + '%' : '-', upDownCls(it.f62 || 0)],
    ['换手率', fmtN(it.f8, 2) + '%', ''], ['PE(TTM)', it.f9 != null && !isNaN(it.f9) ? (it.f9 < 0 ? '亏损' : it.f9.toFixed(1)) : '-', ''],
    ['PB', it.f23 != null && !isNaN(it.f23) ? it.f23.toFixed(2) : '-', ''],
    ['总市值', fmtYi(it.f20 || 0) + '亿', ''],
  ].map((m) => `<div class="metric"><span>${m[0]}</span><b class="${m[2]}">${m[1]}</b></div>`).join('');
  const scoreRows: Array<[string, number, number]> = [
    ['资金面', d.money, 0], ['行业异动', d.industry, 0], ['走势分析', d.trend, 0],
    ['财务分析', d.finance, 0], ['基本面', d.basic, 0], ['股东分析', d.holder, 0],
  ];
  const hl = scoreRows.slice().sort((a, b) => b[1] - a[1]).slice(0, 3);
  const hlText = hl.map(([n, sc]) => {
    if (n === '资金面') return `资金面（${Math.round(sc)}分）：当日主力净流入 ${fmtYi(it.f62 || 0)} 亿元`;
    if (n === '行业异动') return `行业异动（${Math.round(sc)}分）：所属行业「${it.f100 || '-'}」当日涨 ${sector ? pctStr(sector.f3) : '-'}`;
    if (n === '股东分析') {
      const h0 = deep.holders[0];
      return `股东分析（${Math.round(sc)}分）：最新股东户数 ${h0 ? Number(h0.holderNum).toLocaleString() + ' 户' : '-'}（${h0 ? String(h0.endDate).slice(0, 10) : '-'}）`;
    }
    if (n === '财务分析') { const roe = numOf(deep.fin['净资产收益率']); return `财务分析（${Math.round(sc)}分）：年化 ROE ≈ ${isNaN(roe) ? '-' : roe.toFixed(1)}%`; }
    if (n === '走势分析') return `走势分析（${Math.round(sc)}分）：${deep.closes.length ? '均线' + (deep.ma5 > deep.ma20 ? '多头' : '纠缠') : '数据不足'}`;
    return `基本面（${Math.round(sc)}分）：PE ${it.f9 != null && !isNaN(it.f9) ? it.f9.toFixed(1) : '-'} 倍`;
  }).map((t) => `<li>${t}</li>`).join('');
  const reasons = [
    { n: '资金面', sc: d.money, ls: moneyReason(it, deep) },
    { n: '行业异动', sc: d.industry, ls: industryReason(it, sector) },
    { n: '走势分析', sc: d.trend, ls: trendReason(it, deep) },
    { n: '基本面', sc: d.basic, ls: basicReason(it) },
    { n: '财务分析', sc: d.finance, ls: financeReason(deep.fin) },
    { n: '股东分析', sc: d.holder, ls: holderReason(deep.holders) },
  ].map((r) => `<div class="rblock"><div class="rhead">${r.n}<span class="rscore" style="background:${scoreColor(Math.round(r.sc))}">${Math.round(r.sc)}</span></div><ul>${r.ls.map((li) => `<li>${li}</li>`).join('')}</ul></div>`).join('');
  const risks = riskList(it, deep, deep.holders).map((r) => `<li>${r}</li>`).join('');

  return `<article class="card">
  <header class="chead">
    <div class="crank">${idx + 1}</div>
    <div class="cname">
      <h3>${emLink(it.f12, esc(it.f14))} <span class="ccode">${esc(it.f12)}</span></h3>
      <div class="cmeta"><span class="badge">${esc(it.f100 || '-')}</span></div>
    </div>
    <div class="ctotal"><div class="tval" style="color:${tc}">${total.toFixed(1)}</div><div class="tlbl">综合得分</div></div>
  </header>
  <div class="theme">${themeLine(it, sector)}</div>
  <div class="metrics">${metrics}</div>
  <div class="cbody">
    <div class="ccol-left">
      <svg viewBox="0 0 230 230" class="radar" role="img">${radarSvg([d.money, d.industry, d.trend, d.finance, d.basic, d.holder])}</svg>
      <div class="dims">${dimBars(d)}</div>
    </div>
    <div class="ccol-right">
      <div class="chartbox"><div class="clabel">近${Math.min(60, deep.closes.length)}日走势 · 收盘价 / <em style="color:#f59f00">MA5</em> / <em style="color:#4c6ef5">MA20</em> / 成交量</div>${klineSvg(deep.closes, deep.vols)}</div>
      <div class="chartbox"><div class="clabel">近${deep.flow.length}日主力资金净流入（亿元）</div>${flowSvg(deep.flow)}</div>
      ${planHtml(it, deep)}
    </div>
  </div>
  <div class="hl"><h4>核心上涨逻辑</h4><ul>${hlText}</ul></div>
  <div class="reasons">${reasons}</div>
  <div class="risk"><h4>风险提示</h4><ul>${risks}</ul></div>
</article>`;
}
function poolRowHtml(st: ScoredStock, hit: boolean, idx: number): string {
  const d = st.dims; const cls = (v: number) => ` style="color:${scoreColor(Math.round(v))}"`;
  const total = Math.round(st.total * 10) / 10;
  return `<tr${hit ? ' class="hit"' : ''}><td class="rk">${idx + 1}</td><td class="mono">${emLink(st.f12, esc(st.f12))}</td><td class="nm">${emLink(st.f12, esc(st.f14))}</td><td>${esc(st.f100 || '-')}</td><td class="${upDownCls(st.f3)}">${pctStr(st.f3)}</td><td class="num"${cls(d.money)}>${Math.round(d.money)}</td><td class="num"${cls(d.industry)}>${Math.round(d.industry)}</td><td class="num"${cls(d.trend)}>${Math.round(d.trend)}</td><td class="num"${cls(d.finance)}>${Math.round(d.finance)}</td><td class="num"${cls(d.basic)}>${Math.round(d.basic)}</td><td class="num"${cls(d.holder)}>${Math.round(d.holder)}</td><td class="num tot"${cls(total)}>${total.toFixed(1)}</td></tr>`;
}
function top20RowHtml(it: RankItem, idx: number): string {
  const ratio = it.f6 ? (((it.f62 || 0) / it.f6) * 100) : 0;
  return `<tr><td class="rk">${idx + 1}</td><td class="mono">${emLink(it.f12, esc(it.f12))}</td><td class="nm">${emLink(it.f12, esc(it.f14))}</td><td class="${upDownCls(it.f3)}">${pctStr(it.f3)}</td><td class="num up">${fmtYi(it.f62 || 0)}</td><td class="num">${ratio.toFixed(1)}%</td><td class="num ${upDownCls(it.f66 || 0)}">${it.f66 != null && !isNaN(it.f66) ? fmtYi(it.f66) : '-'}</td><td>${esc(it.f100 || '-')}</td><td class="num">${fmtN(it.f8, 1)}%</td><td class="num">${fmtYi(it.f20 || 0)}</td></tr>`;
}
function ibarHtml(sector: SectorItem, maxFlowYi: number): string {
  const flowYi = sector.f62 / 1e8;
  const w = maxFlowYi > 0 ? Math.max(4, (flowYi / maxFlowYi) * 100) : 4;
  const tot = (sector.f104 || 0) + (sector.f105 || 0);
  const upRatio = tot > 0 ? (((sector.f104 || 0) / tot) * 100).toFixed(0) : '-';
  const isUp = sector.f3 >= 0;
  return `<div class="ibar"><span class="iname">${esc(sector.f14)}</span><span class="itrack"><i style="width:${w.toFixed(1)}%;background:${isUp ? '#e03131' : '#0f9960'}"></i></span><span class="ival ${isUp ? 'up' : 'down'}">${flowYi >= 0 ? '+' : ''}${flowYi.toFixed(2)}亿</span><span class="ichg ${isUp ? 'up' : 'down'}">${pctStr(sector.f3)}</span><span class="ibreadth">${sector.f104 || 0}涨/${sector.f105 || 0}跌 <b>${upRatio}%</b></span></div>`;
}
function chipHtml(c: any): string {
  const name = c.ts_name || c.name || c.f14 || '-';
  const chg = c.avg_changeratio ?? c.f3;
  const net = c.netamount ?? c.f62;
  const n = Number(net || 0) / 1e8;
  const cls = Number(chg || 0) >= 0 ? 'up' : 'down';
  return `<span class="chip"><b>${esc(name)}</b><em class="${cls}">${pctStr(Number(chg || 0))}</em><i>${n >= 0 ? '+' : ''}${n.toFixed(1)}亿</i></span>`;
}
function buildReportHtml(opts: {
  indices: any[]; top20: RankItem[]; sectors: SectorItem[]; concepts: any[];
  pool: ScoredStock[]; hits: ScoredStock[]; filteredCount: number; excludedCount: number;
  generatedAt: string; elapsedSec: number;
}): string {
  const { indices, top20, sectors, concepts, pool, hits } = opts;
  const idxHtml = indices.map((i) =>
    `<span class="idx">${emLink(i.f12, `<b>${esc(i.f14)}</b>`, true)} ${fmtN(i.f2, 2)} <em class="${upDownCls(i.f3)}">${pctStr(i.f3)}</em></span>`
  ).join('');
  const maxFlow = Math.max(...sectors.map((s) => Math.abs(s.f62 || 0) / 1e8), 1);
  const ibars = sectors.slice(0, 8).map((s) => ibarHtml(s, maxFlow)).join('');
  const chips = concepts.slice(0, 16).map(chipHtml).join('');
  const top20Rows = top20.map((it, i) => top20RowHtml(it, i)).join('');
  const sectorMap: Record<string, SectorItem> = {};
  for (const s of sectors) sectorMap[s.f14] = s;
  const cards2 = hits.map((st, i) => cardHtml(st, i, sectorMap)).join('');
  const poolRows = pool.map((st, i) => poolRowHtml(st, hits.includes(st), i)).join('');

  return `<style>
*{box-sizing:border-box}
body{margin:0;background:#f4f5f7 !important;color:#212529 !important;font:14px/1.6 -apple-system,"PingFang SC","Microsoft YaHei",Segoe UI,sans-serif}
.wrap{max-width:100%;margin:0 auto;padding:18px 14px 60px;overflow-x:auto;background:#f4f5f7}
.up{color:#e03131} .down{color:#0f9960} .flat{color:#868e96}
.mono{font-family:ui-monospace,Consolas,monospace}
h1{margin:0 0 6px;font-size:22px;letter-spacing:.5px}
h2{font-size:16px;margin:0 0 12px;padding-left:10px;border-left:4px solid #e03131}
h4{margin:0 0 8px;font-size:14px;color:#495057}
.hero{background:linear-gradient(135deg,#fff 0%,#fff5f5 100%);border:1px solid #ffe3e3;border-radius:12px;padding:16px 18px;margin-bottom:14px}
.sub{color:#868e96;font-size:12.5px}
.idxbar{margin-top:12px;display:flex;flex-wrap:wrap;gap:14px}
.idx{font-size:12.5px} .idx b{color:#495057;font-weight:600} .idx em{font-style:normal;font-weight:700}
a{color:inherit;text-decoration:none} a:hover{text-decoration:underline;color:#e03131} a[data-em]{cursor:pointer}
section{background:#fff;border:1px solid #e9ecef;border-radius:12px;padding:16px 14px;margin-bottom:14px;overflow-x:auto}
.funnel{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.fstep{flex:1;min-width:120px;background:#f8f9fa;border:1px solid #e9ecef;border-radius:10px;padding:12px 8px;text-align:center}
.fnum{font-size:22px;font-weight:700;color:#e03131;line-height:1.1}
.ftitle{font-size:12px;font-weight:600;margin-top:4px}
.fdesc{font-size:11px;color:#adb5bd;margin-top:2px}
.farrow{color:#ced4da;font-size:20px;font-weight:700}
.tbl-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 -4px;padding:0 4px}
.tbl-wrap::-webkit-scrollbar{height:4px}
.tbl-wrap::-webkit-scrollbar-thumb{background:rgba(230,57,70,.3);border-radius:4px}
.tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:520px}
.tbl th{background:#f8f9fa;color:#495057;font-weight:600;font-size:11.5px;padding:8px 6px;text-align:left;border-bottom:2px solid #e9ecef;white-space:nowrap}
.tbl th i{font-style:normal;color:#ced4da;font-size:10px}
.tbl td{padding:7px 6px;border-bottom:1px solid #f1f3f5;white-space:nowrap}
.tbl tbody tr:hover{background:#fff9f9}
.tbl .rk{color:#adb5bd;font-weight:700;width:30px}
.tbl .nm{font-weight:600}
.tbl .num{text-align:right;font-family:ui-monospace,Consolas,monospace}
.pool{min-width:680px}
.pool .tot{font-weight:700;font-size:13px}
.pool tr.hit{background:#fff5f5} .pool tr.hit .nm::after{content:"★";color:#e03131;margin-left:4px}
.ibars{display:flex;flex-direction:column;gap:7px}
.ibar{display:grid;grid-template-columns:80px 1fr 64px 54px 110px;align-items:center;gap:8px;font-size:12px}
.iname{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.itrack{background:#f1f3f5;height:16px;border-radius:8px;overflow:hidden}
.itrack i{display:block;height:100%;border-radius:8px}
.ival{text-align:right;font-family:ui-monospace,monospace;font-weight:600}
.ichg{text-align:right;font-family:ui-monospace,monospace}
.ibreadth{color:#868e96;font-size:11px;text-align:right}
.ibreadth b{color:#e03131}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.chip{background:#f8f9fa;border:1px solid #e9ecef;border-radius:16px;padding:4px 10px;font-size:11.5px}
.chip b{font-weight:600} .chip em{font-style:normal;margin-left:6px;font-weight:600}
.chip i{font-style:normal;margin-left:6px;color:#868e96}
.card{background:#fff;border:1px solid #e9ecef;border-left:4px solid #e03131;border-radius:12px;padding:16px 14px;margin-bottom:14px}
.chead{display:flex;align-items:center;gap:12px;padding-bottom:12px;border-bottom:1px solid #f1f3f5}
.crank{width:38px;height:38px;border-radius:50%;background:#e03131;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;flex:0 0 auto}
.cname{flex:1;min-width:0} .cname h3{margin:0;font-size:17px}
.ccode{font-family:ui-monospace,monospace;color:#adb5bd;font-size:13px;font-weight:400;margin-left:6px}
.cmeta{margin-top:6px;display:flex;flex-wrap:wrap;gap:5px}
.badge{background:#e03131;color:#fff;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:600}
.tag{background:#f1f3f5;color:#868e96;border-radius:4px;padding:2px 6px;font-size:11px}
.ctotal{text-align:center} .tval{font-size:28px;font-weight:700;line-height:1}
.tlbl{font-size:11px;color:#adb5bd;margin-top:2px}
.theme{margin-top:12px;background:#fff9db;border:1px solid #ffec99;border-radius:8px;padding:8px 12px;font-size:12px;color:#856404}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#f1f3f5;border:1px solid #f1f3f5;border-radius:8px;overflow:hidden;margin:12px 0}
.metric{background:#fff;padding:8px 4px;text-align:center}
.metric span{display:block;font-size:11px;color:#adb5bd}
.metric b{display:block;font-size:13px;margin-top:2px;font-family:ui-monospace,monospace}
.cbody{display:grid;grid-template-columns:1fr;gap:14px;margin-top:4px}
.radar{width:200px;height:200px;display:block;margin:0 auto}
.radar-lbl{font-size:10.5px;fill:#495057;font-weight:600}
.radar-val{font-size:10px;fill:#e03131;font-weight:700}
.dims{margin-top:6px;display:flex;flex-direction:column;gap:5px}
.dimrow{display:grid;grid-template-columns:56px 1fr 26px;align-items:center;gap:7px;font-size:11.5px}
.dimname{color:#868e96}
.dimbar{background:#f1f3f5;height:8px;border-radius:4px;overflow:hidden}
.dimbar i{display:block;height:100%;border-radius:4px}
.dimscore{text-align:right;font-weight:700;font-family:ui-monospace,monospace}
.chartbox{margin-bottom:12px}
.clabel{font-size:11px;color:#adb5bd;margin-bottom:3px}
.clabel em{font-style:normal;font-weight:600}
.kline,.flowchart{width:100%;display:block;background:#fcfcfd;border:1px solid #f1f3f5;border-radius:8px}
.kline{height:130px} .flowchart{height:92px}
.mini{font-size:9px;fill:#adb5bd}
.nodata{color:#adb5bd;font-size:13px;padding:24px 16px;text-align:center;background:#f8f9fa;border-radius:8px;margin:8px 0}
.plan{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#f1f3f5;border:1px solid #f1f3f5;border-radius:8px;overflow:hidden}
.pitem{background:#fff;padding:8px 8px}
.pitem span{display:block;font-size:11px;color:#adb5bd}
.pitem b{font-size:14px;font-family:ui-monospace,monospace}
.hl{margin-top:14px;background:#fff5f5;border:1px solid #ffe3e3;border-radius:10px;padding:12px 14px}
.hl ul,.risk ul{margin:0;padding-left:18px} .hl li{margin:3px 0;font-size:12.5px}
.reasons{display:grid;grid-template-columns:1fr;gap:10px;margin-top:12px}
.rblock{background:#f8f9fa;border:1px solid #f1f3f5;border-radius:10px;padding:10px 12px}
.rhead{font-weight:600;font-size:12.5px;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.rscore{color:#fff;border-radius:10px;padding:1px 9px;font-size:11px;font-family:ui-monospace,monospace}
.rblock ul{margin:0;padding-left:16px}
.rblock li{font-size:11.5px;color:#495057;margin:3px 0}
.risk{margin-top:12px;background:#fff9db;border:1px solid #ffec99;border-radius:10px;padding:12px 14px}
.risk h4{color:#856404} .risk li{font-size:12px;color:#856404;margin:3px 0}
.divnote{background:#e7f5ff;border:1px solid #a5d8ff;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:12px;color:#1864ab}
.disc{background:#f8f9fa;border:1px dashed #ced4da;border-radius:10px;padding:12px 14px;color:#868e96;font-size:12px;line-height:1.8}
</style>
<div class="wrap">
<div class="hero">
  <h1>A股智能选股报告</h1>
  <div class="sub">生成时间 ${opts.generatedAt} · 全市场扫描 → 资金流初筛 → 行业异动 →
    基本面/股东/财务/走势四维分析 · 耗时 ${opts.elapsedSec.toFixed(1)} 秒</div>
  <div class="idxbar">${idxHtml || '<span class="sub">指数数据加载中…</span>'}</div>
</div>

<section><h2>选股漏斗</h2><div class="funnel"><div class="fstep"><div class="fnum">100</div><div class="ftitle">资金流榜单</div><div class="fdesc">全市场按主力净流入排序</div></div><div class="farrow">›</div><div class="fstep"><div class="fnum">${opts.filteredCount}</div><div class="ftitle">资金初筛</div><div class="fdesc">剔除 ${opts.excludedCount} 只 ST/一字板/微盘</div></div><div class="farrow">›</div><div class="fstep"><div class="fnum">${pool.length}</div><div class="ftitle">行业异动收敛</div><div class="fdesc">资金 60% + 行业 40%</div></div><div class="farrow">›</div><div class="fstep"><div class="fnum">${hits.length}</div><div class="ftitle">六维加权优选</div><div class="fdesc">四维深度分析后定稿</div></div></div></section>

<section><h2>阶段一 · 全市场主力资金净流入 TOP 20</h2>
  <p class="sub" style="margin-top:-6px;margin-bottom:12px">资金是行情的先行指标。以东财实时资金流为口径，按当日主力（大单+超大单）净流入金额排序，并剔除 ST 股、一字板封死股、市值低于 25 亿的微盘股。</p>
  ${top20Rows ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>代码</th><th>名称</th><th>涨跌幅</th><th>主力净流入(亿)</th><th>净占比</th><th>超大单(亿)</th><th>所属行业</th><th>换手率</th><th>市值(亿)</th></tr></thead><tbody>${top20Rows}</tbody></table></div>` : '<div class="nodata">资金流数据暂不可用，可能非交易时段或接口异常</div>'}
</section>

<section><h2>阶段二 · 行业板块异动</h2>
  <p class="sub" style="margin-top:-6px;margin-bottom:14px">个股的资金流入若无板块效应支撑，往往是孤立行为、持续性弱。这一步核对候选股所属行业的资金流向、涨跌幅与赚钱效应（上涨家数占比）。</p>
  ${ibars ? `<div class="ibars">${ibars}</div>` : '<div class="nodata">行业板块数据暂不可用</div>'}
  <h4 style="margin-top:20px">概念题材资金流向 TOP 16</h4>
  ${chips ? `<div class="chips">${chips}</div>` : '<div class="nodata">概念题材数据暂不可用</div>'}
</section>

<section><h2>阶段三 / 四 · 最可能继续上涨的 ${hits.length} 只个股</h2>
  <p class="sub" style="margin-top:-6px;margin-bottom:16px">对入围个股逐一执行基本面（估值与市值结构）、股东分析（筹码集中度）、财务分析（盈利能力与成长性）、走势分析（均线/量价/超买）四维检验，与资金面、行业异动一起加权得出综合得分。</p>
  ${cards2 || '<div class="nodata">候选个股深度分析数据暂不可用</div>'}
</section>

<section><h2>候选池完整评分（${pool.length} 只）</h2>
  <p class="sub" style="margin-top:-6px;margin-bottom:12px">带 ★ 者为最终入选标的。各维度分数经权重加权后得到综合分，可据此复核模型的每一步判断。</p>
  ${poolRows ? `<div class="tbl-wrap"><table class="tbl pool"><thead><tr><th>#</th><th>代码</th><th>名称</th><th>行业</th><th>涨跌幅</th><th>资金面<br><i>25%</i></th><th>行业异动<br><i>15%</i></th><th>走势分析<br><i>25%</i></th><th>财务分析<br><i>13%</i></th><th>基本面<br><i>12%</i></th><th>股东分析<br><i>10%</i></th><th>综合</th></tr></thead><tbody>${poolRows}</tbody></table></div>` : '<div class="nodata">候选池数据暂不可用</div>'}
</section>

<section><h2>方法论说明</h2><div class="method">
<p>本报告采用<b>六维加权评分模型</b>，每一维度均由分段阈值函数映射到 0~100 分，避免单一极端值主导排序；数据缺失的维度按中性 50 分处理，不奖励也不惩罚。</p>
<div class="tbl-wrap"><table class="tbl"><thead><tr><th>维度</th><th>权重</th><th>核心指标</th><th>逻辑</th></tr></thead><tbody>
<tr><td>资金面</td><td>25%</td><td>主力净流入额、净占成交比、超大单结构、近5/20日持续性</td><td>资金是短期行情的直接驱动力，且要求「持续」而非单日脉冲</td></tr>
<tr><td>走势分析</td><td>25%</td><td>均线多头排列、20日区间位置、量能比、RSI、MACD</td><td>趋势向上且未过度透支的标的，惯性延续概率更高</td></tr>
<tr><td>行业异动</td><td>15%</td><td>板块涨幅、板块主力净流入、上涨家数占比</td><td>板块效应决定了个股上涨的持续性与容错空间</td></tr>
<tr><td>财务分析</td><td>13%</td><td>ROE、销售净利率、营收与净利同比、资产负债率</td><td>业绩是股价上涨的地基，规避纯炒作标的</td></tr>
<tr><td>基本面</td><td>12%</td><td>PE(TTM)、PB、总市值、换手率</td><td>估值决定安全边际与后续空间</td></tr>
<tr><td>股东分析</td><td>10%</td><td>股东户数环比、连续下降期数、户均持股</td><td>户数下降=筹码集中=主力吸筹，是中线上涨的前置条件</td></tr></tbody></table></div>
<p><b>数据来源：</b>东方财富（资金流 / 行业板块 / 股东户数）、腾讯财经（实时行情 / 前复权日K）、新浪财经（利润表）、通达信（财务快照）。全部为公开接口直连。</p>
</div></section>

<div class="disc">
<b>免责声明</b><br>
本报告由量化模型基于公开市场数据自动生成，所有评分、买卖区间与目标位均为模型计算结果，不构成任何投资建议或买卖要约。模型无法预测突发消息、政策变化与系统性风险，历史资金流与技术形态亦不代表未来表现。股市有风险，入市需谨慎，据此操作，风险自担。<br>
报告生成于 ${opts.generatedAt}，数据具有时效性，盘中数据会随行情实时变动。
</div>
</div>`;
}
function isExcluded(it: RankItem): boolean {
  const name = String(it.f14 || '');
  if (/ST|退/.test(name)) return true;
  if ((it.f3 || 0) >= 9.8 && (it.f8 || 0) < 0.5) return true;
  if ((it.f20 || 0) < 25e8) return true;
  return false;
}
async function generateStockReport(fetchFn: FetchFn): Promise<string> {
  const t0 = Date.now(); const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const generatedAt = `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const [ov, rank, sec, con] = await Promise.all([
    fetchFn('/api/market-overview'),
    fetchFn('/api/stock-flow-rank?pz=100'),
    fetchFn('/api/sector-flow-rank?t=2&pz=30'),
    fetchFn('/api/sina-bkzj?fenlei=1'),
  ]);
  const indices: any[] = [];
  const idxNames = ['上证指数', '深证成指', '创业板指', '沪深300'];
  for (const name of idxNames) { const m = (ov?.data?.diff || []).find((d: any) => d.f14 === name); if (m) indices.push(m); }
  const rankAll: RankItem[] = (rank?.data?.diff || []).map((d: any) => ({
    f12: d.f12, f14: d.f14, f2: d.f2 || 0, f3: d.f3 || 0, f6: d.f6 || 0,
    f9: d.f9 != null ? Number(d.f9) : NaN, f20: d.f20 || 0, f23: d.f23 != null ? Number(d.f23) : NaN,
    f8: d.f8 || 0, f62: d.f62 || 0, f66: d.f66 || 0, f72: d.f72 || 0, f100: d.f100 || '', f124: d.f124 || '',
  })).filter((d: RankItem) => d.f12 && d.f14);
  const filtered = rankAll.filter((it) => !isExcluded(it));
  const top20 = filtered.slice(0, 20);
  const sectors: SectorItem[] = (sec?.data?.diff || []).map((d: any) => ({
    f12: d.f12, f14: d.f14, f3: d.f3 || 0, f62: d.f62 || 0, f104: d.f104 || 0, f105: d.f105 || 0, f204: d.f204 || '', f205: d.f205 || '',
  }));
  const concepts: any[] = con?.data?.list || [];
  const sectorMap: Record<string, SectorItem> = {}; for (const s of sectors) sectorMap[s.f14] = s;
  const rankByFlow = filtered.slice().sort((a, b) => (b.f62 || 0) - (a.f62 || 0));
  const scoredPre = rankByFlow.map((it) => {
    const sMoney = seg((it.f62 || 0) / 1e8, [[15, 100], [10, 90], [5, 80], [2, 65], [0, 50], [-5, 30]]);
    const secItem = sectorMap[it.f100]; const sInd = scoreIndustry(secItem);
    return { it, sMoney, sInd };
  });
  const candidates = scoredPre.sort((a, b) => (0.6 * b.sMoney + 0.4 * b.sInd) - (0.6 * a.sMoney + 0.4 * a.sInd)).slice(0, 15);
  const deepResults = await Promise.all(candidates.map((c) => fetchDeep(fetchFn, c.it.f12).then((deep) => ({ it: c.it, deep }))));
  const pool: ScoredStock[] = deepResults.map(({ it, deep }) => {
    const secItem = sectorMap[it.f100];
    const dims = {
      money: scoreMoney(it, deep.flow), trend: scoreTrend(it, deep), industry: scoreIndustry(secItem),
      finance: scoreFinance(deep.fin), basic: scoreBasic(it), holder: scoreHolder(deep.holders),
    };
    const total = 0.25 * dims.money + 0.25 * dims.trend + 0.15 * dims.industry + 0.13 * dims.finance + 0.12 * dims.basic + 0.10 * dims.holder;
    return { ...it, dims, total, deep, rank: 0 };
  }).sort((a, b) => b.total - a.total);
  pool.forEach((p, i) => { p.rank = i + 1; });
  const hits = pool.slice(0, 5);
  const elapsedSec = (Date.now() - t0) / 1000;
  return buildReportHtml({
    indices, top20, sectors, concepts, pool, hits,
    filteredCount: filtered.length, excludedCount: rankAll.length - filtered.length,
    generatedAt, elapsedSec,
  });
}

// ===== 把 path -> api.* 映射（适配 generateStockReport 的 fetchFn）=====
function pathToQuery(path: string): Promise<any> {
  // 移除 query 前缀以解析参数
  const [p, q = ''] = path.split('?');
  const qp = new URLSearchParams(q);
  switch (p) {
    case '/api/market-overview': return api.marketOverview();
    case '/api/stock-flow-rank': return api.stockFlowRank(Math.max(1, parseInt(qp.get('pz') || '100') || 100));
    case '/api/sector-flow-rank': return api.sectorFlowRank((parseInt(qp.get('t') || '2') || 2) as 1 | 2, Math.max(1, parseInt(qp.get('pz') || '30') || 30));
    case '/api/sina-bkzj': return api.sinaBkzj((parseInt(qp.get('fenlei') || '1') || 1) as 0 | 1);
    case '/api/kline': return api.kline(qp.get('code') || '', qp.get('period') || 'day');
    case '/api/stock-fflow-day': return api.stockFflowDay(qp.get('code') || '', Math.max(1, parseInt(qp.get('lmt') || '30') || 30));
    case '/api/stock-finance': return api.stockFinance(qp.get('code') || '');
    case '/api/stock-holder': return api.stockHolder(qp.get('code') || '');
    default: return Promise.resolve(null);
  }
}

// ============================================
// 页面组件
// ============================================
export default function ReportPage() {
  const { navigate } = useRouter();
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [elapsed, setElapsed] = useState<number>(0);
  const tRef = useRef<number | null>(null);

  // 报告页强制浅色主题（useLayoutEffect 在渲染前同步执行，避免暗色闪烁）
  useLayoutEffect(() => {
    const el = document.documentElement;
    const prev = el.getAttribute('data-theme') || '';
    el.setAttribute('data-theme', 'light');
    return () => { el.setAttribute('data-theme', prev || 'dark'); };
  }, []);

  const run = useCallback(async () => {
    setLoading(true); setHtml(''); setElapsed(0);
    const t0 = Date.now();
    if (tRef.current) window.clearInterval(tRef.current);
    tRef.current = window.setInterval(() => setElapsed((Date.now() - t0) / 1000), 100);
    try {
      const h = await generateStockReport(pathToQuery);
      setHtml(h);
    } catch (e: any) {
      setHtml(`<div class="disc">报告生成失败：${String(e?.message || e).replace(/</g, '&lt;')}</div>`);
    } finally {
      if (tRef.current) { window.clearInterval(tRef.current); tRef.current = null; }
      setElapsed((Date.now() - t0) / 1000);
      setLoading(false);
    }
  }, []);

  useEffect(() => { run(); return () => { if (tRef.current) window.clearInterval(tRef.current); }; }, [run]);

  const downloadHtml = () => {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-report-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="page" style={{
      background: '#f4f5f7', color: '#212529',
      // 覆盖 dark 主题 CSS 变量，确保容器内所有引用变量的元素都是浅色
      ['--bg' as any]: '#f4f5f7',
      ['--bg-2' as any]: '#fff',
      ['--fg' as any]: '#212529',
      ['--fg-2' as any]: '#495057',
      ['--fg-dim' as any]: '#868e96',
      ['--border' as any]: '#e9ecef',
      ['--card' as any]: '#fff',
      ['--up' as any]: '#e03131',
      ['--down' as any]: '#0f9960',
    }}>
      <div className="detail-actions" style={{ borderBottom: '1px solid #e9ecef', background: '#fff', flexShrink: 0 }}>
        <button className="btn-back" onClick={() => navigate('/?tab=market')}>← 返回行情</button>
        <button className="btn-back" onClick={run} disabled={loading}>
          {loading ? '生成中…' : '↻ 重新生成'}
        </button>
        <button className="btn-back" onClick={downloadHtml} disabled={!html}>⬇ 下载 HTML</button>
        <div style={{ flex: 1, textAlign: 'right', opacity: .7, fontSize: 12, paddingRight: 4 }}>
          {loading ? `扫描中… ${elapsed.toFixed(1)}s` : html ? `耗时 ${elapsed.toFixed(1)}s` : ''}
        </div>
      </div>
      <div id="report-frame" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', background: '#f4f5f7', color: '#212529', paddingBottom: 'calc(20px + var(--safe-bottom))' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '120px 20px', color: '#212529' }}>
            <div style={{ display: 'inline-block', width: 22, height: 22, border: '2px solid #dee2e6', borderTopColor: '#e03131', borderRadius: '50%', animation: 'rp 1s linear infinite', verticalAlign: 'middle', marginRight: 10 }} />
            正在扫描全市场（六维评分 / 15 只深度分析），请稍候…
          </div>
        )}
        {html && (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
      <style>{`@keyframes rp{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
