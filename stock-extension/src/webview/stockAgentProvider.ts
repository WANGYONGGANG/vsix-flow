import * as vscode from 'vscode';

function getNonce(): string {
  let t = '';
  const p = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 64; i++) t += p.charAt(Math.floor(Math.random() * p.length));
  return t;
}

function getStockAgentHtml(cspSource: string): string {
  const nonce = getNonce();
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src https: data:;">
<title>StockAgent</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0c10;--fg:#b8bfc6;--card:#12151a;--border:#1f2124;--accent:#ff4d4f;--msg-bg:#1a1d24;--panel-opacity:1}
html,body{background:var(--bg);color:var(--fg);font:13px/1.5 -apple-system,sans-serif;height:100vh;overflow:hidden;opacity:var(--panel-opacity,1)}
body{display:flex;flex-direction:column}
.header{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--border);flex-shrink:0}
.header h1{font-size:13px;font-weight:600;flex:1}
.header button{background:none;border:none;color:var(--fg);cursor:pointer;opacity:.6;padding:4px}
.header button:hover{opacity:1}
.messages{flex:1;overflow-y:auto;padding:10px}
.msg{margin-bottom:10px;display:flex;gap:8px}
.msg.user{flex-direction:row-reverse}
.msg .avatar{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
.msg.assistant .avatar{background:none;color:#fff}
.msg.user .avatar{background:var(--card);color:var(--fg)}
.msg .bubble{max-width:80%;padding:8px 12px;border-radius:8px;font-size:12px;line-height:1.6}
.msg.assistant .bubble{background:var(--msg-bg)}
.msg.user .bubble{background:var(--card)}
.quick-actions{display:flex;gap:4px;padding:4px 10px;flex-wrap:wrap;flex-shrink:0}
.quick-actions button{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:4px 10px;font-size:11px;color:var(--fg);cursor:pointer}
.quick-actions button:hover{background:var(--accent);color:#fff;border-color:var(--accent)}
.input-area{display:flex;gap:6px;padding:8px 10px;border-top:1px solid var(--border);flex-shrink:0}
.input-area input{flex:1;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:8px 10px;color:var(--fg);font-size:12px;outline:none}
.input-area input:focus{border-color:var(--accent)}
.input-area button{background:var(--accent);color:#fff;border:none;border-radius:6px;padding:8px 12px;cursor:pointer;font-size:12px}
.input-area button:disabled{opacity:.5}
.loading{text-align:center;padding:20px;opacity:.5;font-size:11px}
</style>
</head>
<body>
<div class="header"><h1>StockAgent</h1></div>
<div class="quick-actions">
  <button onclick="sendQuick('summary')">摘要快讯</button>
  <button onclick="sendQuick('portfolio')">自选概览</button>
  <button onclick="sendQuick('explain')">解读标的</button>
</div>
<div class="messages" id="messages">
  <div class="msg assistant"><div class="avatar">👩‍💼</div><div class="bubble">你好！我是 StockAgent，可以帮你分析股票和基金信息。</div></div>
</div>
<div class="input-area">
  <input id="input" placeholder="输入消息..." onkeydown="if(event.key==='Enter')send()">
  <button id="sendBtn" onclick="send()">发送</button>
</div>
<script nonce="${nonce}">
const vscode=acquireVsCodeApi();
const msgs=document.getElementById('messages');
var loading=false;
function esc(s){var d=document.createElement('div');d.textContent=s||'';return d.innerHTML}
function addMsg(role,content){var div=document.createElement('div');div.className='msg '+role;var avatar=document.createElement('div');avatar.className='avatar';avatar.textContent=role==='assistant'?'👩‍💼':'🧑';var bubble=document.createElement('div');bubble.className='bubble';bubble.innerHTML=content;if(role==='assistant'){div.appendChild(avatar);div.appendChild(bubble)}else{div.appendChild(bubble);div.appendChild(avatar)}msgs.appendChild(div);msgs.scrollTop=msgs.scrollHeight}
function send(){var inp=document.getElementById('input');if(!inp.value.trim()||loading)return;var text=inp.value;inp.value='';addMsg('user',esc(text));loading=true;document.getElementById('sendBtn').disabled=true;vscode.postMessage({type:'chat',text})}
function sendQuick(action){addMsg('user','/'+action);loading=true;document.getElementById('sendBtn').disabled=true;vscode.postMessage({type:'quickAction',action})}
window.addEventListener('message',function(e){var msg=e.data;loading=false;document.getElementById('sendBtn').disabled=false;if(msg.type==='response'){addMsg('assistant',msg.text||'暂无回复')}else if(msg.type==='error'){addMsg('assistant','错误: '+(msg.text||'请求失败'))}else if(msg.type==='setOpacity'){document.documentElement.style.setProperty('--panel-opacity',msg.opacity)}});
</script>
</body></html>`;
}

export class StockAgentViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'stockExtView.agent';
  private _view?: vscode.WebviewView;

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = getStockAgentHtml(webviewView.webview.cspSource);
    const opacity = vscode.workspace.getConfiguration('stock-ext').get<number>('opacity') || 1;
    webviewView.webview.postMessage({ type: 'setOpacity', opacity });
    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === 'chat' || msg.type === 'quickAction') {
        const text = msg.type === 'quickAction' ? `/${msg.action}` : msg.text;
        try {
          const lm = vscode.lm as any;
          if (lm && typeof lm.sendChatRequest === 'function') {
            const chatRequest = await lm.sendChatRequest(
              [{ role: 'user', content: text }],
              {},
              new vscode.CancellationTokenSource().token
            );
            let result = '';
            for await (const chunk of chatRequest.text) {
              result += chunk;
            }
            webviewView.webview.postMessage({ type: 'response', text: result });
          } else {
            webviewView.webview.postMessage({ type: 'response', text: 'AI 模型暂不可用' });
          }
        } catch (err: any) {
          webviewView.webview.postMessage({ type: 'error', text: err.message });
        }
      }
    });
  }

  updateOpacity(opacity: number) {
    this._view?.webview.postMessage({ type: 'setOpacity', opacity });
  }
}
