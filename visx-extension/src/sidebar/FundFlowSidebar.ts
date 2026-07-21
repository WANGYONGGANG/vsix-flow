import * as vscode from 'vscode';

export class FundFlowSidebar implements vscode.WebviewViewProvider {
  public static readonly viewType = 'fundFlowSidebar';
  private _view?: vscode.WebviewView;
  private _context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    console.log('FundFlowSidebar constructor called');
    this._context = context;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    console.log('FundFlowSidebar.resolveWebviewView called');
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._context.extensionUri, 'webview')],
    };

    this._update(webviewView);

    const themeChange = vscode.window.onDidChangeActiveColorTheme(() => {
      webviewView.webview.postMessage({ type: 'theme', theme: this._getVsCodeTheme() });
    });
    webviewView.onDidDispose(() => themeChange.dispose());

    webviewView.webview.onDidReceiveMessage((msg) => {
      if (msg.type === 'config') {
        this._context.globalState.update('fundFlowConfig', msg.config);
      }
      if (msg.type === 'useBgMode') {
        this._context.globalState.update('fundFlowUseBgMode', msg.value);
        webviewView.webview.postMessage({ type: 'theme', theme: this._getVsCodeTheme() });
      }
    });
  }

  private _getVsCodeTheme(): 'light' | 'dark' | 'vscode-bg' {
    const kind = vscode.window.activeColorTheme.kind;
    const useBgMode = this._context.globalState.get('fundFlowUseBgMode') as boolean || false;
    if (useBgMode) return 'vscode-bg';
    return kind === vscode.ColorThemeKind.Light ? 'light' : 'dark';
  }

  private _update(webviewView: vscode.WebviewView) {
    const webview = webviewView.webview;
    const webviewDir = vscode.Uri.joinPath(this._context.extensionUri, 'webview');
    const indexPath = vscode.Uri.joinPath(webviewDir, 'index.html');
    
    console.log('Sidebar webview directory:', webviewDir.fsPath);

    vscode.workspace.fs.readFile(indexPath).then((data) => {
      console.log('Sidebar: Successfully read index.html');
      let html = Buffer.from(data).toString('utf-8');
      const baseUri = webview.asWebviewUri(webviewDir);
      
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
      console.log('Sidebar webview HTML set successfully');
    }, (err) => {
      console.error('Sidebar: Failed to read index.html:', err);
      webview.html = `<html><body><h1>Error loading webview</h1><p>${err.message}</p></body></html>`;
    });
  }
}