import * as vscode from 'vscode';
import { fetchStockQuotes } from '../service/eastmoney';
import type { StockItem } from '../shared/types';
import { formatPrice, formatRate } from '../shared/utils';

export interface HeldStockDisplay {
  code: string;
  name: string;
  price: number;
  changeRate: number;
  costPrice?: number;
  profit?: number;
  profitPercent?: number;
}

export async function getHeldStocks(): Promise<HeldStockDisplay[]> {
  const config = vscode.workspace.getConfiguration('stock-ext');
  const disguiseStocks: string[] = config.get('editorDisguise.stocks') || [];
  const ledger: Record<string, { cost: number; amount: number }> = config.get('holdingsLedger') || {};
  let codes: string[] = [];
  if (disguiseStocks.length) {
    codes = disguiseStocks;
  } else {
    codes = Object.keys(ledger);
  }
  if (!codes.length) return [];

  const quotes = await fetchStockQuotes(codes);
  return quotes.map((q: StockItem) => {
    const holding = ledger[q.code];
    const cost = holding?.cost || 0;
    const profit = cost > 0 ? q.price - cost : 0;
    const profitPercent = cost > 0 ? (profit / cost) * 100 : 0;
    return {
      code: q.code,
      name: q.name || q.code,
      price: q.price,
      changeRate: q.changeRate,
      costPrice: cost > 0 ? cost : undefined,
      profit: cost > 0 ? profit : undefined,
      profitPercent: cost > 0 ? profitPercent : undefined,
    };
  });
}

export function getAlias(code: string): string {
  const config = vscode.workspace.getConfiguration('stock-ext');
  const aliases: Record<string, string> = config.get('editorDisguise.aliases') || {};
  return aliases[code] || code.replace(/^(sh|sz|bj)/, '').toUpperCase();
}
