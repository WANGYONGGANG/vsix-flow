// ============================================
// 通达信公式解析器 - 完整版支持官方函数
// ============================================

export interface KLineData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  vol: number;
  amount?: number;
}

export interface FormulaResult {
  name: string;
  lines: { label: string; values: number[]; color: string }[];
  type: 'main' | 'sub';
}

type VarFunc = (...args: any[]) => number[];

const VARS: Record<string, number[]> = {};
let CURRENT_DATA: KLineData[] = [];

export function setData(data: KLineData[]) {
  CURRENT_DATA = data;
}

function getVar(name: string): number[] {
  if (VARS[name]) return VARS[name];
  const u = name.toUpperCase();
  switch (u) {
    case 'CLOSE': case 'C': return CURRENT_DATA.map(d => d.close);
    case 'OPEN': case 'O': return CURRENT_DATA.map(d => d.open);
    case 'HIGH': case 'H': return CURRENT_DATA.map(d => d.high);
    case 'LOW': case 'L': return CURRENT_DATA.map(d => d.low);
    case 'VOL': case 'V': return CURRENT_DATA.map(d => d.vol);
    case 'AMOUNT': case 'AMO': return CURRENT_DATA.map(d => d.amount || d.vol * d.close);
    case 'INDEXC': return CURRENT_DATA.map(d => d.close);
    case 'INDEXO': return CURRENT_DATA.map(d => d.open);
    case 'INDEXH': return CURRENT_DATA.map(d => d.high);
    case 'INDEXL': return CURRENT_DATA.map(d => d.low);
    case 'INDEXV': return CURRENT_DATA.map(d => d.vol);
    case 'CAPITAL': return CURRENT_DATA.map(() => 100000000);
    case 'DATE': return CURRENT_DATA.map((_, i) => i);
    case 'BARSCOUNT': return CURRENT_DATA.map((_, i) => i);
    case 'BARSLASTCOUNT': {
      const r: number[] = [];
      let cnt = 0;
      for (let i = 0; i < CURRENT_DATA.length; i++) {
        cnt++;
        r.push(cnt);
      }
      return r;
    }
    case 'TOTALBARSCOUNT': return CURRENT_DATA.map(() => CURRENT_DATA.length);
    default: return CURRENT_DATA.map(() => 0);
  }
}

// ============ 行情引用函数 ============
function REF(data: number[], n: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const idx = i - Math.round(n);
    r.push(idx >= 0 ? data[idx] : NaN);
  }
  return r;
}

function REFX(data: number[], n: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const idx = i + Math.round(n);
    r.push(idx < data.length ? data[idx] : NaN);
  }
  return r;
}

// ============ 简单移动平均 ============
function MA(data: number[], n: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < n - 1) { r.push(NaN); continue; }
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += data[j];
    r.push(s / n);
  }
  return r;
}

// ============ 加权移动平均 ============
function WMA(data: number[], n: number): number[] {
  const r: number[] = [];
  const denom = n * (n + 1) / 2;
  for (let i = 0; i < data.length; i++) {
    if (i < n - 1) { r.push(NaN); continue; }
    let s = 0;
    for (let j = 0; j < n; j++) s += data[i - n + 1 + j] * (j + 1);
    r.push(s / denom);
  }
  return r;
}

// ============ 指数移动平均 ============
function EMA(data: number[], n: number): number[] {
  const r: number[] = [];
  const k = 2 / (n + 1);
  for (let i = 0; i < data.length; i++) {
    if (i === 0) { r.push(data[0]); continue; }
    r.push(data[i] * k + r[i - 1] * (1 - k));
  }
  return r;
}

// ============ 递归移动平均 ============
function SMA(data: number[], n: number, m: number = 1): number[] {
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i === 0) { r.push(data[0]); continue; }
    r.push((data[i] * m + r[i - 1] * (n - m)) / n);
  }
  return r;
}

// ============ 移动平均（改进型） ============
function MEMA(data: number[], n: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < n - 1) { r.push(data[i]); continue; }
    if (i === n - 1) {
      let s = 0;
      for (let j = 0; j < n; j++) s += data[j];
      r.push(s / n);
      continue;
    }
    r.push((r[i - 1] * (n - 1) + data[i]) / n);
  }
  return r;
}

// ============ 通达信平滑移动平均 ============
function TMA(data: number[], n: number, m: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i === 0) { r.push(data[0]); continue; }
    r.push((m * data[i] + (n - m) * r[i - 1]) / n);
  }
  return r;
}

// ============ 最高值/最低值 ============
function HHV(data: number[], n: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    let max = -Infinity;
    for (let j = Math.max(0, i - n + 1); j <= i; j++) {
      if (data[j] > max) max = data[j];
    }
    r.push(max === -Infinity ? NaN : max);
  }
  return r;
}

function LLV(data: number[], n: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    let min = Infinity;
    for (let j = Math.max(0, i - n + 1); j <= i; j++) {
      if (data[j] < min) min = data[j];
    }
    r.push(min === Infinity ? NaN : min);
  }
  return r;
}

// ============ 求和/计数 ============
function SUM(data: number[], n: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    let s = 0;
    for (let j = Math.max(0, i - n + 1); j <= i; j++) s += data[j];
    r.push(s);
  }
  return r;
}

function COUNT(cond: number[], n: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < cond.length; i++) {
    let cnt = 0;
    for (let j = Math.max(0, i - n + 1); j <= i; j++) if (cond[j]) cnt++;
    r.push(cnt);
  }
  return r;
}

function EVERY(cond: number[], n: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < cond.length; i++) {
    let ok = true;
    for (let j = Math.max(0, i - n + 1); j <= i; j++) if (!cond[j]) { ok = false; break; }
    r.push(ok ? 1 : 0);
  }
  return r;
}

function EXIST(cond: number[], n: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < cond.length; i++) {
    let ok = false;
    for (let j = Math.max(0, i - n + 1); j <= i; j++) if (cond[j]) { ok = true; break; }
    r.push(ok ? 1 : 0);
  }
  return r;
}

// ============ HHV/LLV 位置 ============
function HHVBARS(data: number[], n: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    let max = -Infinity, idx = 0;
    for (let j = Math.max(0, i - n + 1); j <= i; j++) {
      if (data[j] > max) { max = data[j]; idx = i - j; }
    }
    r.push(idx);
  }
  return r;
}

function LLVBARS(data: number[], n: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    let min = Infinity, idx = 0;
    for (let j = Math.max(0, i - n + 1); j <= i; j++) {
      if (data[j] < min) { min = data[j]; idx = i - j; }
    }
    r.push(idx);
  }
  return r;
}

// ============ BARSLAST ============
function BARSLAST(cond: number[]): number[] {
  const r: number[] = [];
  let last = -1;
  for (let i = 0; i < cond.length; i++) {
    if (cond[i]) last = i;
    r.push(last >= 0 ? i - last : NaN);
  }
  return r;
}

// ============ BARSSINCE ============
function BARSSINCE(cond: number[]): number[] {
  const r: number[] = [];
  let found = false;
  let cnt = 0;
  for (let i = 0; i < cond.length; i++) {
    if (!found) {
      if (cond[i]) { found = true; cnt = 0; }
      else { r.push(NaN); continue; }
    }
    r.push(cnt);
    cnt++;
  }
  return r;
}

// ============ CROSS ============
function asArr(x: any): number[] {
  return Array.isArray(x) ? x : CURRENT_DATA.map(() => x);
}

function CROSS(a: any, b: any): number[] {
  a = asArr(a); b = asArr(b);
  const r: number[] = [];
  for (let i = 0; i < a.length; i++) {
    if (i === 0) { r.push(0); continue; }
    r.push(a[i - 1] <= b[i - 1] && a[i] > b[i] ? 1 : 0);
  }
  return r;
}

function CROSSDOWN(a: any, b: any): number[] {
  a = asArr(a); b = asArr(b);
  const r: number[] = [];
  for (let i = 0; i < a.length; i++) {
    if (i === 0) { r.push(0); continue; }
    r.push(a[i - 1] >= b[i - 1] && a[i] < b[i] ? 1 : 0);
  }
  return r;
}

// ============ 上穿N周期最高/最低 ============
// ============ 条件判断 ============
function IF(cond: number[], a: any, b: any): number[] {
  const av = asArr(a), bv = asArr(b);
  return cond.map((c, i) => c ? av[i] : bv[i]);
}

// ============ 统计函数 ============
function ABS(data: number[]): number[] {
  return data.map(d => Math.abs(d));
}

function MAX(a: any, b: any): number[] {
  a = asArr(a); b = asArr(b);
  return a.map((v: number, i: number) => Math.max(v, b[i]));
}

function MIN(a: any, b: any): number[] {
  a = asArr(a); b = asArr(b);
  return a.map((v: number, i: number) => Math.min(v, b[i]));
}

function BETWEEN(x: any, a: any, b: any): number[] {
  x = asArr(x); a = asArr(a); b = asArr(b);
  return x.map((v: number, i: number) => v >= a[i] && v <= b[i] ? 1 : 0);
}

// ============ 标准差/方差 ============
function STD(data: number[], n: number): number[] {
  const ma = MA(data, n);
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < n - 1) { r.push(NaN); continue; }
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += (data[j] - ma[i]) ** 2;
    r.push(Math.sqrt(s / n));
  }
  return r;
}

function STDEV(data: number[], n: number): number[] {
  const ma = MA(data, n);
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < n - 1) { r.push(NaN); continue; }
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += (data[j] - ma[i]) ** 2;
    r.push(Math.sqrt(s / (n - 1)));
  }
  return r;
}

function VARP(data: number[], n: number): number[] {
  const ma = MA(data, n);
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < n - 1) { r.push(NaN); continue; }
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += (data[j] - ma[i]) ** 2;
    r.push(s / n);
  }
  return r;
}

function VAR(data: number[], n: number): number[] {
  const ma = MA(data, n);
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < n - 1) { r.push(NaN); continue; }
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += (data[j] - ma[i]) ** 2;
    r.push(s / (n - 1));
  }
  return r;
}

function AVEDEV(data: number[], n: number): number[] {
  const ma = MA(data, n);
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < n - 1) { r.push(NaN); continue; }
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += Math.abs(data[j] - ma[i]);
    r.push(s / n);
  }
  return r;
}

// ============ SLOPE（线性回归斜率） ============
function SLOPE(data: number[], n: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < n - 1) { r.push(NaN); continue; }
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let j = 0; j < n; j++) {
      const x = j;
      const y = data[i - n + 1 + j];
      sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
    }
    const denom = n * sumX2 - sumX * sumX;
    r.push(denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom);
  }
  return r;
}

// ============ FORCAST（线性回归预测） ============
function FORCAST(data: number[], n: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < n - 1) { r.push(NaN); continue; }
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let j = 0; j < n; j++) {
      const x = j;
      const y = data[i - n + 1 + j];
      sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
    }
    const denom = n * sumX2 - sumX * sumX;
    const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    r.push(intercept + slope * n);
  }
  return r;
}

// ============ 趋势指标 ============
function DMA_FUNC(data: number[], a: number[]): number[] {
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i === 0) { r.push(data[0]); continue; }
    const ratio = Math.max(0, Math.min(1, a[i]));
    r.push(data[i] * ratio + r[i - 1] * (1 - ratio));
  }
  return r;
}

// ============ 价格位置 ============
function CLOSE位置(n: number): number[] {
  return CURRENT_DATA.map((d, i) => {
    let min = Infinity, max = -Infinity;
    for (let j = Math.max(0, i - n + 1); j <= i; j++) {
      if (CURRENT_DATA[j].low < min) min = CURRENT_DATA[j].low;
      if (CURRENT_DATA[j].high > max) max = CURRENT_DATA[j].high;
    }
    if (max === min) return 0.5;
    return (d.close - min) / (max - min);
  });
}

// ============ 乖离率 ============
function BIAS(data: number[], n: number): number[] {
  const ma = MA(data, n);
  return data.map((v, i) => ma[i] ? ((v - ma[i]) / ma[i]) * 100 : NaN);
}

// ============ 威廉指标 ============
function WR(data: number[], n: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    let max = -Infinity, min = Infinity;
    for (let j = Math.max(0, i - n + 1); j <= i; j++) {
      const d = CURRENT_DATA[j];
      if (d.high > max) max = d.high;
      if (d.low < min) min = d.low;
    }
    if (max === min) { r.push(50); continue; }
    r.push(-100 * (max - data[i]) / (max - min));
  }
  return r;
}

// ============ CCI ============
function CCI(data: number[], n: number): number[] {
  const tp = CURRENT_DATA.map(d => (d.high + d.low + d.close) / 3);
  const maTP = MA(tp, n);
  const r: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < n - 1) { r.push(NaN); continue; }
    let sum = 0;
    for (let j = i - n + 1; j <= i; j++) sum += Math.abs(tp[j] - maTP[i]);
    const md = sum / n;
    r.push(md === 0 ? 0 : (tp[i] - maTP[i]) / (0.015 * md));
  }
  return r;
}

// ============ SAR ============
function SAR_FUNC(n: number, step: number, _max: number): number[] {
  const r: number[] = [];
  let sar = CURRENT_DATA[0]?.low || 0;
  let isUp = true;
  for (let i = 0; i < CURRENT_DATA.length; i++) {
    if (i < Math.round(n)) { r.push(sar); continue; }
    const d = CURRENT_DATA[i];
    if (isUp) {
      sar = Math.max(sar + step / 100 * (d.high - sar), ...CURRENT_DATA.slice(Math.max(0, i - Math.round(n) + 1), i).map(x => x.low));
      if (d.low < sar) { isUp = false; sar = Math.max(...CURRENT_DATA.slice(Math.max(0, i - Math.round(n) + 1), i + 1).map(x => x.high)); }
    } else {
      sar = Math.min(sar + step / 100 * (d.low - sar), ...CURRENT_DATA.slice(Math.max(0, i - Math.round(n) + 1), i).map(x => x.high));
      if (d.high > sar) { isUp = true; sar = Math.min(...CURRENT_DATA.slice(Math.max(0, i - Math.round(n) + 1), i + 1).map(x => x.low)); }
    }
    r.push(sar);
  }
  return r;
}

// ============ 支撑/压力 ============
function 支撑线(n: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < CURRENT_DATA.length; i++) {
    const start = Math.max(0, i - n + 1);
    let min = Infinity;
    for (let j = start; j <= i; j++) {
      if (CURRENT_DATA[j].low < min) min = CURRENT_DATA[j].low;
    }
    r.push(min === Infinity ? NaN : min);
  }
  return r;
}

function 压力线(n: number): number[] {
  const r: number[] = [];
  for (let i = 0; i < CURRENT_DATA.length; i++) {
    const start = Math.max(0, i - n + 1);
    let max = -Infinity;
    for (let j = start; j <= i; j++) {
      if (CURRENT_DATA[j].high > max) max = CURRENT_DATA[j].high;
    }
    r.push(max === -Infinity ? NaN : max);
  }
  return r;
}

// ============ 成交量函数 ============
function SUMVOL(n: number): number[] {
  return SUM(CURRENT_DATA.map(d => d.vol), n);
}

function VOLMA(n: number): number[] {
  return MA(CURRENT_DATA.map(d => d.vol), n);
}

// ============ 量价关系 ============
function 量比(n: number): number[] {
  const vol = CURRENT_DATA.map(d => d.vol);
  const avgVol = MA(vol, n);
  return vol.map((v, i) => avgVol[i] ? v / avgVol[i] : NaN);
}

// ============ 涨跌相关 ============
function 涨幅(): number[] {
  const r: number[] = [];
  for (let i = 0; i < CURRENT_DATA.length; i++) {
    if (i === 0) { r.push(0); continue; }
    const pre = CURRENT_DATA[i - 1].close;
    r.push(pre ? ((CURRENT_DATA[i].close - pre) / pre) * 100 : 0);
  }
  return r;
}

function 跌幅(): number[] {
  return 涨幅().map(v => Math.min(0, v));
}

function 振幅(): number[] {
  return CURRENT_DATA.map(d => {
    if (d.open === 0) return 0;
    return ((d.high - d.low) / d.open) * 100;
  });
}

// ============ 条件选择 ============
function FILTER(cond: number[], n: number): number[] {
  const r: number[] = [];
  let last = -n - 1;
  for (let i = 0; i < cond.length; i++) {
    if (cond[i] && i - last > n) {
      r.push(1);
      last = i;
    } else {
      r.push(0);
    }
  }
  return r;
}

function CAPITAL(): number[] {
  return CURRENT_DATA.map(() => 100000000);
}

// ============ 内置函数表 ============
const FUNCTIONS: Record<string, VarFunc> = {
  // 行情引用
  REF, REFX,
  // 移动平均
  MA, WMA, EMA, SMA, DMA: DMA_FUNC, MEMA, TMA,
  // 最高最低
  HHV, LLV, HHVBARS, LLVBARS,
  // 求和计数
  SUM, COUNT, EVERY, EXIST,
  // 交叉
  CROSS, CROSSDOWN,
  // 条件
  IF, IFF: IF,
  // 数学
  ABS, MAX, MIN, BETWEEN,
  // 统计
  STD, STDEV, VARP, VAR, AVEDEV,
  // 回归
  SLOPE, FORCAST,
  // 位置
  BARSLAST, BARSSINCE,
  // 技术指标
  BIAS, WR, CCI, SAR: SAR_FUNC,
  // 支撑压力
  '支撑线': 支撑线, '压力线': 压力线,
  // 成交量
  SUMVOL, VOLMA,
  // 量价
  '量比': 量比,
  // 涨跌
  '涨幅': 涨幅, '跌幅': 跌幅, '振幅': 振幅,
  // 过滤
  FILTER,
  // 价格位置
  'CLOSE位置': CLOSE位置,
  // 资本
  CAPITAL,
};

// ============ 公式解析器 ============
class Token {
  type: 'number' | 'identifier' | 'operator' | 'lparen' | 'rparen' | 'comma';
  value: string;
  constructor(type: Token['type'], value: string) {
    this.type = type;
    this.value = value;
  }
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) num += expr[i++];
      tokens.push(new Token('number', num));
    } else if (/[a-zA-Z_\u4e00-\u9fa5]/.test(ch)) {
      let id = '';
      while (i < expr.length && /[a-zA-Z0-9_\u4e00-\u9fa5]/.test(expr[i])) id += expr[i++];
      tokens.push(new Token('identifier', id.toUpperCase()));
    } else if (ch === '(') { tokens.push(new Token('lparen', '(')); i++; }
    else if (ch === ')') { tokens.push(new Token('rparen', ')')); i++; }
    else if (ch === ',') { tokens.push(new Token('comma', ',')); i++; }
    else if ('+-*/<>=!&|'.includes(ch)) {
      let op = ch;
      i++;
      if (i < expr.length && (expr[i] === '=' || expr[i] === '>' || expr[i] === '<')) {
        op += expr[i++];
      }
      tokens.push(new Token('operator', op));
    } else { i++; }
  }
  return tokens;
}

interface ASTNode {
  type: 'number' | 'variable' | 'binary' | 'call' | 'negate';
  value?: number;
  name?: string;
  op?: string;
  left?: ASTNode;
  right?: ASTNode;
  args?: ASTNode[];
}

class Parser {
  private tokens: Token[];
  private pos: number;
  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.pos = 0;
  }
  private peek(): Token | undefined { return this.tokens[this.pos]; }
  private next(): Token { return this.tokens[this.pos++]; }
  private expect(type: Token['type']): Token {
    const t = this.next();
    if (t.type !== type) throw new Error(`Expected ${type}, got ${t.type}`);
    return t;
  }
  parse(): ASTNode { return this.parseExpr(); }
  private parseExpr(): ASTNode { return this.parseComparison(); }
  private parseComparison(): ASTNode {
    let left = this.parseAddSub();
    while (this.peek()?.type === 'operator' && ['=', '!=', '>', '<', '>=', '<='].includes(this.peek()!.value)) {
      const op = this.next().value;
      const right = this.parseAddSub();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }
  private parseAddSub(): ASTNode {
    let left = this.parseMulDiv();
    while (this.peek()?.type === 'operator' && (this.peek()!.value === '+' || this.peek()!.value === '-')) {
      const op = this.next().value;
      const right = this.parseMulDiv();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }
  private parseMulDiv(): ASTNode {
    let left = this.parseUnary();
    while (this.peek()?.type === 'operator' && (this.peek()!.value === '*' || this.peek()!.value === '/')) {
      const op = this.next().value;
      const right = this.parseUnary();
      left = { type: 'binary', op, left, right };
    }
    return left;
  }
  private parseUnary(): ASTNode {
    if (this.peek()?.type === 'operator' && this.peek()!.value === '-') {
      this.next();
      return { type: 'negate', left: this.parsePrimary() };
    }
    return this.parsePrimary();
  }
  private parsePrimary(): ASTNode {
    const t = this.peek();
    if (!t) throw new Error('Unexpected end of expression');
    if (t.type === 'number') {
      this.next();
      return { type: 'number', value: parseFloat(t.value) };
    }
    if (t.type === 'identifier') {
      this.next();
      const name = t.value;
      if (this.peek()?.type === 'lparen') {
        this.next();
        const args: ASTNode[] = [];
        if (this.peek()?.type !== 'rparen') {
          args.push(this.parseExpr());
          while (this.peek()?.type === 'comma') {
            this.next();
            args.push(this.parseExpr());
          }
        }
        this.expect('rparen');
        return { type: 'call', name, args };
      }
      return { type: 'variable', name };
    }
    if (t.type === 'lparen') {
      this.next();
      const expr = this.parseExpr();
      this.expect('rparen');
      return expr;
    }
    throw new Error(`Unexpected token: ${t.type} ${t.value}`);
  }
}

function evalAST(node: ASTNode): number[] {
  switch (node.type) {
    case 'number':
      return CURRENT_DATA.map(() => node.value!);
    case 'variable':
      return getVar(node.name!);
    case 'negate':
      return evalAST(node.left!).map(v => -v);
    case 'binary': {
      const left = evalAST(node.left!);
      const right = evalAST(node.right!);
      switch (node.op) {
        case '+': return left.map((v, i) => v + right[i]);
        case '-': return left.map((v, i) => v - right[i]);
        case '*': return left.map((v, i) => v * right[i]);
        case '/': return left.map((v, i) => right[i] === 0 ? NaN : v / right[i]);
        case '=': case '==': return left.map((v, i) => v === right[i] ? 1 : 0);
        case '!=': return left.map((v, i) => v !== right[i] ? 1 : 0);
        case '>': return left.map((v, i) => v > right[i] ? 1 : 0);
        case '<': return left.map((v, i) => v < right[i] ? 1 : 0);
        case '>=': return left.map((v, i) => v >= right[i] ? 1 : 0);
        case '<=': return left.map((v, i) => v <= right[i] ? 1 : 0);
        default: return left.map(() => NaN);
      }
    }
    case 'call': {
      const args = node.args!.map(a => {
        const v = evalAST(a);
        // 常量参数转回标量（MA/EMA/HHV 等函数的周期参数期望 number）
        const f = v[0];
        return typeof f === 'number' && v.every(x => x === f) ? f : v;
      });
      const fn = FUNCTIONS[node.name!];
      if (!fn) throw new Error(`Unknown function: ${node.name}`);
      return fn(...args);
    }
    default:
      return CURRENT_DATA.map(() => NaN);
  }
}

// ============ 公式接口 ============

export interface Formula {
  id: string;
  name: string;
  code: string;
  type: 'main' | 'sub';
  lines: { label: string; color: string }[];
  enabled: boolean;
}

// 预设公式
export const PRESET_FORMULAS: Formula[] = [
  {
    id: 'ma',
    name: 'MA 均线',
    code: 'MA5:=MA(CLOSE,5);\nMA10:=MA(CLOSE,10);\nMA20:=MA(CLOSE,20);\nMA60:=MA(CLOSE,60);',
    type: 'main',
    lines: [
      { label: 'MA5', color: '#e8b339' },
      { label: 'MA10', color: '#36a2eb' },
      { label: 'MA20', color: '#cc65fe' },
      { label: 'MA60', color: '#23c343' },
    ],
    enabled: true,
  },
  {
    id: 'boll',
    name: 'BOLL 布林带',
    code: 'MID:=MA(CLOSE,20);\nUPPER:=MID+2*STD(CLOSE,20);\nLOWER:=MID-2*STD(CLOSE,20);',
    type: 'main',
    lines: [
      { label: 'MID', color: '#e8b339' },
      { label: 'UPPER', color: '#36a2eb' },
      { label: 'LOWER', color: '#cc65fe' },
    ],
    enabled: true,
  },
  {
    id: 'macd',
    name: 'MACD',
    code: 'DIF:=EMA(CLOSE,12)-EMA(CLOSE,26);\nDEA:=EMA(DIF,9);\nMACD:(DIF-DEA)*2;',
    type: 'sub',
    lines: [
      { label: 'DIF', color: '#36a2eb' },
      { label: 'DEA', color: '#e8b393' },
      { label: 'MACD', color: '#cc65fe' },
    ],
    enabled: true,
  },
  {
    id: 'kdj',
    name: 'KDJ',
    code: 'RSV:=(CLOSE-LLV(LOW,9))/(HHV(HIGH,9)-LLV(LOW,9))*100;\nK:=SMA(RSV,3,1);\nD:=SMA(K,3,1);\nJ:=3*K-2*D;',
    type: 'sub',
    lines: [
      { label: 'K', color: '#36a2eb' },
      { label: 'D', color: '#e8b393' },
      { label: 'J', color: '#cc65fe' },
    ],
    enabled: false,
  },
  {
    id: 'rsi',
    name: 'RSI',
    code: 'LC:=REF(CLOSE,1);\nRSI6:SMA(MAX(CLOSE-LC,0),6,1)/SMA(ABS(CLOSE-LC),6,1)*100;\nRSI12:SMA(MAX(CLOSE-LC,0),12,1)/SMA(ABS(CLOSE-LC),12,1)*100;',
    type: 'sub',
    lines: [
      { label: 'RSI6', color: '#36a2eb' },
      { label: 'RSI12', color: '#e8b393' },
    ],
    enabled: false,
  },
  {
    id: 'cci',
    name: 'CCI',
    code: 'TP:=(HIGH+LOW+CLOSE)/3;\nCCI:(TP-MA(TP,14))/(0.015*AVEDEV(TP,14));',
    type: 'sub',
    lines: [
      { label: 'CCI', color: '#36a2eb' },
    ],
    enabled: false,
  },
  {
    id: 'wr',
    name: 'WR 威廉',
    code: 'WR:=-100*(HHV(HIGH,14)-CLOSE)/(HHV(HIGH,14)-LLV(LOW,14));',
    type: 'sub',
    lines: [
      { label: 'WR', color: '#36a2eb' },
    ],
    enabled: false,
  },
  {
    id: 'dmi',
    name: 'DMI',
    code: 'MTR:=SMA(MAX(HIGH-REF(HIGH,1),REF(LOW,1)-LOW),14,1);\nHD:=HIGH-REF(HIGH,1);\nLD:=REF(LOW,1)-LOW;\nDMP:=SMA(IF(HD>0&&HD>LD,HD,0),14,1);\nDMM:=SMA(IF(LD>0&&LD>HD,LD,0),14,1);\nADX:=SMA(ABS(DMP-DMM)/(DMP+DMM)*100,14,1);',
    type: 'sub',
    lines: [
      { label: 'ADX', color: '#36a2eb' },
      { label: 'DMP', color: '#23c343' },
      { label: 'DMM', color: '#ff4d4f' },
    ],
    enabled: false,
  },
  {
    id: 'obv',
    name: 'OBV',
    code: 'OBV:=SUM(IF(CLOSE>REF(CLOSE,1),VOL,IF(CLOSE<REF(CLOSE,1),-VOL,0)),0);',
    type: 'sub',
    lines: [
      { label: 'OBV', color: '#36a2eb' },
    ],
    enabled: false,
  },
  {
    id: 'sar',
    name: 'SAR 抛物线',
    code: 'SAR:SAR(10,2,20);',
    type: 'main',
    lines: [
      { label: 'SAR', color: '#e8b339' },
    ],
    enabled: false,
  },
  {
    id: 'bias',
    name: 'BIAS 乖离率',
    code: 'BIAS6:BIAS(CLOSE,6);\nBIAS12:BIAS(CLOSE,12);\nBIAS24:BIAS(CLOSE,24);',
    type: 'sub',
    lines: [
      { label: 'BIAS6', color: '#36a2eb' },
      { label: 'BIAS12', color: '#e8b393' },
      { label: 'BIAS24', color: '#cc65fe' },
    ],
    enabled: false,
  },
  {
    id: 'vol',
    name: 'VOL 成交量',
    code: 'VOLMA5:MA(VOL,5);\nVOLMA10:MA(VOL,10);',
    type: 'sub',
    lines: [
      { label: 'VOLMA5', color: '#36a2eb' },
      { label: 'VOLMA10', color: '#e8b393' },
    ],
    enabled: false,
  },
  {
    id: 'intraday_t',
    name: '做T指标（分时）',
    code: '// 做T指标：VWAP均线 + 支撑压力带 + 买卖信号\n// 仅在分时图生效，K线图无效\nVWAP:=SUM(CLOSE*VOL,0)/SUM(VOL,0);',
    type: 'main',
    lines: [
      { label: 'VWAP', color: '#f59f00' },
    ],
    enabled: false,
  },
];

// 解析并执行公式
export function executeFormula(formula: Formula, data: KLineData[]): FormulaResult {
  setData(data);
  Object.keys(VARS).forEach(k => delete VARS[k]);
  
  const lines = formula.lines.map(l => ({
    label: l.label,
    values: [] as number[],
    color: l.color,
  }));
  
  const statements = formula.code.split(/[;\n]+/).filter(s => s.trim());
  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (!trimmed) continue;
    
    const assignMatch = trimmed.match(/^([A-Z_\u4e00-\u9fa5][A-Z0-9_\u4e00-\u9fa5]*)\s*:=\s*(.+)$/i) ||
                       trimmed.match(/^([A-Z_\u4e00-\u9fa5][A-Z0-9_\u4e00-\u9fa5]*)\s*:\s*(.+)$/i);
    if (assignMatch) {
      const varName = assignMatch[1].toUpperCase();
      const expr = assignMatch[2];
      
      try {
        const tokens = tokenize(expr);
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const values = evalAST(ast);
        VARS[varName] = values;
        
        const lineDef = lines.find(l => l.label.toUpperCase() === varName);
        if (lineDef) lineDef.values = values;
      } catch (e) {
        console.error(`Formula error: ${stmt}`, e);
      }
    } else {
      try {
        const tokens = tokenize(trimmed);
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const values = evalAST(ast);
        
        if (lines.length > 0 && lines[0].values.length === 0) {
          lines[0].values = values;
        }
      } catch (e) {
        console.error(`Formula error: ${trimmed}`, e);
      }
    }
  }
  
  return {
    name: formula.name,
    lines,
    type: formula.type,
  };
}

// 验证公式语法
export function validateFormula(code: string): { valid: boolean; error?: string } {
  try {
    const statements = code.split(/[;\n]+/).filter(s => s.trim());
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (!trimmed) continue;
      
      const expr = trimmed.includes(':=') ? trimmed.split(':=')[1] : trimmed.split(':')[1] || trimmed;
      const tokens = tokenize(expr);
      const parser = new Parser(tokens);
      parser.parse();
    }
    return { valid: true };
  } catch (e: any) {
    return { valid: false, error: e.message };
  }
}

// ============ AI 公式解析（对齐扩展 _saveAIFeatureFormula） ============

// 公式助手 prompt 模板（与扩展 aiWriteFormula 一致）
export function buildFormulaAssistantPrompt(desc: string): string {
  return '[公式助手] 请帮我写一个通达信公式指标：' + desc +
    '\n\n要求：\n1. 每行一个赋值语句，用分号结尾\n2. 输出线用 变量名:表达式 格式\n3. 赋值变量用 变量名:=表达式 格式\n4. 请在最后说明是主图叠加还是副图指标\n5. 请在代码前用“公式代码：”标记';
}

export interface ParsedAIFormula {
  name: string;
  code: string;
  type: 'main' | 'sub';
  lines: { label: string; color: string }[];
}

// 从 AI 回复中提取公式代码/名称/主副图类型，提取失败返回 null
export function parseAIFormula(text: string): ParsedAIFormula | null {
  // 去掉 markdown 代码块围栏后再匹配
  const clean = text.split('\n').filter((l) => !/^\s*```/.test(l)).join('\n');
  let codeBlock = '';
  const codeMatch = clean.match(new RegExp('公式代码[：:]\\s*\\n([\\s\\S]*?)(?:\\n\\n|\\n[^\\n]*：|$)'));
  if (codeMatch) {
    codeBlock = codeMatch[1].trim();
  } else {
    // 回退：扫描连续赋值语句行
    const linesArr = clean.split('\n');
    let inCode = false;
    const codeLines: string[] = [];
    for (const raw of linesArr) {
      const ln = raw.trim();
      if (/[A-Z_][A-Z0-9_]*\s*:=/i.test(ln) || /[A-Z_][A-Z0-9_]*\s*:[^=]/.test(ln)) inCode = true;
      if (inCode) {
        if (ln) codeLines.push(ln);
        else if (codeLines.length > 0) break;
      }
    }
    codeBlock = codeLines.join('\n');
  }
  if (!codeBlock) return null;

  const isMain = /主图/.test(clean);
  const nameMatch = clean.match(/(?:指标名称|公式名称)[：:]\s*(.+)/);
  let name = nameMatch ? nameMatch[1].trim() : 'AI公式';
  if (!name || name.length > 20) name = 'AI公式';

  const colors = ['#36a2eb', '#e8b393', '#cc65fe', '#23c343', '#ff4d4f'];
  const lines: { label: string; color: string }[] = [];
  const stmts = codeBlock.split(/[;\n]+/).filter((s) => s.trim());
  for (const s of stmts) {
    const t = s.trim();
    const match = t.match(/^([A-Z_][A-Z0-9_]*)\s*:=/i) || t.match(/^([A-Z_][A-Z0-9_]*)\s*:/i);
    if (match && t.includes(':') && !t.includes(':=')) {
      lines.push({ label: match[1].toUpperCase(), color: colors[lines.length % colors.length] });
    }
  }
  if (lines.length === 0) lines.push({ label: 'RESULT', color: colors[0] });

  return { name, code: codeBlock, type: isMain ? 'main' : 'sub', lines };
}
