import * as vscode from 'vscode';
import { fetchStockQuotes } from '../service/eastmoney';
import { formatPrice, formatRate } from '../shared/utils';

export class StatusBarManager {
  private _statusBarItem: vscode.StatusBarItem;
  private _disposable: vscode.Disposable;
  private _interval: NodeJS.Timeout | undefined;
  private _codes: string[] = [];

  constructor() {
    this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this._statusBarItem.command = 'stock-ext.openStockCenter';
    this._statusBarItem.tooltip = 'StockExt - 点击打开韭菜中心';
    this._disposable = this._statusBarItem;
    this.loadConfig();
    this.start();
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('stock-ext.statusBarStock')) {
        this._codes = vscode.workspace.getConfiguration('stock-ext').get<string[]>('statusBarStock') || ['sh000001'];
        this.update();
      }
    });
  }

  private loadConfig() {
    const config = vscode.workspace.getConfiguration('stock-ext');
    this._codes = config.get<string[]>('statusBarStock') || ['sh000001'];
    const hide = config.get<boolean>('hideStatusBar') || false;
    if (hide) {
      this._statusBarItem.hide();
    } else {
      this._statusBarItem.show();
    }
  }

  start() {
    this.update();
    const interval = vscode.workspace.getConfiguration('stock-ext').get<number>('interval') || 5000;
    this._interval = setInterval(() => this.update(), Math.max(3000, interval));
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = undefined;
    }
  }

  private async update() {
    try {
      const quotes = await fetchStockQuotes(this._codes);
      if (quotes.length > 0) {
        const parts = quotes.map(q => {
          const changeStr = formatRate(q.changeRate);
          return `${q.name || q.code}: ${formatPrice(q.price)} ${changeStr}`;
        });
        this._statusBarItem.text = `$(graph) ${parts.join(' | ')}`;
      } else {
        this._statusBarItem.text = '$(graph) StockExt';
      }
    } catch {
      this._statusBarItem.text = '$(graph) StockExt';
    }
  }

  toggleVisibility() {
    const config = vscode.workspace.getConfiguration('stock-ext');
    const current = config.get<boolean>('hideStatusBar') || false;
    config.update('hideStatusBar', !current, vscode.ConfigurationTarget.Global);
    if (!current) {
      this._statusBarItem.hide();
    } else {
      this._statusBarItem.show();
    }
  }

  setHidden(hidden: boolean) {
    if (hidden) {
      this._statusBarItem.hide();
    } else {
      this._statusBarItem.show();
    }
  }

  dispose() {
    this.stop();
    this._disposable.dispose();
  }
}
