import * as vscode from 'vscode';
import { FundFlowPanel } from './panel/FundFlowPanel';
import { FundFlowSidebar } from './sidebar/FundFlowSidebar';

export function activate(context: vscode.ExtensionContext) {
  console.log('FundFlow extension activated');
  
  context.subscriptions.push(
    vscode.commands.registerCommand('fundFlow.openPanel', () => {
      console.log('Command: fundFlow.openPanel triggered');
      FundFlowPanel.createOrShow(context);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('fundFlow.openSidebar', () => {
      console.log('Command: fundFlow.openSidebar triggered');
      vscode.commands.executeCommand('fundFlowSidebar.focus');
    })
  );

  const sidebarProvider = new FundFlowSidebar(context);
  console.log('Registering WebviewViewProvider with viewType:', FundFlowSidebar.viewType);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(FundFlowSidebar.viewType, sidebarProvider)
  );
  
  console.log('FundFlow extension activation complete');
}

export function deactivate() {
  console.log('FundFlow extension deactivated');
}
