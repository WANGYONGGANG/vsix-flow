import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
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
        let list = r?.data?.list || [];
        // 如果是全局搜索，也搜索期货
        if (msg.searchAll) {
          try {
            const futuresR = await proxyGet(`/api/futures-search?kw=${encodeURIComponent(String(msg.kw))}`);
            const futuresList = futuresR?.data?.list || [];
            list = [...list, ...futuresList];
          } catch {}
        }
        webviewView.webview.postMessage({ type: 'stockSearchResult', list });
        // 如果是搜索面板模式，也发送搜索面板结果
        if (msg.searchAll) {
          webviewView.webview.postMessage({ type: 'searchPanelResults', list });
        }
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
      } else if (msg.type === 'fetchFuturesQuote' && msg.code) {
        const r = await proxyGet(`/api/futures-quote?code=${encodeURIComponent(msg.code)}`);
        webviewView.webview.postMessage({ type: 'quoteData', code: msg.code, data: r?.data || {} });
      } else if (msg.type === 'fetchFuturesKline' && msg.code) {
        const period = msg.period || 'day';
        const r = await proxyGet(`/api/futures-kline?code=${encodeURIComponent(msg.code)}&period=${period}`);
        webviewView.webview.postMessage({ type: 'klineData', code: msg.code, data: r?.data?.klines || [], period });
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
        const r = await proxyGet(`/api/quote-detail?code=${msg.code}`);
        const diff = r?.data?.diff || [];
        if (diff.length) webviewView.webview.postMessage({ type: 'quoteData', code: msg.code, data: diff[0] });
      } else if (msg.type === 'fetchFundFlow' && msg.code) {
        console.log(`[StockExt] fetchFundFlow: code=${msg.code}`);
        const r = await proxyGet(`/api/stock-fflow-day?code=${msg.code}&lmt=30`);
        const list = r?.data?.list || [];
        console.log(`[StockExt] fetchFundFlow result: ${list.length} items`);
        webviewView.webview.postMessage({ type: 'fundFlowData', code: msg.code, data: list });
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
          const config = vscode.workspace.getConfiguration('stock-ext');
          const aiModels = config.get<any[]>('aiModels') || [];
          const activeModelId = msg.modelId || config.get<string>('activeAIModelId') || '';
          const activeModel = aiModels.find((m: any) => m.id === activeModelId) || aiModels[0];
          
          if (!activeModel || !activeModel.baseURL || !activeModel.apiKey || !activeModel.model) {
            webviewView.webview.postMessage({ type: 'agentResponse', text: '⚠️ 尚未配置 AI 模型，请前往设置页配置模型。配置后即可使用 AI 对话功能。' });
            return;
          }

          let prompt = msg.text;
          if (msg.text === '/summary') {
            prompt = await this.buildSummaryPrompt();
          } else if (msg.text === '/portfolio') {
            prompt = await this.buildPortfolioPrompt();
          }

          const result = await this.callAIChat(activeModel, prompt);
          webviewView.webview.postMessage({ type: 'agentResponse', text: result });
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
        // 加载分时 sparkline
        const sparkMap: Record<string, number[]> = {};
        await Promise.all(codes.slice(0, 15).map(async (code) => {
          try {
            const intr = await proxyGet(`/api/intraday?code=${encodeURIComponent(code)}`);
            const mins: string[] = intr?.data?.minutes || [];
            if (mins.length) {
              sparkMap[code] = mins.map((m: string) => Number(m.split(',')[1]) || 0);
            }
          } catch {}
        }));
        return { indices, alerts, statusBarCodes: cfg.get<string[]>('statusBarStock') || [], sparks: sparkMap };
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
    const c = String(code || '').trim().toLowerCase();
    // 期货代码：f_ 前缀直接返回
    if (c.startsWith('f_')) return c;
    // 已有 sh/sz/bj 前缀的保留原样
    if (/^(sh|sz|bj)\d/.test(c)) return c;
    const noPrefix = c.replace(/^(sh|sz|bj)/, '');
    if (/^(60|68|90|11|13|50|56|51|58)/.test(noPrefix)) return `sh${noPrefix}`;
    if (/^(00|30|20|12|15|16|18|159)/.test(noPrefix)) return `sz${noPrefix}`;
    if (/^(43|83|87|92|88)/.test(noPrefix)) return `bj${noPrefix}`;
    // 期货代码：字母开头且非 sh/sz/bj（如 ao2609、IF2608）
    if (/^[a-z]/.test(noPrefix)) return 'f_' + noPrefix;
    return `sh${noPrefix}`;
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
    const norm = this.normCode(code);
    const idx = list.findIndex(c => this.normCode(c) === norm);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(norm);
    }
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

  private async buildSummaryPrompt(): Promise<string> {
    const r = await proxyGet('/api/em-news?page=1&pageSize=60');
    const list = r?.data?.list || [];
    const lines = list.slice(0, 15).map((n: any, i: number) => `${i + 1}. [${n.showtime || n.time || ''}] ${n.title || ''}`).join('\n');
    return `最近市场快讯：\n${lines || '(暂无数据)'}\n\n请提炼关键信息，帮我解读今日市场情绪。`;
  }

  private async buildPortfolioPrompt(): Promise<string> {
    const config = vscode.workspace.getConfiguration('stock-ext');
    const portfolio: any = config.get('stockPortfolio') || {};
    const groups: { codes?: string[] }[] = portfolio.groups && portfolio.groups.length ? portfolio.groups : [{ codes: [] }];
    const codes = groups.flatMap((g) => g.codes || []);
    if (!codes.length) return '我的自选股有哪些？请提示我添加自选股。';
    
    const r = await proxyGet(`/api/quote?codes=${codes.join(',')}`);
    const diff = r?.data?.diff || [];
    const lines = diff.map((d: any) => {
      const name = d.f14 || '';
      const code = d.f12 || '';
      const price = d.f3 || 0;
      const changeRate = d.f4 || 0;
      const sign = changeRate >= 0 ? '+' : '';
      return `- ${name}(${code})：${price} ${sign}${changeRate.toFixed(2)}%`;
    }).join('\n');
    return `这是我当前的自选股行情：\n${lines || '(暂无数据)'}\n\n请给出点评与近期关注点。`;
  }

  private async callAIChat(model: { baseURL: string; apiKey: string; model: string; temperature?: number }, text: string): Promise<string> {
    const baseURL = model.baseURL.replace(/\/+$/, '');
    const upstream = `${baseURL}/chat/completions`;
    
    const messages = [
      { role: 'system', content: '你是 StockAI，一个 A 股行情分析助手。回答简洁，不要提供具体投资建议，使用中文。' },
      { role: 'user', content: text }
    ];
    
    const payload = JSON.stringify({
      model: model.model,
      messages,
      stream: false,
      temperature: model.temperature ?? 0.7,
    });

    return new Promise<string>((resolve, reject) => {
      const urlObj = new URL(upstream);
      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`,
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 120_000,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              reject(new Error(String(json.error)));
            } else {
              const content = json.choices?.[0]?.message?.content || '';
              resolve(content || '(无响应)');
            }
          } catch (e) {
            reject(new Error('解析响应失败'));
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')); });
      req.write(payload);
      req.end();
    });
  }
}
