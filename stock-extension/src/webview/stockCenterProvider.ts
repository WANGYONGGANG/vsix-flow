import * as vscode from 'vscode';
import * as http from 'http';
import { getStockCenterHtml } from './stockCenterHtml';
import { getProxyPort } from '../shared/proxyPort';

function proxyGet(path: string): Promise<any> {
  return new Promise((resolve) => {
    http.get(`http://localhost:${getProxyPort()}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    }).on('error', (e) => { console.log(`[StockExt] proxyGet error ${path}: ${e.message}`); resolve(null); });
  });
}

export class StockCenterViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'stockExtView.home';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true, localResourceRoots: [this._extensionUri] };
    webviewView.webview.html = getStockCenterHtml(webviewView.webview.cspSource);

    const opacity = vscode.workspace.getConfiguration('stock-ext').get<number>('opacity') || 1;
    webviewView.webview.postMessage({ type: 'setOpacity', opacity });

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      console.log(`[StockExt] webview msg: ${JSON.stringify(msg)}`);
      if (msg.type === 'switchTab') {
        const data = await this.fetchTabData(msg.tab);
        console.log(`[StockExt] tabData ${msg.tab}: ${JSON.stringify(data)?.slice(0, 200)}`);
        webviewView.webview.postMessage({ type: 'tabData', tab: msg.tab, data });
      } else if (msg.type === 'openUrl' && msg.url) {
        vscode.env.openExternal(vscode.Uri.parse(msg.url));
      } else if (msg.type === 'addWatch') {
        const code = await vscode.window.showInputBox({ prompt: '输入股票代码 (如 600519 或 sh000001)', placeHolder: '600519' });
        if (code) {
          await this.addWatch(code.trim());
          webviewView.webview.postMessage({ type: 'refreshTab', tab: 'watchlist' });
        }
      } else if (msg.type === 'delWatch' && msg.code) {
        await this.delWatch(msg.code);
        webviewView.webview.postMessage({ type: 'refreshTab', tab: 'watchlist' });
      } else if (msg.type === 'fetchKline' && msg.code) {
        const period = msg.period || 'day';
        if (period === 'intraday') {
          const r = await proxyGet(`/api/intraday?code=${msg.code}`);
          webviewView.webview.postMessage({ type: 'intradayData', code: msg.code, data: r?.data || {} });
        } else {
          const r = await proxyGet(`/api/kline?code=${msg.code}&period=${period}&fq=1`);
          webviewView.webview.postMessage({ type: 'klineData', code: msg.code, data: r?.data?.klines || [] });
        }
      } else if (msg.type === 'fetchStockNews' && msg.code) {
        const r = await proxyGet(`/api/stock-news?code=${msg.code}&pageSize=20`);
        webviewView.webview.postMessage({ type: 'stockNewsData', code: msg.code, data: r?.data?.list || [] });
      } else if (msg.type === 'fetchStockNotice' && msg.code) {
        const r = await proxyGet(`/api/stock-notice?code=${msg.code}`);
        webviewView.webview.postMessage({ type: 'stockNoticeData', code: msg.code, data: r?.data?.list || [] });
      } else if (msg.type === 'fetchStockEssential' && msg.code) {
        const r = await proxyGet(`/api/stock-essential?code=${msg.code}`);
        webviewView.webview.postMessage({ type: 'stockEssentialData', code: msg.code, data: r?.data?.info || null });
      } else if (msg.type === 'fetchQuote' && msg.code) {
        const r = await proxyGet(`/api/quote?codes=${msg.code}`);
        const diff = r?.data?.diff || [];
        if (diff.length) webviewView.webview.postMessage({ type: 'quoteData', code: msg.code, data: diff[0] });
      }
    });
  }

  private async fetchTabData(tab: string): Promise<any> {
    switch (tab) {
      case 'market_overview': {
        const r = await proxyGet('/api/market-overview');
        return { indices: r?.data?.diff || [] };
      }
      case 'fundFlow': {
        const hy = await proxyGet('/api/bkzj?t=2');
        const gn = await proxyGet('/api/bkzj?t=3');
        return { industry: hy?.data?.diff || [], concept: gn?.data?.diff || [] };
      }
      case 'em_news': {
        return await proxyGet('/api/em-news?page=1&pageSize=50') || { data: { list: [] } };
      }
      case 'realtime_news': {
        return await proxyGet('/api/em-news?page=1&pageSize=60') || { data: { list: [] } };
      }
      case 'sector_limit': {
        return await proxyGet('/api/sector-limit');
      }
      case 'limit_leader': {
        return await proxyGet('/api/zt-pool');
      }
      case 'strong_sector': {
        return await proxyGet('/api/zt-pool');
      }
      case 'dragon_tiger': {
        return await proxyGet('/api/lhb');
      }
      case 'yesterday_limit': {
        return await proxyGet('/api/zt-pool');
      }
      case 'alert': {
        return await proxyGet('/api/stock-changes');
      }
      case 'hot_stocks': {
        return await proxyGet('/api/hot-stocks');
      }
      case 'watchlist': {
        const cfg = vscode.workspace.getConfiguration('stock-ext');
        const portfolio: any = cfg.get('stockPortfolio') || {};
        const groups: { codes?: string[] }[] = portfolio.groups && portfolio.groups.length ? portfolio.groups : [{ codes: ['sh000001', 'sh601899'] }];
        const codes = groups.flatMap((g) => g.codes || []);
        if (!codes.length) return { indices: [] };
        return { indices: (await proxyGet(`/api/quote?codes=${codes.join(',')}`))?.data?.diff || [] };
      }
      default:
        return null;
    }
  }

  private async addWatch(code: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('stock-ext');
    const portfolio: any = config.get('stockPortfolio') || {};
    const groups = portfolio.groups && portfolio.groups.length ? portfolio.groups : [{ name: '默认分组', codes: ['sh000001', 'sh601899'] }];
    if (groups[0].codes.indexOf(code) === -1) {
      groups[0].codes.push(code);
      await config.update('stockPortfolio', { ...portfolio, groups }, vscode.ConfigurationTarget.Global);
    }
  }

  private async delWatch(code: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('stock-ext');
    const portfolio: any = config.get('stockPortfolio') || {};
    const groups = portfolio.groups && portfolio.groups.length
      ? portfolio.groups
      : [{ name: '默认分组', codes: ['sh000001', 'sh601899'] }];
    for (const g of groups) {
      g.codes = g.codes.filter((c: string) => c !== code);
    }
    await config.update('stockPortfolio', { ...portfolio, groups }, vscode.ConfigurationTarget.Global);
  }
}
