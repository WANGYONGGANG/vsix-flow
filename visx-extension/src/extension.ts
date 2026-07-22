import * as vscode from 'vscode';
import { FundFlowPanel } from './panel/FundFlowPanel';
import { FundFlowSidebar } from './sidebar/FundFlowSidebar';
import { LocalProxy } from './proxy/LocalProxy';

let proxy: LocalProxy | null = null;

export async function activate(context: vscode.ExtensionContext) {
  console.log('FundFlow extension activated');

  // 启动本地代理服务
  proxy = new LocalProxy(0); // 端口 0 表示自动分配
  try {
    await proxy.start();
    console.log(`[Extension] 本地代理已启动: ${proxy.url}`);
  } catch (e) {
    console.error('[Extension] 本地代理启动失败:', e);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('fundFlow.openPanel', () => {
      console.log('Command: fundFlow.openPanel triggered');
      FundFlowPanel.createOrShow(context, proxy?.url);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('fundFlow.openSidebar', () => {
      console.log('Command: fundFlow.openSidebar triggered');
      vscode.commands.executeCommand('fundFlowSidebar.focus');
    })
  );

  const sidebarProvider = new FundFlowSidebar(context, proxy?.url);
  console.log('Registering WebviewViewProvider with viewType:', FundFlowSidebar.viewType);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(FundFlowSidebar.viewType, sidebarProvider)
  );

  console.log('FundFlow extension activation complete');
}

export function deactivate() {
  console.log('FundFlow extension deactivated');
  if (proxy) {
    proxy.stop();
    proxy = null;
  }
}