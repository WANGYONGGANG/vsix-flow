import * as vscode from 'vscode';
import * as http from 'http';
import { getStockCenterHtml } from './stockCenterHtml';
import { getProxyPort } from '../shared/proxyPort';
import { StockReportViewProvider } from './stockReportProvider';

function proxyGet(path: string, timeoutMs = 10000): Promise<any> {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${getProxyPort()}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    }).on('error', (e) => { console.log(`[StockExt] proxyGet error ${path}: ${e.message}`); resolve(null); });
    setTimeout(() => { req.destroy(); resolve(null); }, timeoutMs);
  });
}

export class StockCenterViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'stockExtView.home';
  private _view?: vscode.WebviewView;
  private _reportPanel?: StockReportViewProvider;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _output?: vscode.OutputChannel
  ) {}

  setReportPanel(panel: StockReportViewProvider) {
    this._reportPanel = panel;
  }

  private _pendingDetail?: { code: string; name?: string };

  openDetail(code: string, name?: string) {
    vscode.commands.executeCommand('stock-ext.openStockCenter');
    if (this._view) {
      this._view.show(true);
      // 延迟发送，确保 webview 已可见并准备好接收消息
      setTimeout(() => {
        this._view?.webview.postMessage({ type: 'openDetail', code, name: name || '' });
      }, 150);
    } else {
      this._pendingDetail = { code, name };
    }
  }

  private log(msg: string) {
    if (this._output) { this._output.appendLine(msg); } else { console.log(msg); }
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true, localResourceRoots: [this._extensionUri] };
    const scriptUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview', 'centerView.js'));
    const html = getStockCenterHtml(webviewView.webview.cspSource, scriptUri.toString(), getProxyPort());
    this.log(`[resolve] html length=${html.length}`);
    webviewView.webview.html = html;

    const opacity = vscode.workspace.getConfiguration('stock-ext').get<number>('opacity') || 1;
    webviewView.webview.postMessage({ type: 'setOpacity', opacity });
    const voiceBroadcast = vscode.workspace.getConfiguration('stock-ext').get<boolean>('voiceBroadcast') || false;
    webviewView.webview.postMessage({ type: 'setVoice', on: voiceBroadcast });
    const theme = vscode.workspace.getConfiguration('stock-ext').get<string>('theme') || 'classic';
    webviewView.webview.postMessage({ type: 'setTheme', theme });
    this.updateColors();

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      this.log(`[webview msg] ${JSON.stringify(msg)?.slice(0, 300)}`);
      if (msg.type === '__ready') {
        this.log('[WEBVIEW] script loaded OK');
        if (this._pendingDetail) {
          webviewView.webview.postMessage({ type: 'openDetail', code: this._pendingDetail.code, name: this._pendingDetail.name || '' });
          this._pendingDetail = undefined;
        }
      } else if (msg.type === '__error') {
        this.log(`[WEBVIEW ERROR] ${msg.message} at line ${msg.line}`);
      } else if (msg.type === 'switchTab') {
        const data = await this.fetchTabData(msg.tab);
        this.log(`[tabData ${msg.tab}] keys=${data ? Object.keys(data).join(',') : 'null'}`);
        webviewView.webview.postMessage({ type: 'tabData', tab: msg.tab, data });
      } else if (msg.type === 'openUrl' && msg.url) {
        vscode.env.openExternal(vscode.Uri.parse(msg.url));
      } else if (msg.type === 'addWatch' && msg.code) {
        await this.addWatch(msg.code);
        webviewView.webview.postMessage({ type: 'refreshTab', tab: 'watchlist' });
      } else if (msg.type === 'isInWatch' && msg.code) {
        const inWatch = await this.isInWatch(String(msg.code));
        webviewView.webview.postMessage({ type: 'inWatchResult', code: String(msg.code), inWatch });
      } else if (msg.type === 'stockSearch' && msg.kw) {
        const r = await proxyGet(`/api/search?kw=${encodeURIComponent(String(msg.kw))}`);
        webviewView.webview.postMessage({ type: 'stockSearchResult', list: r?.data?.list || [] });
      } else if (msg.type === 'delWatch' && msg.code) {
        await this.delWatch(msg.code);
        webviewView.webview.postMessage({ type: 'refreshTab', tab: 'watchlist' });
      } else if (msg.type === 'fetchKline' && msg.code) {
        const period = msg.period || 'day';
        if (period === 'chips') {
          const r = await proxyGet(`/api/kline?code=${msg.code}&period=day&fq=1`);
          webviewView.webview.postMessage({ type: 'klineData', code: msg.code, data: r?.data?.klines || [], period: 'chips' });
        } else if (period === 'intraday') {
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
      } else if (msg.type === 'fetchStockFinance' && msg.code) {
        const r = await proxyGet(`/api/stock-finance?code=${msg.code}`);
        webviewView.webview.postMessage({ type: 'stockFinanceData', code: msg.code, data: r?.data || null });
      } else if (msg.type === 'fetchStockProfile' && msg.code) {
        webviewView.webview.postMessage({ type: 'stockProfileData', code: msg.code, data: { _sub: 'essential' } });
      } else if (msg.type === 'fetchStockProfileSub' && msg.code) {
        const r = await proxyGet(`/api/stock-profile?code=${msg.code}&sub=${msg.sub}`);
        webviewView.webview.postMessage({ type: 'stockProfileSubData', code: msg.code, data: r?.data || null });
      } else if (msg.type === 'fetchQuote' && msg.code) {
        const r = await proxyGet(`/api/quote?codes=${msg.code}`);
        const diff = r?.data?.diff || [];
        if (diff.length) webviewView.webview.postMessage({ type: 'quoteData', code: msg.code, data: diff[0] });
      } else if (msg.type === 'moveWatch' && msg.code) {
        await this.moveWatch(msg.code, msg.dir || 'up');
        webviewView.webview.postMessage({ type: 'refreshTab', tab: 'watchlist' });
      } else if (msg.type === 'reorderWatch' && Array.isArray(msg.codes)) {
        await this.reorderWatch(msg.codes);
        webviewView.webview.postMessage({ type: 'refreshTab', tab: 'watchlist' });
      } else if (msg.type === 'toggleStatusBarStock' && msg.code) {
        await this.toggleStatusBarStock(String(msg.code));
        webviewView.webview.postMessage({ type: 'refreshTab', tab: 'watchlist' });
      } else if (msg.type === 'setConfig' && msg.key) {
        const config = vscode.workspace.getConfiguration('stock-ext');
        await config.update(msg.key, msg.val, vscode.ConfigurationTarget.Global);
        const keys = ['interval', 'pollOnlyDuringAStockHours', 'riseColor', 'fallColor', 'hideStatusBar', 'hideStatusBarIcon', 'opacity', 'voiceBroadcast', 'theme', 'statusBarStock'];
        const configValues: Record<string, any> = {};
        keys.forEach(k => { configValues[k] = config.get(k); });
        const aiModels = config.get<any[]>('aiModels') || [];
        const activeModelId = config.get<string>('activeAIModelId') || '';
        webviewView.webview.postMessage({ type: 'settingsData', data: { config: configValues, aiModels, activeModelId } });
        if (msg.key === 'opacity') this.updateOpacity(Number(msg.val));
        if (msg.key === 'voiceBroadcast') this.updateVoice(!!msg.val);
        if (msg.key === 'theme') this.updateTheme(String(msg.val));
        if (msg.key === 'riseColor' || msg.key === 'fallColor') this.updateColors();
      } else if (msg.type === 'addModel' && msg.model) {
        const config = vscode.workspace.getConfiguration('stock-ext');
        const models = config.get<any[]>('aiModels') || [];
        models.push(msg.model);
        await config.update('aiModels', models, vscode.ConfigurationTarget.Global);
        const activeModelId = config.get<string>('activeAIModelId') || '';
        webviewView.webview.postMessage({ type: 'modelsUpdated', aiModels: models, activeModelId });
      } else if (msg.type === 'delModel' && msg.id) {
        const config = vscode.workspace.getConfiguration('stock-ext');
        const models = (config.get<any[]>('aiModels') || []).filter((m: any) => m.id !== msg.id);
        await config.update('aiModels', models, vscode.ConfigurationTarget.Global);
        let activeModelId = config.get<string>('activeAIModelId') || '';
        if (activeModelId === msg.id) { activeModelId = ''; await config.update('activeAIModelId', '', vscode.ConfigurationTarget.Global); }
        webviewView.webview.postMessage({ type: 'modelsUpdated', aiModels: models, activeModelId });
      } else if (msg.type === 'setActiveModel') {
        const config = vscode.workspace.getConfiguration('stock-ext');
        await config.update('activeAIModelId', msg.id || '', vscode.ConfigurationTarget.Global);
      } else if (msg.type === 'openModelConfig') {
        webviewView.webview.postMessage({ type: 'switchToTab', tab: 'settings' });
      } else if (msg.type === 'openReport') {
        try {
          await vscode.commands.executeCommand(`${StockReportViewProvider.viewType}.focus`);
        } catch (err: any) {
          this.log(`[openReport] focus failed: ${err?.message || err}`);
        }
        this._reportPanel?.refresh();
      } else if (msg.type === 'agentChat' && msg.text) {
        try {
          const lm = vscode.lm as any;
          if (lm && typeof lm.sendChatRequest === 'function') {
            const chatRequest = await lm.sendChatRequest(
              [{ role: 'user', content: msg.text }],
              {},
              new vscode.CancellationTokenSource().token
            );
            let result = '';
            for await (const chunk of chatRequest.text) {
              result += chunk;
            }
            webviewView.webview.postMessage({ type: 'agentResponse', text: result });
          } else {
            webviewView.webview.postMessage({ type: 'agentResponse', text: 'AI 模型暂不可用，请在设置中配置模型' });
          }
        } catch (err: any) {
          webviewView.webview.postMessage({ type: 'agentResponse', text: '错误: ' + (err.message || '请求失败') });
        }
      }
    });
  }

  private async fetchTabData(tab: string): Promise<any> {
    switch (tab) {
      case 'market_overview': {
        const r = await proxyGet('/api/market-overview');
        let detail: any = null;
        try { detail = await proxyGet('/api/market-overview-detail'); } catch {}
        return {
          diff: r?.data?.diff || [],
          distribution: detail?.data?.distribution || {},
          counts: detail?.data?.counts || {},
          trade: detail?.data?.trade || {},
          yesterdayZt: detail?.data?.yesterdayZt || {},
        };
      }
      case 'fundFlow': {
        const hy = await proxyGet('/api/sina-bkzj?fenlei=0');
        const gn = await proxyGet('/api/sina-bkzj?fenlei=1');
        return { industry: hy?.data?.list || [], concept: gn?.data?.list || [] };
      }
      case 'em_news': {
        return await proxyGet('/api/em-news-search?page=1&pageSize=50') || { data: { list: [] } };
      }
      case 'realtime_news': {
        return await proxyGet('/api/em-news?page=1&pageSize=60') || { data: { list: [] } };
      }
      case 'sector_limit': {
        const hy = await proxyGet('/api/sina-bkzj?fenlei=0');
        const gn = await proxyGet('/api/sina-bkzj?fenlei=1');
        return { industry: hy?.data?.list || [], concept: gn?.data?.list || [] };
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
        if (!codes.length) return { indices: [], statusBarCodes: [] };
        const indices = (await proxyGet(`/api/quote?codes=${codes.join(',')}`))?.data?.diff || [];
        const alerts: any = {};
        try {
          const ar = await proxyGet('/api/stock-changes');
          const alist: any[] = ar?.data?.list || [];
          const chgTypes: Record<number, string> = { 4: '秒板', 8: '封板', 16: '打开涨停', 32: '大笔买入', 64: '大笔卖出', 128: '大笔买入', 8193: '火箭发射', 8194: '快速反弹', 8201: '加速上涨', 8202: '高台跳水', 8203: '加速下跌', 8204: '大笔卖出', 8207: '大幅上升', 8208: '大幅下降', 8209: '封涨停', 8210: '封跌停', 8211: '打开涨停', 8212: '打开跌停', 8213: '创历史新高', 8214: '创历史新低', 8215: '竞价上涨', 8216: '竞价下跌' };
          for (const a of alist) {
            const key = String(a.c || '');
            if (!key) continue;
            const t = a.t;
            const label = chgTypes[t] || ('类型' + t);
            const isUp = t === 4 || t === 8 || t === 32 || t === 128 || t === 8193 || t === 8194 || t === 8201 || t === 8207 || t === 8209 || t === 8211 || t === 8213 || t === 8215;
            if (!alerts[key]) alerts[key] = [];
            alerts[key].push({ t, label, isUp, info: a.i || '' });
          }
        } catch {}
        return { indices, alerts, statusBarCodes: cfg.get<string[]>('statusBarStock') || [] };
      }
      case 'settings': {
        const config = vscode.workspace.getConfiguration('stock-ext');
        const keys = ['interval', 'pollOnlyDuringAStockHours', 'riseColor', 'fallColor', 'hideStatusBar', 'hideStatusBarIcon', 'opacity', 'voiceBroadcast', 'theme'];
        const configValues: Record<string, any> = {};
        keys.forEach(k => { configValues[k] = config.get(k); });
        const aiModels = config.get<any[]>('aiModels') || [];
        const activeModelId = config.get<string>('activeAIModelId') || '';
        return { config: configValues, aiModels, activeModelId };
      }
      default:
        return null;
    }
  }

  private normCode(code: string): string {
    const c = String(code || '').trim().toLowerCase().replace(/^(sh|sz|bj)/, '');
    if (/^(60|68|90|11|13|50|56|51|58)/.test(c)) return `sh${c}`;
    if (/^(00|30|20|12|15|16|18|159)/.test(c)) return `sz${c}`;
    if (/^(43|83|87|92|88)/.test(c)) return `bj${c}`;
    return `sh${c}`;
  }

  private async addWatch(code: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('stock-ext');
    const portfolio: any = config.get('stockPortfolio') || {};
    const groups = portfolio.groups && portfolio.groups.length ? portfolio.groups : [{ name: '默认分组', codes: ['sh000001', 'sh601899'] }];
    const norm = this.normCode(code);
    if (groups[0].codes.map((c: string) => this.normCode(c)).indexOf(norm) === -1) {
      groups[0].codes.push(code.trim());
      await config.update('stockPortfolio', { ...portfolio, groups }, vscode.ConfigurationTarget.Global);
    }
  }

  private async isInWatch(code: string): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('stock-ext');
    const portfolio: any = config.get('stockPortfolio') || {};
    const groups = portfolio.groups && portfolio.groups.length ? portfolio.groups : [];
    const norm = this.normCode(code);
    return groups.some((g: any) => (g.codes || []).some((c: string) => this.normCode(c) === norm));
  }

  private async delWatch(code: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('stock-ext');
    const portfolio: any = config.get('stockPortfolio') || {};
    const groups = portfolio.groups && portfolio.groups.length
      ? portfolio.groups
      : [{ name: '默认分组', codes: ['sh000001', 'sh601899'] }];
    const norm = this.normCode(code);
    for (const g of groups) {
      g.codes = g.codes.filter((c: string) => this.normCode(c) !== norm);
    }
    await config.update('stockPortfolio', { ...portfolio, groups }, vscode.ConfigurationTarget.Global);
  }

  private async moveWatch(code: string, dir: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('stock-ext');
    const portfolio: any = config.get('stockPortfolio') || {};
    const groups = portfolio.groups && portfolio.groups.length
      ? portfolio.groups
      : [{ name: '默认分组', codes: ['sh000001', 'sh601899'] }];
    const g = groups[0];
    const codes = g.codes || [];
    const idx = codes.indexOf(code);
    if (idx < 0) return;
    codes.splice(idx, 1);
    if (dir === 'top') codes.unshift(code);
    else if (dir === 'bottom') codes.push(code);
    else if (dir === 'up') codes.splice(Math.max(0, idx - 1), 0, code);
    else if (dir === 'down') codes.splice(Math.min(codes.length, idx + 1), 0, code);
    else codes.splice(idx, 0, code);
    await config.update('stockPortfolio', { ...portfolio, groups }, vscode.ConfigurationTarget.Global);
  }

  private async reorderWatch(codes: string[]): Promise<void> {
    const config = vscode.workspace.getConfiguration('stock-ext');
    const portfolio: any = config.get('stockPortfolio') || {};
    const groups = portfolio.groups && portfolio.groups.length
      ? portfolio.groups
      : [{ name: '默认分组', codes: ['sh000001', 'sh601899'] }];
    if (!groups[0]) groups[0] = { codes: [] };
    groups[0].codes = codes;
    await config.update('stockPortfolio', { ...portfolio, groups }, vscode.ConfigurationTarget.Global);
  }

  private async toggleStatusBarStock(code: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('stock-ext');
    const list: string[] = config.get('statusBarStock') || ['sh000001'];
    const idx = list.indexOf(code);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(code);
    }
    if (!list.length) list.push('sh000001');
    await config.update('statusBarStock', list, vscode.ConfigurationTarget.Global);
  }

  updateOpacity(opacity: number) {
    this._view?.webview.postMessage({ type: 'setOpacity', opacity });
  }

  updateVoice(on: boolean) {
    this._view?.webview.postMessage({ type: 'setVoice', on });
  }

  updateTheme(theme: string) {
    this._view?.webview.postMessage({ type: 'setTheme', theme });
  }

  updateColors(riseColor?: string, fallColor?: string) {
    const config = vscode.workspace.getConfiguration('stock-ext');
    this._view?.webview.postMessage({
      type: 'setColors',
      riseColor: riseColor ?? config.get<string>('riseColor') ?? '',
      fallColor: fallColor ?? config.get<string>('fallColor') ?? '',
    });
  }
}
