import * as vscode from 'vscode';
import { StatusBarManager } from './statusbar/statusBar';
import { ProxyService } from './webview/proxyService';
import { StockCenterViewProvider } from './webview/stockCenterProvider';
import { NewsPanelViewProvider } from './webview/newsPanelProvider';
import { StockReportViewProvider } from './webview/stockReportProvider';
import { registerCommands } from './registerCommand';
import { registerAiParticipant } from './ai/participant';
import { registerAiTools } from './ai/registerTools';
import { setProxyPort } from './shared/proxyPort';
import { EditorDisguiseProvider } from './editor/editorDisguiseProvider';
import { checkReminders } from './shared/remindNotification';

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel('Stock Center');
  output.appendLine('Stock Center activated');
  const statusBarManager = new StatusBarManager();

  const proxyService = new ProxyService(19101);
  proxyService.start().then((port) => {
    setProxyPort(port);
    console.log(`[StockExt] Proxy server running at http://localhost:${port}`);
  }).catch((e) => {
    console.log(`[StockExt] Proxy start failed: ${e?.message}`);
  });

  const stockCenterProvider = new StockCenterViewProvider(context.extensionUri, output);
  const newsPanelProvider = new NewsPanelViewProvider(context.extensionUri);
  const reportPanelProvider = new StockReportViewProvider(context.extensionUri);

  const editorDisguiseProvider = new EditorDisguiseProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider({ pattern: '**/*' }, editorDisguiseProvider),
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(StockCenterViewProvider.viewType, stockCenterProvider, { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.window.registerWebviewViewProvider(NewsPanelViewProvider.viewType, newsPanelProvider, { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.window.registerWebviewViewProvider(StockReportViewProvider.viewType, reportPanelProvider, { webviewOptions: { retainContextWhenHidden: true } }),
  );

  stockCenterProvider.setReportPanel(reportPanelProvider);

  registerCommands(context, statusBarManager, proxyService, editorDisguiseProvider);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('stock-ext.opacity')) {
        const opacity = vscode.workspace.getConfiguration('stock-ext').get<number>('opacity') || 1;
        stockCenterProvider.updateOpacity(opacity);
        newsPanelProvider.updateOpacity(opacity);
        reportPanelProvider.updateOpacity(opacity);
      }
      if (e.affectsConfiguration('stock-ext.voiceBroadcast')) {
        const on = vscode.workspace.getConfiguration('stock-ext').get<boolean>('voiceBroadcast') || false;
        stockCenterProvider.updateVoice(on);
      }
      if (e.affectsConfiguration('stock-ext.theme')) {
        const theme = vscode.workspace.getConfiguration('stock-ext').get<string>('theme') || 'classic';
        stockCenterProvider.updateTheme(theme);
      }
      if (e.affectsConfiguration('stock-ext.riseColor') || e.affectsConfiguration('stock-ext.fallColor')) {
        stockCenterProvider.updateColors();
      }
      if (e.affectsConfiguration('stock-ext.interval')) {
        startRefreshTimer();
      }
      if (e.affectsConfiguration('stock-ext.hideStatusBar')) {
        const hidden = vscode.workspace.getConfiguration('stock-ext').get<boolean>('hideStatusBar') || false;
        statusBarManager.setHidden(hidden);
      }
    })
  );

  try {
    registerAiParticipant(context);
  } catch {}
  try {
    registerAiTools(context);
  } catch {}

  const config = vscode.workspace.getConfiguration('stock-ext');
  if (!config.get<boolean>('hideStatusBar')) {
    statusBarManager.start();
  }

  let refreshTimer: NodeJS.Timeout | undefined;
  function startRefreshTimer() {
    if (refreshTimer) clearInterval(refreshTimer);
    const cfg = vscode.workspace.getConfiguration('stock-ext');
    refreshTimer = setInterval(() => {
      const c = vscode.workspace.getConfiguration('stock-ext');
      const onlyA = c.get<boolean>('pollOnlyDuringAStockHours') || true;
      if (onlyA) {
        const now = new Date();
        const h = now.getUTCHours() + 8;
        const m = now.getUTCMinutes();
        const t = h * 100 + m;
        if (t < 900 || t > 1505) return;
      }
      editorDisguiseProvider.refresh();
      checkReminders();
    }, Math.max(3000, cfg.get<number>('interval') || 5000));
  }
  startRefreshTimer();

  context.subscriptions.push(
    { dispose: () => { if (refreshTimer) clearInterval(refreshTimer); } },
    { dispose: () => statusBarManager.dispose() },
    { dispose: () => proxyService.stop() },
    { dispose: () => editorDisguiseProvider.dispose() },
  );
}

export function deactivate() {}
