import * as vscode from 'vscode';
import * as http from 'http';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getProxyPort } from '../shared/proxyPort';
import { generateStockReport } from './stockReportGenerator';

function proxyGet(path: string): Promise<any> {
  return new Promise((resolve) => {
    http.get(`http://localhost:${getProxyPort()}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

function getReportHtml(cspSource: string, scriptUri: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'unsafe-inline'; img-src https: data:;">
<title>StockExt 选股报告</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0c10;--fg:#b8bfc6;--card:#12151a;--border:#1f2124;--accent:#ff4d4f;--panel-opacity:1}
html,body{background:var(--bg);color:var(--fg);font:13px/1.5 -apple-system,sans-serif;height:100vh;overflow:hidden;opacity:var(--panel-opacity,1)}
body{display:flex;flex-direction:column}
.header{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--border);flex-shrink:0}
.header h1{font-size:13px;font-weight:600;flex:1}
.header button{background:none;border:1px solid var(--border);border-radius:4px;padding:4px 8px;color:var(--fg);cursor:pointer;font-size:11px}
.header button:hover{background:var(--card)}
#reportRoot{flex:1;overflow-y:auto;min-height:0}
#reportRoot::-webkit-scrollbar{width:8px}
#reportRoot::-webkit-scrollbar-thumb{background:#2a2d34;border-radius:4px}
.loading{text-align:center;padding:60px;opacity:.5}
.loading .spin{display:inline-block;width:22px;height:22px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:rp 1s linear infinite;vertical-align:middle;margin-right:10px}
@keyframes rp{to{transform:rotate(360deg)}}
</style>
</head>
<body>
<div class="header"><h1>📈 选股报告</h1><button id="openBrowserBtn">🌐 浏览器打开</button><button id="refreshBtn">↻ 刷新</button></div>
<div id="reportRoot"><div class="loading" id="loading"><span class="spin"></span>正在生成报告...</div></div>
<script src="${scriptUri}"></script>
</body></html>`;
}

export class StockReportViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'stockExtView.report';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  private log(msg: string) { console.log(msg); }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true, localResourceRoots: [this._extensionUri] };
    const scriptUri = webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'webview', 'reportPanel.js'));
    webviewView.webview.html = getReportHtml(webviewView.webview.cspSource, scriptUri.toString());
    const opacity = vscode.workspace.getConfiguration('stock-ext').get<number>('opacity') || 1;
    webviewView.webview.postMessage({ type: 'setOpacity', opacity });

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === 'ready' || msg.type === 'refresh') {
        try {
          const html = await generateStockReport(proxyGet);
          webviewView.webview.postMessage({ type: 'report', html });
        } catch (err: any) {
          webviewView.webview.postMessage({
            type: 'report',
            html: `<div class="disc" style="padding:20px;color:#c92a2a">报告生成失败：${String(err?.message || err).replace(/</g, '&lt;')}</div>`,
          });
        }
      } else if (msg.type === 'openUrl' && msg.url) {
        try { await vscode.env.openExternal(vscode.Uri.parse(msg.url)); } catch {}
      } else if (msg.type === 'openInBrowser' && typeof msg.html === 'string') {
        try {
          const dir = path.join(os.tmpdir(), 'stockext-report');
          fs.mkdirSync(dir, { recursive: true });
          const file = path.join(dir, `report_${Date.now()}.html`);
          fs.writeFileSync(file, msg.html, 'utf8');
          await vscode.env.openExternal(vscode.Uri.file(file));
        } catch (err: any) {
          this.log(`[openInBrowser] failed: ${err?.message || err}`);
        }
      }
    });
  }

  refresh() {
    if (this._view) {
      this._view.webview.postMessage({ type: 'refresh' });
    }
  }

  updateOpacity(opacity: number) {
    this._view?.webview.postMessage({ type: 'setOpacity', opacity });
  }
}
