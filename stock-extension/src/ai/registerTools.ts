import * as vscode from 'vscode';
import { fetchStockQuotes, fetchFundQuotes, fetchEmNews, fetchSectorBoards, fetchKline } from '../service/eastmoney';

export function registerAiTools(context: vscode.ExtensionContext) {
  const toolRegistrations: vscode.Disposable[] = [];

  try {
    if (typeof vscode.lm.registerTool === 'function') {
      toolRegistrations.push(
        vscode.lm.registerTool('stock_get_watchlist', {
          async invoke(options, token) {
            const config = vscode.workspace.getConfiguration('stock-ext');
            const stockPortfolio: any = config.get('stockPortfolio') || {};
            const fundPortfolio: any = config.get('fundPortfolio') || {};
            const stockCodes = (stockPortfolio.groups || []).flatMap((g: any) => g.codes || []);
            const fundCodes = (fundPortfolio.groups || []).flatMap((g: any) => g.codes || []);
            const stockQuotes = await fetchStockQuotes(stockCodes);
            const fundData = await fetchFundQuotes(fundCodes);
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(JSON.stringify({ stocks: stockQuotes, funds: fundData }, null, 2)),
            ]);
          },
        }),
        vscode.lm.registerTool('stock_get_quote', {
          async invoke(options, token) {
            const code = (options as any).input?.code || '';
            const type = (options as any).input?.type || 'stock';
            if (!code) return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart('缺少代码参数')]);
            try {
              if (type === 'fund') {
                const data = await fetchFundQuotes([code]);
                return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(JSON.stringify(data[0] || {}, null, 2))]);
              } else {
                const quotes = await fetchStockQuotes([code]);
                return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(JSON.stringify(quotes[0] || {}, null, 2))]);
              }
            } catch (err: any) {
              return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`获取失败: ${err.message}`)]);
            }
          },
        }),
        vscode.lm.registerTool('stock_get_holdings_cost', {
          async invoke(options, token) {
            const config = vscode.workspace.getConfiguration('stock-ext');
            const ledger: any = config.get('holdingsLedger') || {};
            return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(JSON.stringify(ledger, null, 2))]);
          },
        }),
        vscode.lm.registerTool('stock_get_flash_news', {
          async invoke(options, token) {
            const limit = (options as any).input?.limit || 10;
            const news = await fetchEmNews(1, Math.min(limit, 50));
            return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(JSON.stringify(news.slice(0, limit), null, 2))]);
          },
        }),
        vscode.lm.registerTool('stock_get_stock_history', {
          async invoke(options, token) {
            const code = (options as any).input?.code || '';
            if (!code) return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart('缺少股票代码')]);
            try {
              const kline = await fetchKline(code, 'day');
              const csv = kline.slice(-60).map(k => `${k.time},${k.open},${k.high},${k.low},${k.close},${k.volume}`).join('\n');
              return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`日期,开盘,最高,最低,收盘,成交量\n${csv}`)]);
            } catch (err: any) {
              return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`获取失败: ${err.message}`)]);
            }
          },
        }),
        vscode.lm.registerTool('stock_get_sector_heat', {
          async invoke(options, token) {
            const sectors = await fetchSectorBoards();
            return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(JSON.stringify(sectors.slice(0, 20), null, 2))]);
          },
        }),
        vscode.lm.registerTool('stock_get_sector_board_quote', {
          async invoke(options, token) {
            const code = (options as any).input?.code || '';
            if (!code) return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart('缺少板块代码')]);
            try {
              const cleanCode = code.replace(/^(BK|bk)/, '');
              const quotes = await fetchStockQuotes([`bk${cleanCode}`]);
              return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(JSON.stringify(quotes[0] || {}, null, 2))]);
            } catch (err: any) {
              return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`获取失败: ${err.message}`)]);
            }
          },
        }),
        vscode.lm.registerTool('stock_get_community_mentions', {
          async invoke(options, token) {
            const keyword = (options as any).input?.keyword || '';
            return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`社区讨论功能开发中。关键词: ${keyword}`)]);
          },
        }),
        vscode.lm.registerTool('stock_open_chart', {
          async invoke(options, token) {
            const code = (options as any).input?.code || '';
            const type = (options as any).input?.type || 'stock';
            if (code) {
              vscode.commands.executeCommand('stock-ext.openStockDetail', code);
              return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`已打开 ${code} 的走势图`)]);
            }
            return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart('缺少代码参数')]);
          },
        }),
      );
    }
  } catch {}
  context.subscriptions.push(...toolRegistrations);
}
