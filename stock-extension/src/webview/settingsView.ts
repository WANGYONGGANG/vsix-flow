import * as vscode from 'vscode';

export function getSettingsHtml(configValues: Record<string, any>): string {
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
input[type="range"]{width:120px;height:4px;-webkit-appearance:none;background:var(--border);border:none;border-radius:2px;cursor:pointer}
input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:var(--accent);cursor:pointer}
button{background:var(--accent);color:#fff;border:none;border-radius:4px;padding:6px 12px;cursor:pointer;font-size:12px}
button:hover{opacity:.8}
</style></head>
<body>
<h1>⚙ StockExt 设置</h1>
<div id="settings"></div>
<script>
const vscode=acquireVsCodeApi();
const CONFIG=${JSON.stringify(configValues)};
const SETTINGS=[
  {key:'interval',label:'轮询间隔(ms)',type:'number',default:5000,min:3000},
  {key:'pollOnlyDuringAStockHours',label:'仅A股交易时段轮询',type:'checkbox',default:false},
  {key:'riseColor',label:'涨的颜色',type:'color',default:'#ff4d4f'},
  {key:'fallColor',label:'跌的颜色',type:'color',default:'#23c343'},
  {key:'hideStatusBar',label:'隐藏状态栏',type:'checkbox',default:false},
  {key:'hideStatusBarIcon',label:'隐藏状态栏图标',type:'checkbox',default:false},
  {key:'opacity',label:'面板透明度',type:'range',default:1,min:0.1,max:1,step:0.1},
];
function load(){var el=document.getElementById('settings');el.innerHTML='';
  var html='<h2>常规</h2><div class="group">';
  for(var i=0;i<SETTINGS.length;i++){var s=SETTINGS[i];var val=CONFIG[s.key]!==undefined?CONFIG[s.key]:s.default;
    html+='<div class="row"><label>'+s.label+'</label>';
    if(s.type==='checkbox')html+='<input type="checkbox" '+(val?'checked':'')+' data-key="'+s.key+'" onchange="setConfig(this.dataset.key,this.checked)">';
    else if(s.type==='color')html+='<input type="color" value="'+val+'" data-key="'+s.key+'" onchange="setConfig(this.dataset.key,this.value)">';
    else if(s.type==='range')html+='<div style="display:flex;align-items:center;gap:6px;justify-content:flex-end"><input type="range" min="'+(s.min||0)+'" max="'+(s.max||1)+'" step="'+(s.step||0.1)+'" value="'+val+'" data-key="'+s.key+'" oninput="this.nextElementSibling.textContent=this.value;setConfig(this.dataset.key,Number(this.value))"><span style="font-size:12px;min-width:30px;text-align:right">'+val+'</span></div>';
    else html+='<input type="number" value="'+val+'" data-key="'+s.key+'" '+(s.min?'min="'+s.min+'"':'')+' onchange="setConfig(this.dataset.key,Number(this.value))">';
    html+='</div>'}
  html+='</div><h2>操作</h2><div class="group"><div class="row"><label>刷新行情数据</label><button onclick="vscode.postMessage({type:\\'command\\',command:\\'stock-ext.locateWatchlist\\'})">刷新</button></div></div>';
  el.innerHTML=html}
function setConfig(key,val){CONFIG[key]=val;vscode.postMessage({type:'setConfig',key,val})}
load();
</script>
</body></html>`;
}

export class SettingsViewProvider {
  public static open(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('stock-ext');
    const keys = ['interval', 'pollOnlyDuringAStockHours', 'riseColor', 'fallColor', 'hideStatusBar', 'hideStatusBarIcon', 'opacity'];
    const configValues: Record<string, any> = {};
    keys.forEach(k => { configValues[k] = config.get(k); });
    const panel = vscode.window.createWebviewPanel(
      'leekFundSettings',
      'StockExt 设置',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );
    panel.webview.html = getSettingsHtml(configValues);
    panel.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === 'setConfig') {
        await config.update(msg.key, msg.val, vscode.ConfigurationTarget.Global);
      } else if (msg.type === 'command') {
        vscode.commands.executeCommand(msg.command);
      }
    });
  }
}
