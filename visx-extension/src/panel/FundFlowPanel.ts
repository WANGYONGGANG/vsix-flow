import * as vscode from 'vscode';
import * as path from 'path';

export class FundFlowPanel {
  public static currentPanel: FundFlowPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _context: vscode.ExtensionContext;

  public static createOrShow(context: vscode.ExtensionContext) {
    console.log('FundFlowPanel.createOrShow called');
    
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (FundFlowPanel.currentPanel) {
      console.log('Panel already exists, revealing');
      FundFlowPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'fundFlowPanel',
      '主力资金流向',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'webview')],
      }
    );

    console.log('Created new WebviewPanel');
    FundFlowPanel.currentPanel = new FundFlowPanel(panel, context);
  }

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this._panel = panel;
    this._context = context;
    
    console.log('FundFlowPanel constructor called, updating webview');
    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.onDidChangeViewState(
      () => {
        if (this._panel.visible) {
          this._postMessage({ type: 'theme', theme: this._getVsCodeTheme() });
        }
      },
      null,
      this._disposables
    );

    const themeChange = vscode.window.onDidChangeActiveColorTheme(() => {
      this._postMessage({ type: 'theme', theme: this._getVsCodeTheme() });
    });
    this._disposables.push(themeChange);

    this._panel.webview.onDidReceiveMessage((msg) => {
      if (msg.type === 'config') {
        this._context.globalState.update('fundFlowConfig', msg.config);
      }
      if (msg.type === 'useBgMode') {
        this._context.globalState.update('fundFlowUseBgMode', msg.value);
        this._postMessage({ type: 'theme', theme: this._getVsCodeTheme() });
      }
    });
  }

  private _getVsCodeTheme(): 'light' | 'dark' | 'vscode-bg' {
    const kind = vscode.window.activeColorTheme.kind;
    const useBgMode = this._context.globalState.get('fundFlowUseBgMode') as boolean || false;
    if (useBgMode) return 'vscode-bg';
    return kind === vscode.ColorThemeKind.Light ? 'light' : 'dark';
  }

  private _postMessage(msg: unknown) {
    this._panel.webview.postMessage(msg);
  }

  private _update() {
    const webview = this._panel.webview;
    const webviewDir = vscode.Uri.joinPath(this._context.extensionUri, 'webview');
    const indexPath = vscode.Uri.joinPath(webviewDir, 'index.html');
    
    console.log('Webview directory:', webviewDir.fsPath);
    console.log('Index path:', indexPath.fsPath);

    vscode.workspace.fs.readFile(indexPath).then((data) => {
      console.log('Successfully read index.html');
      let html = Buffer.from(data).toString('utf-8');
      const baseUri = webview.asWebviewUri(webviewDir);
      console.log('Base URI:', baseUri.toString());
      
      html = html.replace(/src="\.\//g, `src="${baseUri.toString()}/`);
      html = html.replace(/href="\.\//g, `href="${baseUri.toString()}/`);
      html = html.replace(/ crossorigin/g, '');
      
      const config = this._context.globalState.get('fundFlowConfig') as any || {};
      const useBgMode = this._context.globalState.get('fundFlowUseBgMode') as boolean || false;
      const cspSource = webview.cspSource;
      html = html.replace(
        '</head>',
        `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src https:; script-src 'self' 'unsafe-inline' ${cspSource}; style-src 'self' 'unsafe-inline' ${cspSource}; img-src 'self' data: https: ${cspSource};">
        <script>
          window.FUND_FLOW_VSCODE = true;
          window.FUND_FLOW_THEME = '${this._getVsCodeTheme()}';
          window.FUND_FLOW_CONFIG = ${JSON.stringify(config)};
          window.FUND_FLOW_USE_BG_MODE = ${useBgMode};
        </script></head>`
      );
      
      webview.html = html;
      console.log('Webview HTML set successfully');
    }, (err) => {
      console.error('Failed to read index.html:', err);
      webview.html = `<html><body><h1>Error loading webview</h1><p>${err.message}</p></body></html>`;
    });
  }

  public dispose() {
    FundFlowPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) x.dispose();
    }
  }
}