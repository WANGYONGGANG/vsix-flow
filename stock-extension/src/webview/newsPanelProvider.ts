import * as vscode from 'vscode';
import * as http from 'http';
import type { NewsItem } from '../shared/types';
import { getProxyPort } from '../shared/proxyPort';

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

function getNonce(): string {
  let t = '';
  const p = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 64; i++) t += p.charAt(Math.floor(Math.random() * p.length));
  return t;
}

function getNewsHtml(cspSource: string): string {
  const nonce = getNonce();
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src https: data:;">
<title>StockExt News</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0c10;--fg:#b8bfc6;--card:#12151a;--border:#1f2124;--accent:#ff4d4f}
html,body{background:var(--bg);color:var(--fg);font:13px/1.5 -apple-system,sans-serif;height:100vh;overflow:hidden}
body{display:flex;flex-direction:column}
.header{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--border);flex-shrink:0}
.header h1{font-size:13px;font-weight:600;flex:1}
.header button{background:none;border:1px solid var(--border);border-radius:4px;padding:4px 8px;color:var(--fg);cursor:pointer;font-size:11px}
.header button:hover{background:var(--card)}
.news-list{flex:1;overflow-y:auto;padding:8px}
.news-item{padding:8px 10px;border-bottom:1px solid var(--border);cursor:pointer}
.news-item:hover{background:var(--card)}
.news-item .time{font-size:10px;font-family:monospace;opacity:.5;margin-bottom:2px}
.news-item .title{font-size:12px;font-weight:500;color:#ddd}
.loading{text-align:center;padding:40px;opacity:.5}
</style>
</head>
<body>
<div class="header"><h1>实时快讯</h1><button onclick="refresh()">刷新</button></div>
<div class="news-list" id="newsList"><div class="loading">加载中...</div></div>
<script nonce="${nonce}">
const vscode=acquireVsCodeApi();
function refresh(){vscode.postMessage({type:'refresh'})}
function esc(s){var d=document.createElement('div');d.textContent=s||'';return d.innerHTML}
function fmtTime(t){return String(t).slice(5,16)}
function render(items){var el=document.getElementById('newsList');if(!items||!items.length){el.innerHTML='<div class="loading">暂无新闻</div>';return}el.innerHTML=items.slice(0,100).map(function(n){return '<div class="news-item" onclick="vscode.postMessage({type:\\'openUrl\\',url:\\''+esc(n.url||'')+'\\'})"><div class="time">'+fmtTime(n.time)+'</div><div class="title">'+esc(n.title)+'</div></div>'}).join('')}
window.addEventListener('message',function(e){var msg=e.data;if(msg.type==='news')render(msg.items)});
vscode.postMessage({type:'ready'});
</script>
</body></html>`;
}

export class NewsPanelViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'stockExtView.news';
  private _view?: vscode.WebviewView;

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = getNewsHtml(webviewView.webview.cspSource);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === 'ready' || msg.type === 'refresh') {
        const r = await proxyGet('/api/em-news?page=1&pageSize=50');
        const list = r?.data?.list || [];
        const items: NewsItem[] = list.map((d: any) => ({
          id: String(d.id || d.seq || ''),
          title: d.title || '',
          content: d.content || d.digest || '',
          time: d.showtime || d.ctime || '',
          source: d.source || d.site || d.Art_Media_Name || '',
          url: d.url_w || d.url_m || d.url || '',
        }));
        webviewView.webview.postMessage({ type: 'news', items });
      } else if (msg.type === 'openUrl') {
        vscode.env.openExternal(vscode.Uri.parse(msg.url));
      }
    });
  }

  refresh() {
    if (this._view) {
      this._view.webview.postMessage({ type: 'refresh' });
    }
  }
}
