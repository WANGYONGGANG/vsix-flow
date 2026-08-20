import * as vscode from 'vscode';
import { fetchStockQuotes } from '../service/eastmoney';
import { formatPrice, formatRate, isAStockHours } from '../shared/utils';
import type { StockItem } from '../shared/types';

type OpenDetailFn = (code: string, name: string) => void;

export class StatusBarManager {
  private _items: vscode.StatusBarItem[] = [];
  private _commands: vscode.Disposable[] = [];
  private _interval: NodeJS.Timeout | undefined;
  private _codes: string[] = [];
  private _quotes: StockItem[] = [];
  private _lastTexts: string[] = [];
  private _hasFetched = false;
  private _openDetailFn: OpenDetailFn;
  private _context?: vscode.ExtensionContext;

  constructor(openDetailFn: OpenDetailFn) {
    this._openDetailFn = openDetailFn;
    const cfg = vscode.workspace.getConfiguration('stock-ext');
    const raw: string[] = cfg.get<string[]>('statusBarStock') || [];
    // 迁移：旧bug把sh000001变成sz000001，统一用normCode修正
    const fixed = raw.map(c => this.fixOldBugCode(c));
    this._codes = fixed;
    if (JSON.stringify(fixed) !== JSON.stringify(raw)) {
      cfg.update('statusBarStock', fixed, vscode.ConfigurationTarget.Global);
    }
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('stock-ext.statusBarStock')) {
        this._codes = vscode.workspace.getConfiguration('stock-ext').get<string[]>('statusBarStock') || [];
      }
    });
  }

  private fixOldBugCode(code: string): string {
    const c = code.toLowerCase();
    if (c.startsWith('f_')) return c;
    if (/^(sh|sz|bj)\d/.test(c)) return c;
    const noPrefix = c.replace(/^(sh|sz|bj)/, '');
    if (/^(60|68|90|11|13|50|56|51|58)/.test(noPrefix)) return `sh${noPrefix}`;
    if (/^(00|30|20|12|15|16|18|159)/.test(noPrefix)) return `sz${noPrefix}`;
    if (/^(43|83|87|92|88)/.test(noPrefix)) return `bj${noPrefix}`;
    if (/^[a-z]/.test(noPrefix)) return 'f_' + noPrefix;
    return `sh${noPrefix}`;
  }

  /** 迁移旧bug: sz000001(sh000001被错误转换) → sh000001 */
  static async migrateConfig() {
    const cfg = vscode.workspace.getConfiguration('stock-ext');
    let changed = false;
    // 修复statusBarStock
    const sb: string[] = cfg.get<string[]>('statusBarStock') || [];
    const fixedSb = sb.map(c => { if (c.toLowerCase() === 'sz000001') { changed = true; return 'sh000001'; } return c; });
    if (changed) {
      await cfg.update('statusBarStock', fixedSb, vscode.ConfigurationTarget.Global);
    }
    // 修复stockPortfolio.groups.codes
    const portfolio: any = cfg.get('stockPortfolio') || {};
    let pfChanged = false;
    if (portfolio?.groups) {
      for (const g of portfolio.groups) {
        if (g?.codes) {
          g.codes = g.codes.map((c: string) => {
            if (c.toLowerCase() === 'sz000001') { pfChanged = true; return 'sh000001'; }
            return c;
          });
        }
      }
    }
    if (pfChanged) {
      await cfg.update('stockPortfolio', portfolio, vscode.ConfigurationTarget.Global);
    }
  }

  start(context: vscode.ExtensionContext) {
    this._context = context;
    this.rebuild();
    this.update(true);
    const interval = vscode.workspace.getConfiguration('stock-ext').get<number>('interval') || 5000;
    this._interval = setInterval(() => this.update(), Math.max(3000, interval));
  }

  rebuild() {
    if (!this._context) return;
    // Dispose old items and commands
    this._items.forEach(i => i.dispose());
    this._commands.forEach(c => c.dispose());
    this._items = [];
    this._commands = [];
    this._lastTexts = [];

    const hide = vscode.workspace.getConfiguration('stock-ext').get<boolean>('hideStatusBar') || false;
    for (let i = 0; i < this._codes.length; i++) {
      const code = this._codes[i];
      const cmdName = `stock-ext.sb_${i}`;
      const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100 - i);
      item.command = cmdName;
      item.text = '';
      if (!hide) item.show();
      this._items.push(item);
      this._lastTexts.push('');

      const idx = i;
      const cmd = vscode.commands.registerCommand(cmdName, () => {
        const q = this._quotes[idx];
        const name = q ? (q.name || q.code) : code;
        this._openDetailFn(code, name);
      });
      this._commands.push(cmd);
      this._context.subscriptions.push(cmd);
    }
    if (this._codes.length > 0) {
      this.update(true);
    }
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = undefined;
    }
  }

  getFirstQuote(): { code: string; name: string } | null {
    if (this._quotes.length > 0) {
      return { code: this._quotes[0].code, name: this._quotes[0].name || this._quotes[0].code };
    }
    if (this._codes.length > 0) {
      return { code: this._codes[0], name: this._codes[0] };
    }
    return null;
  }

  private async update(force = false) {
    if (!this._codes.length) return;

    // Rebuild items if count changed
    if (this._items.length !== this._codes.length) {
      this.rebuild();
    }

    // Check trading hours for non-first fetch
    if (!force && this._hasFetched) {
      const cfg = vscode.workspace.getConfiguration('stock-ext');
      const onlyA = cfg.get<boolean>('pollOnlyDuringAStockHours') !== false;
      if (onlyA && !isAStockHours()) {
        // Keep last data
        for (let i = 0; i < this._items.length; i++) {
          if (this._lastTexts[i]) {
            this._items[i].text = this._lastTexts[i];
          }
        }
        return;
      }
    }

    try {
      const quotes = await fetchStockQuotes(this._codes);
      if (quotes.length > 0) {
        this._quotes = quotes;
        this._hasFetched = true;
        for (let i = 0; i < this._items.length; i++) {
          const q = quotes[i];
          if (q) {
            const changeStr = formatRate(q.changeRate);
            this._items[i].text = `${q.name || q.code} ${formatPrice(q.price)} ${changeStr}`;
            this._items[i].tooltip = `${q.name || q.code} - 点击查看详情`;
            this._lastTexts[i] = this._items[i].text;
          }
        }
      } else {
        // Keep last data
        for (let i = 0; i < this._items.length; i++) {
          if (this._lastTexts[i]) {
            this._items[i].text = this._lastTexts[i];
          }
        }
      }
    } catch {
      // Keep last data on error
      for (let i = 0; i < this._items.length; i++) {
        if (this._lastTexts[i]) {
          this._items[i].text = this._lastTexts[i];
        }
      }
    }
  }

  toggleVisibility() {
    const config = vscode.workspace.getConfiguration('stock-ext');
    const current = config.get<boolean>('hideStatusBar') || false;
    config.update('hideStatusBar', !current, vscode.ConfigurationTarget.Global);
    this.setHidden(!current);
  }

  setHidden(hidden: boolean) {
    this._items.forEach(item => {
      if (hidden) item.hide();
      else item.show();
    });
  }

  dispose() {
    this.stop();
    this._items.forEach(i => i.dispose());
    this._commands.forEach(c => c.dispose());
  }
}
