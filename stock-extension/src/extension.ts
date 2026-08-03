import * as vscode from 'vscode';
import { StatusBarManager } from './statusbar/statusBar';
import { ProxyService } from './webview/proxyService';
import { StockCenterViewProvider } from './webview/stockCenterProvider';
import { StockAgentViewProvider } from './webview/stockAgentProvider';
import { NewsPanelViewProvider } from './webview/newsPanelProvider';
import { registerCommands } from './registerCommand';
import { registerAiParticipant } from './ai/participant';
import { registerAiTools } from './ai/registerTools';
import { setProxyPort } from './shared/proxyPort';
import { EditorDisguiseProvider } from './editor/editorDisguiseProvider';
import { checkReminders } from './shared/remindNotification';

export function activate(context: vscode.ExtensionContext) {
  const statusBarManager = new StatusBarManager();

  const proxyService = new ProxyService(19101);
  proxyService.start().then((port) => {
    setProxyPort(port);
    console.log(`[StockExt] Proxy server running at http://localhost:${port}`);
  }).catch((e) => {
    console.log(`[StockExt] Proxy start failed: ${e?.message}`);
  });

  const stockCenterProvider = new StockCenterViewProvider(context.extensionUri);
  const stockAgentProvider = new StockAgentViewProvider();
  const newsPanelProvider = new NewsPanelViewProvider();

  const editorDisguiseProvider = new EditorDisguiseProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider({ pattern: '**/*' }, editorDisguiseProvider),
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(StockCenterViewProvider.viewType, stockCenterProvider, { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.window.registerWebviewViewProvider(StockAgentViewProvider.viewType, stockAgentProvider, { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.window.registerWebviewViewProvider(NewsPanelViewProvider.viewType, newsPanelProvider, { webviewOptions: { retainContextWhenHidden: true } }),
  );

  registerCommands(context, statusBarManager, proxyService, editorDisguiseProvider);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('stock-ext.opacity')) {
        const opacity = vscode.workspace.getConfiguration('stock-ext').get<number>('opacity') || 1;
        stockCenterProvider.updateOpacity(opacity);
        newsPanelProvider.updateOpacity(opacity);
        stockAgentProvider.updateOpacity(opacity);
      }
      if (e.affectsConfiguration('stock-ext.voiceBroadcast')) {
        const on = vscode.workspace.getConfiguration('stock-ext').get<boolean>('voiceBroadcast') || false;
        stockCenterProvider.updateVoice(on);
      }
    })
  );

  try {
    registerAiParticipant(context);
  } catch {}
  try {
    registerAiTools(context);
  } catch {}

  editorDisguiseProvider.refresh();

  const config = vscode.workspace.getConfiguration('stock-ext');
  if (!config.get<boolean>('hideStatusBar')) {
    statusBarManager.start();
  }

  const refreshInterval = setInterval(() => {
    const cfg = vscode.workspace.getConfiguration('stock-ext');
    const onlyA = cfg.get<boolean>('pollOnlyDuringAStockHours') || false;
    if (onlyA) {
      const now = new Date();
      const h = now.getUTCHours() + 8;
      const m = now.getUTCMinutes();
      const t = h * 100 + m;
      if (t < 900 || t > 1505) return;
    }
    editorDisguiseProvider.refresh();
    checkReminders();
  }, Math.max(3000, config.get<number>('interval') || 5000));

  context.subscriptions.push(
    { dispose: () => clearInterval(refreshInterval) },
    { dispose: () => statusBarManager.dispose() },
    { dispose: () => proxyService.stop() },
    { dispose: () => editorDisguiseProvider.dispose() },
  );
}

export function deactivate() {}
