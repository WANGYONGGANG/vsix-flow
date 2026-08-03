import * as vscode from 'vscode';
import { getHeldStocks, getAlias, type HeldStockDisplay } from './heldStockQuote';
import { formatPrice, formatRate } from '../shared/utils';

export class EditorDisguiseProvider implements vscode.CodeLensProvider, vscode.Disposable {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;
  private _heldStocks: HeldStockDisplay[] = [];
  private _disposables: vscode.Disposable[] = [];
  private _enabled: boolean = false;

  constructor() {
    this._enabled = vscode.workspace.getConfiguration('stock-ext').get<boolean>('editorDisguise.enabled') || false;
    this._disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('stock-ext.editorDisguise')) {
          this._enabled = vscode.workspace.getConfiguration('stock-ext').get<boolean>('editorDisguise.enabled') || false;
          if (!this._enabled) {
            this._heldStocks = [];
          }
          this._onDidChangeCodeLenses.fire();
        }
      })
    );
  }

  async refresh() {
    if (!this._enabled) {
      this._heldStocks = [];
      this._onDidChangeCodeLenses.fire();
      return;
    }
    this._heldStocks = await getHeldStocks();
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] {
    if (!this._enabled || !this._heldStocks.length) return [];

    const config = vscode.workspace.getConfiguration('stock-ext');
    const lineMode = config.get<string>('editorDisguise.lineMode') || 'rotate';
    const maxCodeLens = config.get<number>('editorDisguise.maxCodeLens') || 8;
    const stocks = this._heldStocks.slice(0, maxCodeLens);

    const lenses: vscode.CodeLens[] = [];

    if (lineMode === 'pinned') {
      if (stocks.length > 0) {
        const line = 0;
        for (let i = 0; i < stocks.length && i < document.lineCount; i++) {
          const s = stocks[i];
          const alias = getAlias(s.code);
          const changeStr = formatRate(s.changeRate);
          const priceStr = formatPrice(s.price);
          const text = `${alias}  ${priceStr}  ${changeStr}`;
          lenses.push(new vscode.CodeLens(new vscode.Range(i, 0, i, 0), {
            title: text,
            command: 'stock-ext.openStockDetail',
            arguments: [s],
            tooltip: `${s.name}\n现价: ${priceStr}\n涨跌: ${changeStr}\n${s.costPrice ? '成本: ' + formatPrice(s.costPrice) + ' | 盈亏: ' + formatRate(s.profitPercent || 0) : ''}`,
          }));
        }
      }
    } else {
      for (let i = 0; i < document.lineCount && i < stocks.length; i++) {
        const s = stocks[i % stocks.length];
        const alias = getAlias(s.code);
        const changeStr = formatRate(s.changeRate);
        const priceStr = formatPrice(s.price);
        lenses.push(new vscode.CodeLens(new vscode.Range(i, 0, i, 0), {
          title: `${alias}  ${priceStr}  ${changeStr}`,
          command: 'stock-ext.openStockDetail',
          arguments: [s],
        }));
      }
    }
    return lenses;
  }

  dispose() {
    this._disposables.forEach(d => d.dispose());
  }
}
