import * as vscode from 'vscode';
import { COMMANDS } from './shared/constant';
import { StatusBarManager } from './statusbar/statusBar';
import { ProxyService } from './webview/proxyService';
import { StockCenterViewProvider } from './webview/stockCenterProvider';

export function registerCommands(
  context: vscode.ExtensionContext,
  statusBarManager: StatusBarManager,
  proxyService: ProxyService,
  stockCenterProvider?: StockCenterViewProvider,
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.OPEN_STOCK_CENTER, () => {
      vscode.commands.executeCommand('workbench.view.extension.stockExtMenu');
    }),
    vscode.commands.registerCommand(COMMANDS.OPEN_SECTOR_BOARDS, () => {
      vscode.window.showInformationMessage('板块行情功能即将上线');
    }),
    vscode.commands.registerCommand(COMMANDS.OPEN_HOLDINGS_CENTER, () => {
      vscode.window.showInformationMessage('资产管理功能即将上线');
    }),

    vscode.commands.registerCommand(COMMANDS.START_PROXY, async () => {
      try {
        const port = await proxyService.start();
        vscode.window.showInformationMessage(`StockExt 代理已启动: http://localhost:${port}`);
      } catch (err: any) {
        vscode.window.showErrorMessage(`代理启动失败: ${err.message}`);
      }
    }),
    vscode.commands.registerCommand(COMMANDS.STOP_PROXY, () => {
      proxyService.stop();
      vscode.window.showInformationMessage('StockExt 代理已停止');
    }),
    vscode.commands.registerCommand(COMMANDS.PROXY_STATUS, () => {
      vscode.window.showInformationMessage('代理服务正在运行');
    }),
    vscode.commands.registerCommand(COMMANDS.LOCATE_WATCHLIST, () => {
      vscode.commands.executeCommand('workbench.view.extension.stockExtMenu');
    }),

    vscode.commands.registerCommand(COMMANDS.TOGGLE_STATUS_BAR, () => statusBarManager.toggleVisibility()),
    vscode.commands.registerCommand(COMMANDS.TOGGLE_STATUS_BAR_ICON, () => {
      const config = vscode.workspace.getConfiguration('stock-ext');
      const current = config.get<boolean>('hideStatusBarIcon') || false;
      config.update('hideStatusBarIcon', !current, vscode.ConfigurationTarget.Global);
    }),

    vscode.commands.registerCommand(COMMANDS.OPEN_STOCK_DETAIL, (quote: any) => {
      const code = typeof quote === 'string' ? quote : quote?.code || '';
      const name = typeof quote === 'string' ? '' : quote?.name || '';
      if (code && stockCenterProvider) {
        stockCenterProvider.openDetail(code, name);
      }
    }),

    vscode.commands.registerCommand(COMMANDS.OPEN_STATUS_BAR_DETAIL, () => {
      const quote = statusBarManager.getFirstQuote();
      if (quote && stockCenterProvider) {
        stockCenterProvider.openDetail(quote.code, quote.name);
      } else {
        vscode.commands.executeCommand('workbench.view.extension.stockExtMenu');
      }
    }),
  );
}
