import * as vscode from 'vscode';
import { COMMANDS } from './shared/constant';
import { StatusBarManager } from './statusbar/statusBar';
import { ProxyService } from './webview/proxyService';
import { SettingsViewProvider } from './webview/settingsView';
import { EditorDisguiseProvider } from './editor/editorDisguiseProvider';

export function registerCommands(
  context: vscode.ExtensionContext,
  statusBarManager: StatusBarManager,
  proxyService: ProxyService,
  editorDisguise?: EditorDisguiseProvider,
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.OPEN_SETTINGS, () => SettingsViewProvider.open(context)),
    vscode.commands.registerCommand(COMMANDS.OPEN_STOCK_CENTER, () => {
      vscode.commands.executeCommand('workbench.view.extension.stockExtMenu');
    }),
    vscode.commands.registerCommand(COMMANDS.OPEN_SECTOR_BOARDS, () => {
      vscode.window.showInformationMessage('板块行情功能即将上线');
    }),
    vscode.commands.registerCommand(COMMANDS.OPEN_HOLDINGS_CENTER, () => {
      vscode.window.showInformationMessage('资产管理功能即将上线');
    }),
    vscode.commands.registerCommand(COMMANDS.OPEN_STOCK_AGENT, () => {
      vscode.commands.executeCommand('workbench.view.extension.stockExtAgent');
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
      if (code) {
        vscode.window.showInformationMessage(`${quote?.name || code}: ${quote?.price || ''}`);
      }
    }),

    vscode.commands.registerCommand(COMMANDS.EDITOR_DISGUISE_TOGGLE, async () => {
      const config = vscode.workspace.getConfiguration('stock-ext');
      const current = config.get<boolean>('editorDisguise.enabled') || false;
      await config.update('editorDisguise.enabled', !current, vscode.ConfigurationTarget.Global);
      if (editorDisguise) {
        if (!current) {
          editorDisguise.refresh();
        } else {
          editorDisguise.refresh();
        }
      }
    }),
    vscode.commands.registerCommand(COMMANDS.EDITOR_DISGUISE_DISABLE, async () => {
      const config = vscode.workspace.getConfiguration('stock-ext');
      await config.update('editorDisguise.enabled', false, vscode.ConfigurationTarget.Global);
      if (editorDisguise) editorDisguise.refresh();
    }),
  );
}
