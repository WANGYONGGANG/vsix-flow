import * as vscode from 'vscode';

export function getSettingsHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN" class="dark">
<head><meta charset="UTF-8"><title>StockExt 设置</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0c10;--fg:#b8bfc6;--card:#12151a;--border:#1f2124;--accent:#ff4d4f}
html,body{background:var(--bg);color:var(--fg);font:13px/1.5 -apple-system,sans-serif}
body{padding:16px;max-width:600px;margin:auto}
h1{font-size:16px;margin-bottom:16px;color:#fff}
h2{font-size:13px;margin:16px 0 8px;color:#fff;border-bottom:1px solid var(--border);padding-bottom:6px}
.group{background:var(--card);border-radius:6px;padding:10px;margin-bottom:8px}
.row{display:flex;justify-content:space-between;align-items:center;padding:6px 0}
.row+.row{border-top:1px solid var(--border)}
label{font-size:12px}
input,select{background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:4px 6px;color:var(--fg);font-size:12px;width:180px;text-align:right}
input[type="checkbox"]{width:auto}
button{background:var(--accent);color:#fff;border:none;border-radius:4px;padding:6px 12px;cursor:pointer;font-size:12px}
button:hover{opacity:.8}
</style></head>
<body>
<h1>⚙ StockExt 设置</h1>
<div id="settings"></div>
<script>
const vscode=acquireVsCodeApi();
const vscodeApi=acquireVsCodeApi();
const SETTINGS=[
  {key:'interval',label:'轮询间隔(ms)',type:'number',default:5000,min:3000},
  {key:'pollOnlyDuringAStockHours',label:'仅A股交易时段轮询',type:'checkbox',default:false},
  {key:'riseColor',label:'涨的颜色',type:'color',default:'#ff4d4f'},
  {key:'fallColor',label:'跌的颜色',type:'color',default:'#23c343'},
  {key:'hideStatusBar',label:'隐藏状态栏',type:'checkbox',default:false},
  {key:'hideStatusBarIcon',label:'隐藏状态栏图标',type:'checkbox',default:false},
];
async function load(){const el=$('#settings');el.innerHTML='';
  // General
  let html='<h2>常规</h2><div class="group">';
  for(const s of SETTINGS){const val=await getConfig(s.key,s.default);
    html+='<div class="row"><label>'+s.label+'</label>';
    if(s.type==='checkbox')html+='<input type="checkbox" '+(val?'checked':'')+' data-key="'+s.key+'" onchange="setConfig(this.dataset.key,this.checked)">';
    else if(s.type==='color')html+='<input type="color" value="'+val+'" data-key="'+s.key+'" onchange="setConfig(this.dataset.key,this.value)">';
    else html+='<input type="number" value="'+val+'" data-key="'+s.key+'" '+(s.min?'min="'+s.min+'"':'')+' onchange="setConfig(this.dataset.key,Number(this.value))">';
    html+='</div>'}
  html+='</div><h2>操作</h2><div class="group"><div class="row"><label>刷新行情数据</label><button onclick="vscode.postMessage({type:\'command\',command:\'stock-ext.locateWatchlist\'})">刷新</button></div></div>';
  el.innerHTML=html}
async function getConfig(key,def){try{const v=await vscodeApi.getState();return v&&v[key]!==undefined?v[key]:def}catch{return def}}
async function setConfig(key,val){vscode.postMessage({type:'setConfig',key,val})}
load();
</script>
</body></html>`;
}

export class SettingsViewProvider {
  public static open(context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel(
      'leekFundSettings',
      'StockExt 设置',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );
    panel.webview.html = getSettingsHtml();
    panel.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === 'setConfig') {
        const config = vscode.workspace.getConfiguration('stock-ext');
        await config.update(msg.key, msg.val, vscode.ConfigurationTarget.Global);
      } else if (msg.type === 'command') {
        vscode.commands.executeCommand(msg.command);
      }
    });
  }
}
