function getNonce(): string {
  let t = '';
  const p = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 64; i++) t += p.charAt(Math.floor(Math.random() * p.length));
  return t;
}

export function getStockCenterHtml(cspSource: string): string {
  const nonce = getNonce();
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}' 'unsafe-inline';">
<title>StockCenter</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0c10;--fg:#b8bfc6;--up:#ff4d4f;--down:#23c343;--card:#12151a;--border:#1f2124;--accent:#e8b339;--panel-opacity:1}
html,body{background:var(--bg);color:var(--fg);font:13px/1.5 -apple-system,sans-serif;height:100vh;overflow:hidden;opacity:var(--panel-opacity,1)}
body{display:flex;flex-direction:column}
.tab-bar{display:flex;gap:2px;padding:6px 8px;border-bottom:1px solid var(--border);flex-shrink:0;overflow-x:auto}
.tab-btn{padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px;border:none;background:transparent;color:var(--fg);opacity:.6;white-space:nowrap;flex-shrink:0}
.tab-btn.active{background:var(--up);color:#fff;opacity:1}
.content{flex:1;overflow-y:auto;padding:10px}
.loading{padding:40px;text-align:center;opacity:.5;font-size:12px}
.card{background:var(--card);border-radius:6px;padding:10px;margin-bottom:8px;font-size:12px}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.text-up{color:var(--up)}.text-down{color:var(--down)}
.text-muted{opacity:.5}
.text-accent{color:var(--accent)}
.flex{display:flex}.items-center{align-items:center}.gap-2{gap:8px}
.mb-1{margin-bottom:4px}
table{width:100%;border-collapse:collapse;font-size:11px}
th,td{padding:4px 6px;text-align:right;border-bottom:1px solid var(--border)}
th{opacity:.6;font-weight:400}
td:first-child,th:first-child{text-align:left}
.tag{display:inline-block;padding:0 6px;border-radius:3px;font-size:10px;margin-right:4px}
.tag-up{background:rgba(255,77,79,.15);color:var(--up)}
.tag-down{background:rgba(35,195,67,.15);color:var(--down)}
.tag-accent{background:rgba(232,179,57,.15);color:var(--accent)}
.section-title{font-size:11px;opacity:.6;margin:10px 0 4px;font-weight:600}
.news-item{padding:8px 10px;border-bottom:1px solid var(--border);cursor:pointer}
.news-item:hover{background:var(--card)}
.news-item .time{font-size:10px;font-family:monospace;opacity:.5;margin-bottom:2px}
.news-item .title{font-size:12px;font-weight:500;color:#ddd}
.chg{border-radius:4px;padding:2px 8px;font-size:11px;white-space:nowrap}
.chg-up{background:rgba(255,77,79,.15);color:var(--up)}
.chg-down{background:rgba(35,195,67,.15);color:var(--down)}
.wl-add{display:flex;justify-content:center;margin-top:12px}
.wl-add button{padding:8px 24px;border:1px dashed var(--border);border-radius:6px;background:transparent;color:var(--fg);font-size:13px;cursor:pointer;transition:all .2s}
.wl-add button:hover{border-color:var(--fg);color:#fff}
.wl-card{background:var(--card);border-radius:6px;padding:10px 12px;margin-bottom:6px;cursor:pointer;transition:background .15s}
.wl-card:hover{background:#1a1e24}
.wl-row{display:flex;align-items:center;gap:12px}
.wl-name{flex:1}
.wl-name .nm{font-size:13px;font-weight:500;color:#ddd}
.wl-name .cd{font-size:10px;color:var(--fg);opacity:.5}
.wl-price{text-align:right;min-width:64px}
.wl-price .pr{font-size:15px;font-weight:700}
.wl-chg{text-align:right;min-width:64px}
.wl-chg .tag{font-size:11px;padding:2px 8px;border-radius:4px;display:inline-block}
.wl-del{padding:4px 10px;border:none;border-radius:4px;background:rgba(255,77,79,.12);color:var(--up);font-size:11px;cursor:pointer;transition:background .15s;flex-shrink:0}
.wl-del:hover{background:rgba(255,77,79,.3)}
.detail-back{display:inline-flex;align-items:center;gap:4px;padding:4px 12px;border-radius:4px;border:none;background:var(--card);color:var(--fg);font-size:12px;cursor:pointer;margin-bottom:10px}
.detail-back:hover{background:#1a1e24}
.detail-card{background:var(--card);border-radius:8px;padding:16px;margin-bottom:10px}
.detail-hdr{display:flex;align-items:baseline;gap:10px;margin-bottom:8px}
.detail-hdr .nm{font-size:16px;font-weight:600;color:#fff}
.detail-hdr .cd{font-size:11px;opacity:.5}
.detail-price{font-size:28px;font-weight:700;margin-bottom:2px}
.detail-tag{display:inline-block;padding:2px 10px;border-radius:4px;font-size:12px}
.detail-grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0;margin-top:12px;font-size:12px;border:1px solid var(--border);border-radius:6px;overflow:hidden}
.detail-cell{padding:8px 10px;border-bottom:1px solid var(--border);border-right:1px solid var(--border)}
.detail-cell:nth-child(4n){border-right:none}
.detail-cell:nth-last-child(-n+4){border-bottom:none}
.detail-cell .lbl{font-size:10px;opacity:.5;margin-bottom:2px}
.detail-cell .val{font-size:13px;font-weight:500}
.kl-toolbar{display:flex;align-items:center;gap:6px;margin-top:12px;margin-bottom:6px;flex-wrap:wrap}
.kl-pbtn{padding:3px 10px;border:1px solid var(--border);border-radius:4px;background:transparent;color:var(--fg);font-size:11px;cursor:pointer}
.kl-pbtn.active{background:var(--up);color:#fff;border-color:var(--up)}
.kl-pbtn:hover:not(.active){border-color:var(--fg)}
.kl-add{padding:3px 8px;border:1px dashed var(--border);border-radius:4px;background:transparent;color:var(--fg);font-size:11px;cursor:pointer}
.kl-add:hover{border-color:var(--fg)}
.kl-chart-wrap{display:flex;gap:0;background:var(--card);border-radius:6px;overflow:hidden}
.kl-chart{flex:1;padding:6px 0;cursor:crosshair;user-select:none;touch-action:none;min-width:0}
.kl-side{width:140px;border-left:1px solid var(--border);padding:4px 6px;font-size:10px;overflow:hidden;flex-shrink:0}
.kl-side-title{font-size:10px;opacity:.6;margin-bottom:4px;font-weight:600}
.ob-row{display:flex;justify-content:space-between;padding:1px 0;line-height:1.6}
.ob-row .ob-label{opacity:.5;width:28px;flex-shrink:0}
.ob-row .ob-price{flex:1;text-align:right}
.ob-row .ob-vol{text-align:right;width:42px;flex-shrink:0}
.ob-up{color:var(--up)}.ob-down{color:var(--down)}
.tick-row{display:flex;justify-content:space-between;padding:1px 0;line-height:1.6;opacity:.8}
.tick-row .tick-time{width:40px;flex-shrink:0;opacity:.5}
.tick-row .tick-price{flex:1;text-align:right}
.tick-row .tick-vol{text-align:right;width:42px;flex-shrink:0}
.kl-canvas{width:100%;display:block}
.kl-sub{border-top:1px solid var(--border);position:relative}
.kl-sub-hdr{display:flex;align-items:center;justify-content:space-between;padding:2px 8px 0;font-size:10px;opacity:.6}
.kl-sub-hdr button{background:none;border:none;color:var(--fg);opacity:.5;cursor:pointer;font-size:10px;padding:0 4px}
.kl-sub-hdr button:hover{opacity:1}
.voice-toggle{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:4px;border:1px solid var(--border);background:var(--card);color:var(--fg);font-size:10px;cursor:pointer;flex-shrink:0;transition:all .2s}
.voice-toggle.on{border-color:var(--accent);color:var(--accent);background:rgba(232,179,57,.1)}
.voice-toggle:hover{opacity:.8}
.voice-icon{font-size:12px}
.kl-sub canvas{width:100%;display:block}
.detail-actions{margin-top:14px;display:flex;gap:8px}
.detail-actions button{flex:1;padding:8px;border:none;border-radius:6px;font-size:12px;cursor:pointer}
.detail-actions .btn-del{background:rgba(255,77,79,.15);color:var(--up)}
.detail-actions .btn-del:hover{background:rgba(255,77,79,.3)}
.detail-actions .btn-back{background:var(--bg);color:var(--fg);border:1px solid var(--border)}
.detail-actions .btn-back:hover{background:#1a1e24}
.detail-tabs{display:flex;gap:2px;margin-top:12px;border-bottom:1px solid var(--border);padding-bottom:0}
.detail-tab{padding:6px 14px;border:none;border-radius:4px 4px 0 0;background:transparent;color:var(--fg);opacity:.5;font-size:12px;cursor:pointer;border-bottom:2px solid transparent}
.detail-tab.active{opacity:1;border-bottom-color:var(--accent);color:#fff}
.detail-tab:hover:not(.active){opacity:.8}
.detail-panel{margin-top:8px;max-height:200px;overflow-y:auto}
.detail-panel .news-item{padding:6px 8px;border-bottom:1px solid var(--border);cursor:pointer;font-size:11px}
.detail-panel .news-item:hover{background:var(--card)}
.detail-panel .news-item .time{font-size:10px;opacity:.5}
.detail-panel .news-item .title{color:#ddd;margin-top:2px}
.realtime-item{padding:8px 10px;border-bottom:1px solid var(--border);font-size:12px}
.realtime-item .rt-time{font-size:10px;font-family:monospace;opacity:.5;margin-bottom:2px}
.realtime-item .rt-title{color:#ddd}
.realtime-item .rt-tag{display:inline-block;padding:0 5px;border-radius:3px;font-size:10px;margin-right:4px}
.stock-row{cursor:pointer}
.stock-row:hover{background:var(--card)}
</style>
</head>
<body>
<div class="tab-bar" id="tabBar"></div>
<div class="content" id="content"><div class="loading">loading...</div></div>
<script nonce="${nonce}">
window.onerror=function(m,s,l,c,e){document.getElementById('content').innerHTML='<pre style="color:red;padding:10px">'+m+' at line '+l+':'+c+'</pre>';};
var vscode=acquireVsCodeApi();
var TABS=[
  {id:'market_overview',label:'概况'},{id:'fundFlow',label:'资金'},{id:'em_news',label:'新闻'},
  {id:'realtime_news',label:'快讯'},{id:'sector_limit',label:'板块'},{id:'limit_leader',label:'龙头'},
  {id:'strong_sector',label:'强板'},{id:'dragon_tiger',label:'龙虎'},{id:'yesterday_limit',label:'涨停'},
  {id:'alert',label:'异动'},{id:'hot_stocks',label:'热股'},{id:'watchlist',label:'自选'},
];
var CHG_TYPES={4:'秒板',8:'封板',16:'打开涨停',32:'大笔买入',64:'大笔卖出',128:'大笔买入',8193:'火箭发射',8194:'快速反弹',8201:'加速上涨',8202:'高台跳水',8203:'加速下跌',8204:'大笔卖出',8207:'大幅上升',8208:'大幅下降',8209:'封涨停',8210:'封跌停',8211:'打开涨停',8212:'打开跌停',8213:'创历史新高',8214:'创历史新低',8215:'竞价上涨',8216:'竞价下跌'};
var currentTab='market_overview';
var voiceOn=false;var _lastNewsIds=[];var _lastAlertIds=[];
function speakText(text){if(!text)return;if(!('speechSynthesis' in window))return;window.speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';u.rate=1.1;u.pitch=1;window.speechSynthesis.speak(u)}
function toggleVoice(){voiceOn=!voiceOn;var btn=document.getElementById('voiceBtn');if(btn){btn.className='voice-toggle'+(voiceOn?' on':'');btn.querySelector('.voice-icon').textContent=voiceOn?'🔊':'🔇';btn.querySelector('.voice-label').textContent=voiceOn?'播报中':'播报'}if(voiceOn&&currentTab==='realtime_news')speakLatestNews();if(voiceOn&&currentTab==='alert')speakLatestAlert()}
function speakLatestNews(){if(!voiceOn||currentTab!=='realtime_news')return;var items=document.querySelectorAll('#content .realtime-item .rt-title');if(items.length>0)speakText(items[0].textContent)}
function speakLatestAlert(){if(!voiceOn||currentTab!=='alert')return;var rows=document.querySelectorAll('#content table tr');if(rows.length>1){var cells=rows[1].querySelectorAll('td');if(cells.length>=4)speakText((cells[1]?cells[1].textContent:'')+(cells[2]?cells[2].textContent:'')+(cells[3]?cells[3].textContent:''))}}
function renderTabs(){var bar=$('#tabBar');if(!bar)return;bar.innerHTML='';for(var i=0;i<TABS.length;i++){var t=TABS[i];var btn=document.createElement('button');btn.className='tab-btn'+(t.id===currentTab?' active':'');btn.setAttribute('data-tab',t.id);btn.textContent=t.label;bar.appendChild(btn)}var vb=document.createElement('button');vb.id='voiceBtn';vb.className='voice-toggle'+(voiceOn?' on':'');vb.onclick=toggleVoice;vb.innerHTML='<span class="voice-icon">'+(voiceOn?'🔊':'🔇')+'</span><span class="voice-label">'+(voiceOn?'播报中':'播报')+'</span>';var voiceTabs=['em_news','realtime_news','alert'];if(voiceTabs.indexOf(currentTab)>=0)bar.appendChild(vb)}
function $(s){return document.querySelector(s)}
function esc(s){var d=document.createElement('div');d.textContent=s||'';return d.innerHTML}
function fmtPrice(v){v=Number(v)||0;return v>10000?(v/10000).toFixed(2)+'万':v.toLocaleString('zh-CN',{maximumFractionDigits:0})}
function fmtYi(v){v=Number(v)||0;var abs=Math.abs(v);var s=(abs>=100000000?(abs/100000000).toFixed(2)+'亿':abs>=10000?(abs/10000).toFixed(2)+'万':abs.toFixed(2));return v<0?'-'+s:s}
function upClass(v){return v>=0?'text-up':'text-down'}
function upSign(v){return v>=0?'+':''}
function fmtTime(t){var s=String(t);if(s.length>=6)return s.slice(0,2)+':'+s.slice(2,4);return s}
function renderTabs(){var bar=$('#tabBar');if(!bar)return;bar.innerHTML='';for(var i=0;i<TABS.length;i++){var t=TABS[i];var btn=document.createElement('button');btn.className='tab-btn'+(t.id===currentTab?' active':'');btn.setAttribute('data-tab',t.id);btn.textContent=t.label;bar.appendChild(btn)}}
function switchTab(tab){currentTab=tab;_lastNewsIds=[];_lastAlertIds=[];renderTabs();$('#content').innerHTML='<div class="loading">加载中...</div>';vscode.postMessage({type:'switchTab',tab:tab})}
$('#tabBar').addEventListener('click',function(e){var btn=e.target.closest('.tab-btn');if(btn)switchTab(btn.getAttribute('data-tab'))});
document.addEventListener('click',function(e){
  var item=e.target.closest('.news-item');
  if(item&&item.getAttribute('data-url')){
    vscode.postMessage({type:'openUrl',url:item.getAttribute('data-url')});
    return;
  }
  if(e.target.closest('.wl-del')||e.target.closest('.wl-add')||e.target.closest('.detail-actions')||e.target.closest('.detail-tab')||e.target.closest('.detail-sub-close'))return;
  var card=e.target.closest('.wl-card');
  if(card&&card.dataset.idx!==undefined){
    var stock=_wlData[Number(card.dataset.idx)];
    if(stock)renderStockDetail(stock);
    return;
  }
  var row=e.target.closest('.stock-row');
  if(row&&row.dataset.code){
    openStockDetail(row.dataset.code,row.dataset.name||'');
    return;
  }
});
function openStockDetail(code,name){
  _detailCode=code;_detailName=name;_detailTab='news';
  renderStockDetail({code:code,name:name,price:0,changeRate:0,open:0,preClose:0,high:0,low:0,volume:0,amount:0,turnover:0});
}

function renderMarket(d){
  var list=d.diff||d.indices||d;if(!list||!list.length){$('#content').innerHTML='<div class="loading">暂无数据</div>';return}
  var dist=d.distribution||{};var counts=d.counts||{};var trade=d.trade||{};var yzt=d.yesterdayZt||{};
  var html='';
  html+='<div class="grid-3">';
  for(var i=0;i<Math.min(3,list.length);i++){var item=list[i];var price=item.price||item.f2||0;var rate=item.changeRate!=null?item.changeRate:(item.f3||0);var name=item.name||item.f14||'';var up=rate>=0;html+='<div class="card"><div class="text-muted mb-1">'+esc(name)+'</div><div class="'+(up?'text-up':'text-down')+'" style="font-size:18px;font-weight:700">'+(price||0).toFixed(2)+'</div><div class="'+(up?'text-up':'text-down')+'">'+(rate>=0?'+':'')+(rate||0).toFixed(2)+'%</div></div>'}
  html+='</div>';
  html+='<div class="card"><div style="display:flex;gap:12px;margin-bottom:8px">';
  html+='<span class="tag tag-up">涨 '+(counts.up||0)+'</span>';
  html+='<span class="text-muted" style="font-size:11px">平 '+(counts.flat||0)+'</span>';
  html+='<span class="tag tag-down">跌 '+(counts.down||0)+'</span>';
  html+='</div>';
  var bars=[
    {label:'涨停',val:dist.zt||0,color:'var(--up)'},
    {label:'>5%',val:dist.g5||0,color:'var(--up)'},
    {label:'>1%',val:dist.g1||0,color:'var(--up)'},
    {label:'>0%',val:dist.g0||0,color:'var(--up)'},
    {label:'平盘',val:dist.flat||0,color:'#666'},
    {label:'0~1%',val:dist.d0||0,color:'var(--down)'},
    {label:'1~5%',val:dist.d1||0,color:'var(--down)'},
    {label:'>5%',val:dist.d5||0,color:'var(--down)'},
    {label:'跌停',val:dist.dt||0,color:'var(--down)'}
  ];
  var maxVal=1;bars.forEach(function(b){if(b.val>maxVal)maxVal=b.val});
  html+='<div style="display:flex;align-items:flex-end;gap:3px;height:80px;margin:8px 0">';
  for(var i=0;i<bars.length;i++){var b=bars[i];var h=Math.max(2,Math.round(b.val/maxVal*70));html+='<div style="flex:1;display:flex;flex-direction:column;align-items:center"><div style="font-size:9px;color:'+b.color+';margin-bottom:2px">'+b.val+'</div><div style="width:100%;height:'+h+'px;background:'+b.color+';border-radius:2px 2px 0 0"></div><div style="font-size:8px;opacity:.5;margin-top:2px">'+b.label+'</div></div>'}
  html+='</div>';
  var total=(counts.up||0)+(counts.down||0)+(counts.flat||0);
  if(total>0){
    var upW=Math.round((counts.up||0)/total*100);
    var flatW=Math.round((counts.flat||0)/total*100);
    var downW=100-upW-flatW;
    html+='<div style="margin:8px 0"><div style="display:flex;height:16px;border-radius:3px;overflow:hidden">';
    html+='<div style="width:'+upW+'%;background:var(--up)"></div>';
    html+='<div style="width:'+flatW+'%;background:#666"></div>';
    html+='<div style="width:'+downW+'%;background:var(--down)"></div>';
    html+='</div>';
    html+='<div style="display:flex;justify-content:space-between;font-size:10px;margin-top:3px">';
    html+='<span class="text-up">涨 '+(counts.up||0)+'家</span>';
    html+='<span class="text-muted">平 '+(counts.flat||0)+'家</span>';
    html+='<span class="text-down">跌 '+(counts.down||0)+'家</span>';
    html+='</div></div>';
  }
  html+='</div>';
  if(yzt.count>0){
    html+='<div class="card"><div class="section-title">昨日涨停表现</div>';
    html+='<div class="flex items-center gap-2">';
    html+='<span>昨日涨停 <b>'+yzt.count+'</b> 家</span>';
    html+='<span class="'+(yzt.avgChange>=0?'text-up':'text-down')+'">今日平均 '+(yzt.avgChange>=0?'+':'')+(yzt.avgChange||0).toFixed(2)+'%</span>';
    html+='<span class="text-up">上涨 '+yzt.upCount+' 家</span>';
    html+='</div></div>';
  }
  if(trade.total>0){
    html+='<div class="card"><div class="section-title">三市成交额</div>';
    html+='<div style="font-size:16px;font-weight:700">'+fmtYi(trade.total)+'</div>';
    html+='<div class="text-muted" style="font-size:11px;margin-top:2px">';
    html+='沪 '+fmtYi(trade.sh||0)+' · 深 '+fmtYi(trade.sz||0)+' · 创 '+fmtYi(trade.cyb||0);
    html+='</div></div>';
  }
  if(list.length>3){html+='<div class="card"><div class="section-title">指数对比</div>';for(var j=0;j<list.length;j++){var it=list[j];var rt=it.changeRate!=null?it.changeRate:(it.f3||0);var up2=rt>=0;html+='<div class="flex items-center gap-2 mb-1"><span class="text-muted" style="width:80px">'+esc(it.name||it.f14||'')+'</span><span class="'+(up2?'text-up':'text-down')+'">'+(rt>=0?'+':'')+(rt||0).toFixed(2)+'%</span><span class="text-muted">'+(Number(it.price||it.f2)||0).toFixed(2)+'</span></div>'}html+='</div>'}
  $('#content').innerHTML=html
}

function renderNews(d){
  var list=d&&d.news?d.news:(d&&d.data?d.data.list:[]);if(!list.length){$('#content').innerHTML='<div class="loading">暂无新闻</div>';return}
  var html='';var newIds=[];
  for(var i=0;i<Math.min(80,list.length);i++){var n=list[i];var url=n.url_w||n.url_m||n.url||'';var title=n.title||n.Art_Title||'';var time=n.showtime||n.ctime||'';var src=n.Art_Media_Name||n.source||'';var content=n.content||n.digest||'';var nid=time+'_'+title;newIds.push(nid);html+='<div class="news-item" data-url="'+esc(url)+'"><div class="time">'+esc(time)+' '+(src?'· '+esc(src):'')+'</div><div class="title">'+esc(title)+'</div>';if(content)html+='<div style="font-size:11px;opacity:.6;margin-top:2px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">'+esc(content)+'</div>';html+='</div>'}
  if(voiceOn&&currentTab==='em_news'&&_lastNewsIds.length>0){
    var firstNew=newIds.indexOf(_lastNewsIds[0]);
    if(firstNew>0){for(var j=firstNew-1;j>=0;j--){var idx=newIds.indexOf(newIds[j]);if(idx>=0&&list[idx]){var t=list[idx].title||list[idx].Art_Title||'';if(t)speakText(t)}}}
  }
  _lastNewsIds=newIds;
  $('#content').innerHTML=html
}

function renderRealtimeNews(d){
  var list=d&&d.data?d.data.list:(d&&d.list?d.list:[]);if(!list||!list.length){$('#content').innerHTML='<div class="loading">暂无快讯</div>';return}
  var html='';var newIds=[];
  for(var i=0;i<Math.min(60,list.length);i++){
    var n=list[i];var title=n.title||n.Art_Title||n.digest||'';var time=n.showtime||n.ctime||n.display_time||'';var src=n.source||n.Art_Media_Name||'';
    var url=n.url_w||n.url_m||n.url||'';
    var nid=time+'_'+title;
    newIds.push(nid);
    html+='<div class="realtime-item'+(url?' news-item" data-url="'+esc(url):'')+'">';
    html+='<div class="rt-time">'+esc(time)+(src?' · '+esc(src):'')+'</div>';
    html+='<div class="rt-title">'+esc(title)+'</div></div>';
  }
  if(voiceOn&&currentTab==='realtime_news'&&_lastNewsIds.length>0){
    var firstNew=newIds.indexOf(_lastNewsIds[0]);
    if(firstNew>0){for(var j=firstNew-1;j>=0;j--){var idx=newIds.indexOf(newIds[j]);if(idx>=0&&list[idx]){var t=list[idx].title||list[idx].Art_Title||list[idx].digest||'';if(t)speakText(t)}}}
  }
  _lastNewsIds=newIds;
  $('#content').innerHTML=html;
}

function renderSector(d){
  var ind=d.industry||[];var gn=d.concept||[];
  var list=ind.concat(gn).sort(function(a,b){return (Number(b.netamount)||0)-(Number(a.netamount)||0)});
  if(!list||!list.length){$('#content').innerHTML='<div class="loading">暂无数据</div>';return}
  var html='<table><tr><th>板块</th><th>净流入</th><th>领涨股</th></tr>';
  for(var i=0;i<Math.min(30,list.length);i++){var x=list[i];var f=Number(x.netamount||0);var sc=(x.ts_symbol||'').replace(/^(sh|sz|bj)/,function(m){return m.toUpperCase()});html+='<tr><td>'+esc(x.name||'')+'</td><td class="'+(f>=0?'text-up':'text-down')+'">'+(f>=0?'+':'')+fmtYi(f)+'</td><td class="stock-row" data-code="'+esc(sc)+'" data-name="'+esc(x.ts_name||'')+'">'+esc(x.ts_name||'')+' <span class="'+(Number(x.ts_changeratio)>=0?'text-up':'text-down')+'">'+(Number(x.ts_changeratio)>=0?'+':'')+(Number(x.ts_changeratio)*100).toFixed(2)+'%</span></td></tr>'}
  html+='</table>';$('#content').innerHTML=html
}

function renderFundFlow(d){
  var ind=d.industry||[];var gn=d.concept||[];
  var indIn=ind.slice().sort(function(a,b){return (Number(b.netamount)||0)-(Number(a.netamount)||0)});
  var indOut=ind.slice().sort(function(a,b){return (Number(a.netamount)||0)-(Number(b.netamount)||0)});
  var gnIn=gn.slice().sort(function(a,b){return (Number(b.netamount)||0)-(Number(a.netamount)||0)});
  var gnOut=gn.slice().sort(function(a,b){return (Number(a.netamount)||0)-(Number(b.netamount)||0)});
  var html='<div class="section-title">行业资金流入 TOP10</div><table><tr><th>行业</th><th>净流入</th><th>领涨股</th></tr>';
  for(var i=0;i<Math.min(10,indIn.length);i++){var x=indIn[i];var f=Number(x.netamount||0);if(f<=0)break;var sc=(x.ts_symbol||'').replace(/^(sh|sz|bj)/,function(m){return m.toUpperCase()});html+='<tr><td>'+esc(x.name||'')+'</td><td class="text-up">+'+fmtYi(f)+'</td><td class="stock-row" data-code="'+esc(sc)+'" data-name="'+esc(x.ts_name||'')+'">'+esc(x.ts_name||'')+' <span class="'+(Number(x.ts_changeratio)>=0?'text-up':'text-down')+'">'+(Number(x.ts_changeratio)>=0?'+':'')+(Number(x.ts_changeratio)*100).toFixed(2)+'%</span></td></tr>'}
  html+='</table>';
  html+='<div class="section-title">行业资金流出 TOP10</div><table><tr><th>行业</th><th>净流出</th><th>领涨股</th></tr>';
  for(var i=0;i<Math.min(10,indOut.length);i++){var x=indOut[i];var f=Number(x.netamount||0);if(f>=0)break;var sc=(x.ts_symbol||'').replace(/^(sh|sz|bj)/,function(m){return m.toUpperCase()});html+='<tr><td>'+esc(x.name||'')+'</td><td class="text-down">'+fmtYi(f)+'</td><td class="stock-row" data-code="'+esc(sc)+'" data-name="'+esc(x.ts_name||'')+'">'+esc(x.ts_name||'')+' <span class="'+(Number(x.ts_changeratio)>=0?'text-up':'text-down')+'">'+(Number(x.ts_changeratio)>=0?'+':'')+(Number(x.ts_changeratio)*100).toFixed(2)+'%</span></td></tr>'}
  html+='</table>';
  html+='<div class="section-title">概念资金流入 TOP10</div><table><tr><th>概念</th><th>净流入</th><th>领涨股</th></tr>';
  for(var j=0;j<Math.min(10,gnIn.length);j++){var y=gnIn[j];var g=Number(y.netamount||0);if(g<=0)break;var sc=(y.ts_symbol||'').replace(/^(sh|sz|bj)/,function(m){return m.toUpperCase()});html+='<tr><td>'+esc(y.name||'')+'</td><td class="text-up">+'+fmtYi(g)+'</td><td class="stock-row" data-code="'+esc(sc)+'" data-name="'+esc(y.ts_name||'')+'">'+esc(y.ts_name||'')+' <span class="'+(Number(y.ts_changeratio)>=0?'text-up':'text-down')+'">'+(Number(y.ts_changeratio)>=0?'+':'')+(Number(y.ts_changeratio)*100).toFixed(2)+'%</span></td></tr>'}
  html+='</table>';
  html+='<div class="section-title">概念资金流出 TOP10</div><table><tr><th>概念</th><th>净流出</th><th>领涨股</th></tr>';
  for(var j=0;j<Math.min(10,gnOut.length);j++){var y=gnOut[j];var g=Number(y.netamount||0);if(g>=0)break;var sc=(y.ts_symbol||'').replace(/^(sh|sz|bj)/,function(m){return m.toUpperCase()});html+='<tr><td>'+esc(y.name||'')+'</td><td class="text-down">'+fmtYi(g)+'</td><td class="stock-row" data-code="'+esc(sc)+'" data-name="'+esc(y.ts_name||'')+'">'+esc(y.ts_name||'')+' <span class="'+(Number(y.ts_changeratio)>=0?'text-up':'text-down')+'">'+(Number(y.ts_changeratio)>=0?'+':'')+(Number(y.ts_changeratio)*100).toFixed(2)+'%</span></td></tr>'}
  html+='</table>';$('#content').innerHTML=html
}

function renderLimitPool(d){
  var pool=d&&d.data?d.data.pool:(d&&d.pool?d.pool:[]);if(!pool||!pool.length){$('#content').innerHTML='<div class="loading">暂无涨停数据</div>';return}
  pool=pool.slice().sort(function(a,b){return (b.lbc||0)-(a.lbc||0)||(b.zdp||0)-(a.zdp||0)});
  var html='<table><tr><th>名称/代码</th><th>连板</th><th>涨停原因</th><th>封板</th><th>炸板</th></tr>';
  for(var i=0;i<pool.length;i++){var x=pool[i];html+='<tr class="stock-row" data-code="'+esc(x.c||'')+'" data-name="'+esc(x.n||'')+'"><td>'+esc(x.n||'')+'<div class="text-muted" style="font-size:10px">'+esc(x.c||'')+'</div></td><td><span class="tag tag-up">'+(x.lbc||1)+'板</span></td><td class="text-muted">'+esc(x.hybk||'')+'</td><td>'+fmtTime(x.fbt)+'</td><td>'+(x.zbc||0)+'</td></tr>'}
  html+='</table>';$('#content').innerHTML=html
}

function renderLeader(d){
  var pool=d&&d.data?d.data.pool:(d&&d.pool?d.pool:[]);if(!pool||!pool.length){$('#content').innerHTML='<div class="loading">暂无数据</div>';return}
  pool=pool.slice().filter(function(x){return (x.lbc||1)>=2}).sort(function(a,b){return (b.lbc||0)-(a.lbc||0)||(b.zdp||0)-(a.zdp||0)});
  if(!pool.length){$('#content').innerHTML='<div class="loading">今日暂无连板股</div>';return}
  var html='<table><tr><th>名称/代码</th><th>连板</th><th>涨幅</th><th>板块</th></tr>';
  for(var i=0;i<pool.length;i++){var x=pool[i];html+='<tr class="stock-row" data-code="'+esc(x.c||'')+'" data-name="'+esc(x.n||'')+'"><td>'+esc(x.n||'')+'<div class="text-muted" style="font-size:10px">'+esc(x.c||'')+'</div></td><td><span class="tag tag-accent">'+(x.lbc||1)+'板</span></td><td class="text-up">+'+(x.zdp||0).toFixed(2)+'%</td><td class="text-muted">'+esc(x.hybk||'')+'</td></tr>'}
  html+='</table>';$('#content').innerHTML=html
}

function renderStrongSector(d){
  var pool=d&&d.data?d.data.pool:(d&&d.pool?d.pool:[]);if(!pool||!pool.length){$('#content').innerHTML='<div class="loading">暂无数据</div>';return}
  var map={};
  for(var i=0;i<pool.length;i++){var x=pool[i];var k=x.hybk||'其他';if(!map[k])map[k]={name:k,count:0,codes:[]};map[k].count++;if(map[k].codes.length<3)map[k].codes.push(x.n)}
  var arr=Object.keys(map).map(function(k){return map[k]}).sort(function(a,b){return b.count-a.count});
  var html='<table><tr><th>板块</th><th>涨停数</th><th>代表股</th></tr>';
  for(var j=0;j<arr.length;j++){var s=arr[j];html+='<tr><td>'+esc(s.name)+'</td><td><span class="tag tag-up">'+s.count+'</span></td><td class="text-muted">'+esc(s.codes.join('、'))+'</td></tr>'}
  html+='</table>';$('#content').innerHTML=html
}

function renderLhb(d){
  var list=d&&d.data?d.data.list:(d&&d.list?d.list:[]);if(!list||!list.length){$('#content').innerHTML='<div class="loading">暂无数据</div>';return}
  var html='<table><tr><th>名称/代码</th><th>涨跌幅</th><th>净买额</th><th>上榜原因</th></tr>';
  for(var i=0;i<list.length;i++){var x=list[i];var net=Number(x.BILLBOARD_NET_AMT||0);html+='<tr class="stock-row" data-code="'+esc(x.SECURITY_CODE||'')+'" data-name="'+esc(x.SECURITY_NAME_ABBR||'')+'"><td>'+esc(x.SECURITY_NAME_ABBR||'')+'<div class="text-muted" style="font-size:10px">'+esc(x.SECURITY_CODE||'')+'</div></td><td class="'+upClass(x.CHANGE_RATE)+'">'+upSign(x.CHANGE_RATE)+(x.CHANGE_RATE||0).toFixed(2)+'%</td><td class="'+(net>=0?'text-up':'text-down')+'">'+(net>=0?'+':'')+fmtYi(net)+'</td><td class="text-muted">'+esc(x.EXPLANATION||x.EXPLAIN||'')+'</td></tr>'}
  html+='</table>';$('#content').innerHTML=html
}

function renderAlert(d){
  var list=d&&d.data?d.data.list:(d&&d.list?d.list:[]);if(!list||!list.length){$('#content').innerHTML='<div class="loading">暂无异动</div>';return}
  var html='<table><tr><th>时间</th><th>名称/代码</th><th>异动</th><th>信息</th></tr>';
  var newIds=[];
  for(var i=0;i<Math.min(60,list.length);i++){var x=list[i];var label=CHG_TYPES[x.t]||('类型'+x.t);var isUp=(x.t==4||x.t==8||x.t==32||x.t==128||x.t==8193||x.t==8194||x.t==8201||x.t==8207||x.t==8209||x.t==8211||x.t==8213||x.t==8215);var aid=x.tm+'_'+x.c+'_'+x.t;newIds.push(aid);html+='<tr class="stock-row" data-code="'+esc(x.c||'')+'" data-name="'+esc(x.n||'')+'"><td class="text-muted">'+fmtTime(x.tm)+'</td><td>'+esc(x.n||'')+'<div class="text-muted" style="font-size:10px">'+esc(x.c||'')+'</div></td><td><span class="tag '+(isUp?'tag-up':'tag-down')+'">'+esc(label)+'</span></td><td class="text-muted">'+esc(x.i||'')+'</td></tr>'}
  html+='</table>';
  if(voiceOn&&currentTab==='alert'&&_lastAlertIds.length>0){
    var firstNew=newIds.indexOf(_lastAlertIds[0]);
    if(firstNew>0){for(var j=firstNew-1;j>=0;j--){var idx=newIds.indexOf(newIds[j]);if(idx>=0&&list[idx]){var x=list[idx];var lbl=CHG_TYPES[x.t]||'异动';speakText((x.n||'')+lbl+(x.i||''))}}}
  }
  _lastAlertIds=newIds;
  $('#content').innerHTML=html
}

function renderHot(d){
  var list=d&&d.data?d.data.diff:(d&&d.diff?d.diff:[]);if(!list||!list.length){$('#content').innerHTML='<div class="loading">暂无数据</div>';return}
  var html='<table><tr><th>代码</th><th>名称</th><th>最新价</th><th>涨跌幅</th></tr>';
  for(var i=0;i<Math.min(30,list.length);i++){var x=list[i];html+='<tr class="stock-row" data-code="'+esc(x.f12||'')+'" data-name="'+esc(x.f14||'')+'"><td>'+esc(x.f12||'')+'</td><td>'+esc(x.f14||'')+'</td><td>'+(x.f2||0).toFixed(2)+'</td><td class="'+upClass(x.f3)+'">'+upSign(x.f3)+(x.f3||0).toFixed(2)+'%</td></tr>'}
  html+='</table>';$('#content').innerHTML=html
}

var _wlData=[];
function renderWatchlist(d){
  var list=d&&d.indices?d.indices:(d&&d.data?d.data.diff:[]);
  _wlData=[];
  var html='';
  if(!list||!list.length){
    html='<div class="loading">暂无自选股</div>';
  }else{
    for(var i=0;i<list.length;i++){
      var x=list[i];
      _wlData.push({code:x.f12,name:x.f14,price:x.f2,changeRate:x.f3,open:x.f17,preClose:x.f18,high:x.f15,low:x.f16,volume:x.f5,amount:x.f6,turnover:x.f8});
      var code=esc(x.f12||'');var name=esc(x.f14||'');var price=(x.f2||0).toFixed(2);
      var rate=x.f3||0;var up=rate>=0;
      html+='<div class="wl-card" data-idx="'+i+'"><div class="wl-row"><div class="wl-name"><div class="nm">'+name+'</div><div class="cd">'+code+'</div></div><div class="wl-price"><div class="pr '+(up?'text-up':'text-down')+'">'+price+'</div></div><div class="wl-chg"><span class="tag '+(up?'tag-up':'tag-down')+'">'+(up?'+':'')+rate.toFixed(2)+'%</span></div><button class="wl-del" data-code="'+code+'">删除</button></div></div>';
    }
  }
  html+='<div class="wl-add"><button id="addStockBtn">+ 添加自选股</button></div>';
  $('#content').innerHTML=html;
  var btn=document.getElementById('addStockBtn');
  if(btn)btn.addEventListener('click',function(e){e.stopPropagation();vscode.postMessage({type:'addWatch'})});
  var delBtns=document.querySelectorAll('.wl-del');
  for(var j=0;j<delBtns.length;j++){
    delBtns[j].addEventListener('click',function(e){
      e.stopPropagation();
      vscode.postMessage({type:'delWatch',code:this.getAttribute('data-code')});
    });
  }
}

function renderStockDetail(s){
  var code=esc(s.code||'');var rawCode=s.code||'';var name=esc(s.name||_detailName||'');var price=Number(s.price||0).toFixed(2);
  var rate=Number(s.changeRate||0);var up=rate>=0;
  var preClose=Number(s.preClose||0).toFixed(2);
  var open=Number(s.open||0).toFixed(2);
  var high=Number(s.high||0).toFixed(2);
  var low=Number(s.low||0).toFixed(2);
  var vol=Number(s.volume||0);var volStr=vol>=10000?(vol/10000).toFixed(1)+'万':vol.toLocaleString('zh-CN');
  var amt=Number(s.amount||0);var amtStr=amt>=100000000?(amt/100000000).toFixed(2)+'亿':amt>=10000?(amt/10000).toFixed(1)+'万':amt.toLocaleString('zh-CN');
  var turnover=Number(s.turnover||0).toFixed(2);
  var chg=Number(s.price||0)-Number(s.preClose||0);var chgStr=(chg>=0?'+':'')+chg.toFixed(2);
  var html='<button class="detail-back" id="detailBack">← 返回</button>';
  html+='<div class="detail-card">';
  html+='<div class="detail-hdr"><span class="nm">'+name+'</span><span class="cd">'+code+'</span></div>';
  html+='<div class="detail-price '+(up?'text-up':'text-down')+'">'+price+'</div>';
  html+='<div><span class="detail-tag '+(up?'tag-up':'tag-down')+'">'+chgStr+' ('+(up?'+':'')+rate.toFixed(2)+'%)</span></div>';
  html+='<div class="detail-grid">';
  html+='<div class="detail-cell"><div class="lbl">昨收</div><div class="val">'+preClose+'</div></div>';
  html+='<div class="detail-cell"><div class="lbl">开盘</div><div class="val">'+open+'</div></div>';
  html+='<div class="detail-cell"><div class="lbl">最高</div><div class="val text-up">'+high+'</div></div>';
  html+='<div class="detail-cell"><div class="lbl">最低</div><div class="val text-down">'+low+'</div></div>';
  html+='<div class="detail-cell"><div class="lbl">成交量</div><div class="val">'+volStr+'</div></div>';
  html+='<div class="detail-cell"><div class="lbl">成交额</div><div class="val">'+amtStr+'</div></div>';
  html+='<div class="detail-cell"><div class="lbl">换手率</div><div class="val">'+turnover+'%</div></div>';
  html+='<div class="detail-cell"><div class="lbl">涨跌额</div><div class="val '+(up?'text-up':'text-down')+'">'+chgStr+'</div></div>';
  html+='</div>';
  html+='</div>';
  html+='<div class="kl-toolbar" id="klToolbar">';
  html+='<button class="kl-pbtn active" data-period="intraday">分时</button>';
  html+='<button class="kl-pbtn" data-period="5m">5分</button>';
  html+='<button class="kl-pbtn" data-period="15m">15分</button>';
  html+='<button class="kl-pbtn" data-period="30m">30分</button>';
  html+='<button class="kl-pbtn" data-period="60m">60分</button>';
  html+='<button class="kl-pbtn" data-period="day">日K</button>';
  html+='<button class="kl-pbtn" data-period="week">周K</button>';
  html+='<button class="kl-pbtn" data-period="month">月K</button>';
  html+='<button class="kl-add" id="klAddSub">+ 副图</button>';
  html+='</div>';
  html+='<div class="kl-chart-wrap" id="klChartWrap">';
  html+='<div class="kl-chart" id="klChart">';
  html+='<canvas class="kl-canvas" id="klMain"></canvas>';
  html+='<div class="kl-sub" id="klSubVol"><div class="kl-sub-hdr"><span>成交量</span></div><canvas class="kl-canvas" id="klVol"></canvas></div>';
  html+='</div>';
  html+='<div class="kl-side" id="klSide">';
  html+='<div class="kl-side-title">五档盘口</div>';
  html+='<div id="orderBook"></div>';
  html+='<div class="kl-side-title" style="margin-top:8px">分时成交</div>';
  html+='<div id="tickList"></div>';
  html+='</div>';
  html+='</div>';
  html+='<div class="detail-actions"><button class="btn-del" id="detailDel">删除自选</button><button class="btn-back" id="detailBackBtn">返回列表</button></div>';
  html+='<div class="detail-tabs" id="detailTabs">';
  html+='<button class="detail-tab active" data-dtab="news">资讯</button>';
  html+='<button class="detail-tab" data-dtab="notice">公告</button>';
  html+='<button class="detail-tab" data-dtab="finance">财务</button>';
  html+='<button class="detail-tab" data-dtab="profile">资料</button>';
  html+='</div>';
  html+='<div class="detail-panel" id="detailPanel"><div class="loading" style="padding:10px">加载中...</div></div>';
  $('#content').innerHTML=html;
  var goBack=function(){if(_intradayTimer){clearInterval(_intradayTimer);_intradayTimer=null}vscode.postMessage({type:'switchTab',tab:currentTab==='detail'?'watchlist':currentTab})};
  var backBtn=document.getElementById('detailBack');
  if(backBtn)backBtn.addEventListener('click',goBack);
  var backBtn2=document.getElementById('detailBackBtn');
  if(backBtn2)backBtn2.addEventListener('click',goBack);
  var delBtn=document.getElementById('detailDel');
  if(delBtn)delBtn.addEventListener('click',function(){vscode.postMessage({type:'delWatch',code:s.code})});
  _detailCode=s.code;_detailName=s.name||_detailName;_detailTab='news';_klPeriod='intraday';
  vscode.postMessage({type:'fetchKline',code:s.code,period:'intraday'});
  vscode.postMessage({type:'fetchStockNews',code:s.code});
  var pbtns=document.querySelectorAll('.kl-pbtn[data-period]');
  for(var i=0;i<pbtns.length;i++){
    pbtns[i].addEventListener('click',function(){
      _klPeriod=this.dataset.period;
      if(_intradayTimer){clearInterval(_intradayTimer);_intradayTimer=null}
      vscode.postMessage({type:'fetchKline',code:s.code,period:_klPeriod});
      updateSubBtns();
    });
  }
  var dtabs=document.querySelectorAll('.detail-tab[data-dtab]');
  for(var i=0;i<dtabs.length;i++){
    dtabs[i].addEventListener('click',function(){
      _detailTab=this.dataset.dtab;
      var all=document.querySelectorAll('.detail-tab[data-dtab]');
      for(var j=0;j<all.length;j++)all[j].classList.toggle('active',all[j].dataset.dtab===_detailTab);
      var panel=document.getElementById('detailPanel');
      if(panel)panel.innerHTML='<div class="loading" style="padding:10px">加载中...</div>';
      if(_detailTab==='news')vscode.postMessage({type:'fetchStockNews',code:s.code});
      else if(_detailTab==='notice')vscode.postMessage({type:'fetchStockNotice',code:s.code});
      else if(_detailTab==='finance')vscode.postMessage({type:'fetchStockFinance',code:s.code});
      else if(_detailTab==='profile')vscode.postMessage({type:'fetchStockProfile',code:s.code});
    });
  }
}

var _detailCode='';var _detailName='';var _detailTab='news';var _klPeriod='intraday';
var _kl={data:[],scroll:0,subs:['vol'],dragging:false,dragX:0};
var _klCanvases={};
function parseKline(rows){
  var d=[];
  for(var i=0;i<rows.length;i++){
    var p=rows[i].split(',');if(p.length<5)continue;
    d.push({date:p[0],open:+p[1],close:+p[2],high:+p[3],low:+p[4],vol:+(p[5]||0)});
  }
  return d;
}
function calcMA(data,n){
  var r=[];for(var i=0;i<data.length;i++){
    if(i<n-1){r.push(null);continue}
    var s=0;for(var j=i-n+1;j<=i;j++)s+=data[j].close;
    r.push(s/n);
  }return r;
}
function calcMACD(data){
  var ema12=[],ema26=[],dif=[],dea=[],macd=[];
  var a12=2/13,a26=2/27,aD=2/10;
  for(var i=0;i<data.length;i++){
    var c=data[i].close;
    ema12.push(i===0?c:ema12[i-1]+a12*(c-ema12[i-1]));
    ema26.push(i===0?c:ema26[i-1]+a26*(c-ema26[i-1]));
    var d=ema12[i]-ema26[i];
    dif.push(d);
    dea.push(i===0?d:dea[i-1]+aD*(d-dea[i-1]));
    macd.push((dif[i]-dea[i])*2);
  }
  return{dif:dif,dea:dea,macd:macd};
}
function calcRSI(data,n){
  var r=[];var avgG=0,avgL=0;
  for(var i=0;i<data.length;i++){
    if(i===0){r.push(50);continue}
    var chg=data[i].close-data[i-1].close;
    var g=chg>0?chg:0,l=chg<0?-chg:0;
    if(i<=n){avgG=(avgG*(i-1)+g)/i;avgL=(avgL*(i-1)+l)/i}
    else{avgG=(avgG*(n-1)+g)/n;avgL=(avgL*(n-1)+l)/n}
    r.push(avgL===0?100:100-100/(1+avgG/avgL));
  }return r;
}
function renderChart(){
  var main=document.getElementById('klMain');
  if(!main||!_kl.data.length)return;
  var dpr=window.devicePixelRatio||1;
  var W=main.parentElement.clientWidth-12;
  var mainH=Math.max(120,W*0.45);
  var subH=Math.max(60,W*0.18);
  main.style.width=W+'px';main.style.height=mainH+'px';
  main.width=W*dpr;main.height=mainH*dpr;
  _klCanvases.main=main;
  for(var i=0;i<_kl.subs.length;i++){
    var sid=_kl.subs[i];
    var c=document.getElementById('kl'+sid.charAt(0).toUpperCase()+sid.slice(1));
    if(c){c.style.width=W+'px';c.style.height=subH+'px';c.width=W*dpr;c.height=subH*dpr;_klCanvases[sid]=c}
  }
  drawMain(main,_kl.data);
  for(var i=0;i<_kl.subs.length;i++){
    var sid=_kl.subs[i];
    var c=_klCanvases[sid];
    if(!c)continue;
    if(sid==='vol')drawVol(c,_kl.data);
    else if(sid==='macd')drawMACD(c,_kl.data);
    else if(sid==='rsi')drawRSI(c,_kl.data);
  }
}
function drawMain(canvas,data){
  var dpr=window.devicePixelRatio||1;
  var ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  var W=canvas.width/dpr,H=canvas.height/dpr;
  ctx.fillStyle='#12151a';ctx.fillRect(0,0,W,H);
  var padL=46,padR=8,padT=6,padB=18;
  var cW=W-padL-padR,cH=H-padT-padB;
  var barW=Math.max(2,Math.min(14,cW/60*0.7));
  var gap=cW/60;
  var totalBars=Math.floor(cW/gap);
  var maxScroll=Math.max(0,data.length-totalBars);
  _kl.scroll=Math.max(0,Math.min(_kl.scroll,maxScroll));
  var start=Math.floor(_kl.scroll);
  var vis=[];for(var i=start;i<Math.min(data.length,start+totalBars+2);i++)vis.push(data[i]);
  if(!vis.length)return;
  var minP=Infinity,maxP=-Infinity;
  for(var i=0;i<vis.length;i++){if(vis[i].low<minP)minP=vis[i].low;if(vis[i].high>maxP)maxP=vis[i].high}
  var pR=maxP-minP||1;minP-=pR*0.05;maxP+=pR*0.05;pR=maxP-minP;
  ctx.strokeStyle='#1f2124';ctx.lineWidth=0.5;
  for(var i=0;i<=4;i++){
    var y=padT+cH*i/4;ctx.beginPath();ctx.moveTo(padL,y);ctx.lineTo(W-padR,y);ctx.stroke();
    ctx.fillStyle='#666';ctx.font='10px monospace';ctx.textAlign='right';
    ctx.fillText((maxP-pR*i/4).toFixed(2),padL-4,y+3);
  }
  for(var i=0;i<vis.length;i++){
    var d=vis[i],x=padL+gap*(i-(start%1))+gap/2;
    var isUp=d.close>=d.open;var color=isUp?'#ff4d4f':'#23c343';
    var oY=padT+cH*(1-(d.open-minP)/pR);var cY=padT+cH*(1-(d.close-minP)/pR);
    var hY=padT+cH*(1-(d.high-minP)/pR);var lY=padT+cH*(1-(d.low-minP)/pR);
    ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,hY);ctx.lineTo(x,lY);ctx.stroke();
    var bodyTop=Math.min(oY,cY);var bodyH=Math.max(Math.abs(oY-cY),1);
    ctx.fillStyle=color;ctx.fillRect(x-barW/2,bodyTop,barW,bodyH);
  }
  var ma5=calcMA(data,5),ma10=calcMA(data,10),ma20=calcMA(data,20);
  var maColors=['#e8b339','#36a2eb','#cc65fe'];
  var mas=[ma5,ma10,ma20];
  for(var m=0;m<mas.length;m++){
    ctx.strokeStyle=maColors[m];ctx.lineWidth=1;ctx.beginPath();var started=false;
    for(var i=0;i<vis.length;i++){
      var gi=start+i;var v=mas[m][gi];if(v==null)continue;
      var x=padL+gap*(i-(start%1))+gap/2;
      var y=padT+cH*(1-(v-minP)/pR);
      if(!started){ctx.moveTo(x,y);started=true}else ctx.lineTo(x,y);
    }ctx.stroke();
  }
  ctx.fillStyle='#666';ctx.font='10px monospace';ctx.textAlign='center';
  var dateStep=Math.max(1,Math.floor(vis.length/5));
  for(var i=0;i<vis.length;i+=dateStep){
    var x=padL+gap*(i-(start%1))+gap/2;
    ctx.fillText(vis[i].date.slice(5),x,H-4);
  }
  var labels=['MA5','MA10','MA20'];
  for(var m=0;m<3;m++){
    ctx.fillStyle=maColors[m];ctx.font='10px sans-serif';ctx.textAlign='left';
    ctx.fillText(labels[m],padL+m*44,padT+10);
  }
}
function drawVol(canvas,data){
  var dpr=window.devicePixelRatio||1;
  var ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  var W=canvas.width/dpr,H=canvas.height/dpr;
  ctx.fillStyle='#12151a';ctx.fillRect(0,0,W,H);
  var padL=46,padR=8,padT=4,padB=4;
  var cW=W-padL-padR,cH=H-padT-padB;
  var barW=Math.max(2,Math.min(14,cW/60*0.7));var gap=cW/60;
  var totalBars=Math.floor(cW/gap);var start=Math.floor(_kl.scroll);
  var vis=[];for(var i=start;i<Math.min(data.length,start+totalBars+2);i++)vis.push(data[i]);
  if(!vis.length)return;
  var maxV=0;for(var i=0;i<vis.length;i++)if(vis[i].vol>maxV)maxV=vis[i].vol;
  if(maxV===0)return;
  ctx.strokeStyle='#1f2124';ctx.lineWidth=0.5;
  for(var i=0;i<=2;i++){var y=padT+cH*i/2;ctx.beginPath();ctx.moveTo(padL,y);ctx.lineTo(W-padR,y);ctx.stroke()}
  for(var i=0;i<vis.length;i++){
    var d=vis[i],x=padL+gap*(i-(start%1))+gap/2;
    var vH=cH*(d.vol/maxV);var isUp=d.close>=d.open;
    ctx.fillStyle=isUp?'rgba(255,77,79,.4)':'rgba(35,195,67,.4)';
    ctx.fillRect(x-barW/2,padT+cH-vH,barW,vH);
  }
  ctx.fillStyle='#666';ctx.font='9px monospace';ctx.textAlign='right';
  ctx.fillText((maxV/10000).toFixed(0)+'万',padL-4,padT+10);
}
function drawMACD(canvas,data){
  var dpr=window.devicePixelRatio||1;
  var ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  var W=canvas.width/dpr,H=canvas.height/dpr;
  ctx.fillStyle='#12151a';ctx.fillRect(0,0,W,H);
  var padL=46,padR=8,padT=4,padB=4;
  var cW=W-padL-padR,cH=H-padT-padB;
  var barW=Math.max(2,Math.min(14,cW/60*0.7));var gap=cW/60;
  var totalBars=Math.floor(cW/gap);var start=Math.floor(_kl.scroll);
  var md=calcMACD(data);var vis=[];var visM=[];
  for(var i=start;i<Math.min(data.length,start+totalBars+2);i++){vis.push(md.macd[i]);visM.push({dif:md.dif[i],dea:md.dea[i]})}
  if(!vis.length)return;
  var mx=0;for(var i=0;i<vis.length;i++){var a=Math.abs(vis[i]);if(a>mx)mx=a;var d2=Math.abs(visM[i].dif);if(d2>mx)mx=d2;var d3=Math.abs(visM[i].dea);if(d3>mx)mx=d3}
  mx*=1.2||1;var sc=cH/(mx*2);var mid=padT+cH/2;
  ctx.strokeStyle='#1f2124';ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(padL,mid);ctx.lineTo(W-padR,mid);ctx.stroke();
  for(var i=0;i<vis.length;i++){
    var x=padL+gap*(i-(start%1))+gap/2;var v=vis[i];
    var bH=Math.abs(v)*sc;ctx.fillStyle=v>=0?'rgba(255,77,79,.6)':'rgba(35,195,67,.6)';
    ctx.fillRect(x-barW/2,v>=0?mid-bH:mid,barW,bH);
  }
  var lineColor=['#36a2eb','#e8b393'];
  for(var L=0;L<2;L++){
    ctx.strokeStyle=lineColor[L];ctx.lineWidth=1;ctx.beginPath();var st=false;
    for(var i=0;i<vis.length;i++){
      var x=padL+gap*(i-(start%1))+gap/2;
      var v=L===0?visM[i].dif:visM[i].dea;var y=mid-v*sc;
      if(!st){ctx.moveTo(x,y);st=true}else ctx.lineTo(x,y);
    }ctx.stroke();
  }
  ctx.fillStyle='#666';ctx.font='9px sans-serif';ctx.textAlign='left';
  ctx.fillText('MACD(12,26,9)',padL,padT+10);
}
function drawRSI(canvas,data){
  var dpr=window.devicePixelRatio||1;
  var ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  var W=canvas.width/dpr,H=canvas.height/dpr;
  ctx.fillStyle='#12151a';ctx.fillRect(0,0,W,H);
  var padL=46,padR=8,padT=4,padB=4;
  var cW=W-padL-padR,cH=H-padT-padB;
  var gap=cW/60;var totalBars=Math.floor(cW/gap);var start=Math.floor(_kl.scroll);
  var rsi6=calcRSI(data,6),rsi12=calcRSI(data,12);
  var vis6=[],vis12=[];
  for(var i=start;i<Math.min(data.length,start+totalBars+2);i++){vis6.push(rsi6[i]);vis12.push(rsi12[i])}
  if(!vis6.length)return;
  var sc=cH/100;
  ctx.strokeStyle='#1f2124';ctx.lineWidth=0.5;
  [30,50,70].forEach(function(v){var y=padT+cH*(1-v/100);ctx.beginPath();ctx.moveTo(padL,y);ctx.lineTo(W-padR,y);ctx.stroke();
    ctx.fillStyle='#555';ctx.font='9px monospace';ctx.textAlign='right';ctx.fillText(v+'',padL-4,y+3)});
  var colors=['#36a2eb','#e8b393'];
  [vis6,vis12].forEach(function(vis,ci){
    ctx.strokeStyle=colors[ci];ctx.lineWidth=1;ctx.beginPath();var st=false;
    for(var i=0;i<vis.length;i++){var x=padL+gap*(i-(start%1))+gap/2;var y=padT+cH*(1-vis[i]/100);
      if(!st){ctx.moveTo(x,y);st=true}else ctx.lineTo(x,y)}ctx.stroke()});
  ctx.fillStyle='#666';ctx.font='9px sans-serif';ctx.textAlign='left';
  ctx.fillText('RSI(6,12)',padL,padT+10);
}
function setupChartDrag(){
  var el=document.getElementById('klChart');if(!el)return;
  el.addEventListener('mousedown',function(e){if(e.button!==0)return;_kl.dragging=true;_kl.dragX=e.clientX;e.preventDefault()});
  window.addEventListener('mousemove',function(e){
    if(!_kl.dragging)return;
    var dx=e.clientX-_kl.dragX;_kl.dragX=e.clientX;
    var gap=(_klCanvases.main?_klCanvases.main.clientWidth:300)/60;
    _kl.scroll-=dx/gap;
    var maxS=Math.max(0,_kl.data.length-60);_kl.scroll=Math.max(0,Math.min(_kl.scroll,maxS));
    renderChart();
  });
  window.addEventListener('mouseup',function(){_kl.dragging=false});
  var mc=document.getElementById('klMain');
  if(mc)mc.addEventListener('mouseleave',function(){if(!_kl.dragging)document.getElementById('klChart').style.cursor='crosshair'});
}
function toggleSubChart(id){
  var idx=_kl.subs.indexOf(id);
  if(idx>=0){if(id==='vol')return;_kl.subs.splice(idx,1)}
  else{_kl.subs.push(id)}
  refreshSubChartDOM();updateSubBtns();renderChart();
}
function refreshSubChartDOM(){
  var ct=document.getElementById('klChart');if(!ct)return;
  var labels={vol:'成交量',macd:'MACD',rsi:'RSI'};
  var existing=ct.querySelectorAll('.kl-sub');for(var i=0;i<existing.length;i++)existing[i].remove();
  for(var i=0;i<_kl.subs.length;i++){
    var sid=_kl.subs[i];var div=document.createElement('div');div.className='kl-sub';div.id='klSub'+sid.charAt(0).toUpperCase()+sid.slice(1);
    var hdr=document.createElement('div');hdr.className='kl-sub-hdr';
    var sp=document.createElement('span');sp.textContent=labels[sid]||sid;hdr.appendChild(sp);
    if(sid!=='vol'){var btn=document.createElement('button');btn.textContent='×';btn.dataset.sub=sid;
      btn.addEventListener('click',function(){toggleSubChart(this.dataset.sub)});hdr.appendChild(btn)}
    div.appendChild(hdr);
    var cv=document.createElement('canvas');cv.className='kl-canvas';cv.id='kl'+sid.charAt(0).toUpperCase()+sid.slice(1);
    div.appendChild(cv);ct.appendChild(div);
  }
}
function updateSubBtns(){
  var btns=document.querySelectorAll('.kl-pbtn[data-period]');
  for(var i=0;i<btns.length;i++)btns[i].classList.toggle('active',btns[i].dataset.period===_klPeriod);
  var addBtn=document.getElementById('klAddSub');
  if(addBtn){
    var items=[{id:'macd',label:'MACD'},{id:'rsi',label:'RSI'}];
    var html='';
    for(var i=0;i<items.length;i++){
      var active=_kl.subs.indexOf(items[i].id)>=0;
      html+='<span style="padding:2px 8px;border-radius:3px;font-size:10px;cursor:pointer;margin-left:4px;background:'+(active?'rgba(255,77,79,.2)':'rgba(255,255,255,.05)')+';color:'+(active?'#ff4d4f':'#888')+'" data-sub="'+items[i].id+'">'+items[i].label+'</span>';
    }
    addBtn.innerHTML='+ 副图'+html;
    var tags=addBtn.querySelectorAll('[data-sub]');
    for(var j=0;j<tags.length;j++)tags[j].addEventListener('click',function(){toggleSubChart(this.dataset.sub)});
  }
}
function drawKline(rows){
  _kl.data=parseKline(rows);
  _kl.scroll=Math.max(0,_kl.data.length-60);
  refreshSubChartDOM();updateSubBtns();setupChartDrag();renderChart();
}

var _intradayTimer=null;
function drawIntraday(d){
  if(_intradayTimer){clearInterval(_intradayTimer);_intradayTimer=null}
  var minutes=d.minutes||[];var preClose=Number(d.preClose||0);
  _kl.data=[];_kl.subs=['vol'];_kl.scroll=0;
  var canvas=document.getElementById('klMain');if(!canvas)return;
  var dpr=window.devicePixelRatio||1;var W=canvas.parentElement.clientWidth-12;
  var mainH=Math.max(120,W*0.45);canvas.style.width=W+'px';canvas.style.height=mainH+'px';
  canvas.width=W*dpr;canvas.height=mainH*dpr;
  var subH=Math.max(60,W*0.18);
  var volC=document.getElementById('klVol');
  if(volC){volC.style.width=W+'px';volC.style.height=subH+'px';volC.width=W*dpr;volC.height=subH*dpr}
  var ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  ctx.fillStyle='#12151a';ctx.fillRect(0,0,W,mainH);
  if(!minutes.length){ctx.fillStyle='#666';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText('暂无分时数据',W/2,mainH/2);return}
  function timeToMin(t){
    var h=Number(t.slice(0,2)),m=Number(t.slice(2,4));
    if(h<9||(h===9&&m<30))return 0;
    if(h>=13)return(h-13)*60+m+120;
    if(h>=11&&m>30)return 120;
    return(h-9)*60+m-30;
  }
  var data=[];
  for(var i=0;i<minutes.length;i++){
    var p=minutes[i].split(',');if(p.length<2)continue;
    data.push({time:p[0],price:Number(p[1]),min:timeToMin(p[0])});
  }
  if(!data.length)return;
  if(!preClose)preClose=data[0].price;
  var totalMin=240;
  var padL=46,padR=8,padT=8,padB=20;
  var cW=W-padL-padR,cH=mainH-padT-padB;
  var minP=preClose,maxP=preClose;
  for(var i=0;i<data.length;i++){if(data[i].price<minP)minP=data[i].price;if(data[i].price>maxP)maxP=data[i].price}
  var pR=maxP-minP||1;minP-=pR*0.1;maxP+=pR*0.1;pR=maxP-minP;
  ctx.strokeStyle='#1f2124';ctx.lineWidth=0.5;
  for(var i=0;i<=4;i++){var y=padT+cH*i/4;ctx.beginPath();ctx.moveTo(padL,y);ctx.lineTo(W-padR,y);ctx.stroke();
    ctx.fillStyle='#666';ctx.font='10px monospace';ctx.textAlign='right';
    var v=maxP-pR*i/4;ctx.fillText(v.toFixed(2),padL-4,y+3);
    var pct=((v-preClose)/preClose*100).toFixed(2);ctx.fillStyle=v>=preClose?'#ff4d4f':'#23c343';ctx.textAlign='left';ctx.fillText(pct+'%',W-padR+2,y+3);
  }
  var closeY=padT+cH*(1-(preClose-minP)/pR);
  ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(padL,closeY);ctx.lineTo(W-padR,closeY);ctx.stroke();ctx.setLineDash([]);
  ctx.beginPath();ctx.strokeStyle='#36a2eb';ctx.lineWidth=1.5;
  for(var i=0;i<data.length;i++){
    var x=padL+cW*data[i].min/totalMin;
    var y=padT+cH*(1-(data[i].price-minP)/pR);
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }ctx.stroke();
  var grad=ctx.createLinearGradient(0,padT,0,padT+cH);grad.addColorStop(0,'rgba(54,162,235,.2)');grad.addColorStop(1,'rgba(54,162,235,.02)');
  ctx.lineTo(padL+cW*data[data.length-1].min/totalMin,padT+cH);ctx.lineTo(padL,padT+cH);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  ctx.fillStyle='#666';ctx.font='10px monospace';ctx.textAlign='center';
  var tickMins=[0,60,120,180,240];var tickLabels=['09:30','10:30','11:30/13:00','14:00','15:00'];
  for(var i=0;i<tickMins.length;i++){var x=padL+cW*tickMins[i]/totalMin;ctx.fillText(tickLabels[i],x,mainH-4)}
  if(volC){
    var vctx=volC.getContext('2d');vctx.scale(dpr,dpr);
    var vW=volC.width/dpr,vH=volC.height/dpr;
    vctx.fillStyle='#12151a';vctx.fillRect(0,0,vW,vH);
    vctx.fillStyle='#666';vctx.font='10px sans-serif';vctx.textAlign='center';
    vctx.fillText('分时量能',vW/2,vH/2+3);
  }
  _intradayTimer=setInterval(function(){
    if(_klPeriod==='intraday'&&_detailCode){
      vscode.postMessage({type:'fetchKline',code:_detailCode,period:'intraday'});
    }
  },3000);
}

function updateOrderBook(d){
  if(!d)return;
  var ob=document.getElementById('orderBook');if(!ob)return;
  var preClose=Number(d.f18||0);
  var html='';
  var sells=[
    {label:'卖5',price:d.sell5,vol:d.sell5vol},
    {label:'卖4',price:d.sell4,vol:d.sell4vol},
    {label:'卖3',price:d.sell3,vol:d.sell3vol},
    {label:'卖2',price:d.sell2,vol:d.sell2vol},
    {label:'卖1',price:d.sell1,vol:d.sell1vol},
  ];
  for(var i=0;i<sells.length;i++){
    var s=sells[i];var cls=s.price>preClose?'ob-up':(s.price<preClose?'ob-down':'');
    html+='<div class="ob-row"><span class="ob-label">'+s.label+'</span>';
    html+='<span class="ob-price '+cls+'">'+(s.price?s.price.toFixed(2):'-')+'</span>';
    html+='<span class="ob-vol">'+(s.vol?s.vol:'-')+'</span></div>';
  }
  html+='<div class="ob-row" style="border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:2px 0;margin:2px 0">';
  html+='<span class="ob-label"></span><span class="ob-price" style="font-weight:600">'+Number(d.f2||0).toFixed(2)+'</span>';
  html+='<span class="ob-vol"></span></div>';
  var buys=[
    {label:'买1',price:d.buy1,vol:d.buy1vol},
    {label:'买2',price:d.buy2,vol:d.buy2vol},
    {label:'买3',price:d.buy3,vol:d.buy3vol},
    {label:'买4',price:d.buy4,vol:d.buy4vol},
    {label:'买5',price:d.buy5,vol:d.buy5vol},
  ];
  for(var i=0;i<buys.length;i++){
    var b=buys[i];var cls=b.price>preClose?'ob-up':(b.price<preClose?'ob-down':'');
    html+='<div class="ob-row"><span class="ob-label">'+b.label+'</span>';
    html+='<span class="ob-price '+cls+'">'+(b.price?b.price.toFixed(2):'-')+'</span>';
    html+='<span class="ob-vol">'+(b.vol?b.vol:'-')+'</span></div>';
  }
  ob.innerHTML=html;
  var tk=document.getElementById('tickList');if(!tk)return;
  var vol=Number(d.f5||0);var amt=Number(d.f6||0);
  tk.innerHTML='<div class="tick-row"><span class="tick-time">成交量</span><span class="tick-price"></span><span class="tick-vol">'+(vol>=10000?(vol/10000).toFixed(1)+'万':vol.toLocaleString())+'</span></div>'+
    '<div class="tick-row"><span class="tick-time">成交额</span><span class="tick-price"></span><span class="tick-vol">'+(amt>=100000000?(amt/100000000).toFixed(2)+'亿':(amt>=10000?(amt/10000).toFixed(0)+'万':amt.toLocaleString()))+'</span></div>'+
    '<div class="tick-row"><span class="tick-time">换手率</span><span class="tick-price"></span><span class="tick-vol">'+Number(d.f8||0).toFixed(2)+'%</span></div>'+
    '<div class="tick-row"><span class="tick-time">涨跌</span><span class="tick-price"></span><span class="tick-vol '+(Number(d.f4||0)>=0?'ob-up':'ob-down')+'">'+(Number(d.f4||0)>=0?'+':'')+Number(d.f4||0).toFixed(2)+'</span></div>'+
    '<div class="tick-row"><span class="tick-time">振幅</span><span class="tick-price"></span><span class="tick-vol">'+(Number(d.f15||0)&&Number(d.f16||0)?((Number(d.f15)-Number(d.f16))/Number(d.f18||1)*100).toFixed(2)+'%':'-')+'</span></div>';
}

function renderDetailTabContent(tab,data){
  var panel=document.getElementById('detailPanel');if(!panel)return;
  if(tab==='essential'||tab==='profile'){
    if(tab==='profile'){
      var subTabs=[{id:'essential',label:'操盘必读'},{id:'company',label:'公司概况'},{id:'holder',label:'股东研究'},{id:'industry',label:'行业分析'}];
      var shtml='<div style="display:flex;gap:4px;padding:6px 8px;border-bottom:1px solid var(--border)">';
      for(var si=0;si<subTabs.length;si++){
        var active=(data&&data._sub===subTabs[si].id)?'active':'';
        shtml+='<button class="detail-tab '+active+'" data-psub="'+subTabs[si].id+'" style="font-size:11px;padding:3px 8px">'+subTabs[si].label+'</button>';
      }
      shtml+='</div><div id="profileContent"></div>';
      panel.innerHTML=shtml;
      var subBtns=panel.querySelectorAll('[data-psub]');
      for(var bi=0;bi<subBtns.length;bi++){
        subBtns[bi].addEventListener('click',function(){
          var all2=panel.querySelectorAll('[data-psub]');
          for(var k=0;k<all2.length;k++)all2[k].classList.toggle('active',all2[k].dataset.psub===this.dataset.psub);
          vscode.postMessage({type:'fetchStockProfileSub',code:_detailCode,sub:this.dataset.psub});
        });
      }
      vscode.postMessage({type:'fetchStockProfileSub',code:_detailCode,sub:'essential'});
      return;
    }
    if(!data||!data.items||!data.items.length){panel.innerHTML='<div style="padding:10px;opacity:.5;font-size:11px">暂无数据</div>';return}
    var html='<div style="padding:8px">';
    for(var i=0;i<data.items.length;i++){
      var it=data.items[i];
      html+='<div style="display:flex;padding:5px 0;border-bottom:1px solid var(--border);font-size:11px">';
      html+='<span style="width:80px;opacity:.5;flex-shrink:0">'+esc(it.label)+'</span>';
      html+='<span style="color:#ddd;word-break:break-all">'+esc(it.value)+'</span></div>';
    }
    html+='</div';panel.innerHTML=html;return;
  }
  if(tab==='finance'){
    if(!data||!data.items||!data.items.length){panel.innerHTML='<div style="padding:10px;opacity:.5;font-size:11px">暂无数据</div>';return}
    var fhtml='<div style="padding:8px">';
    for(var fi=0;fi<data.items.length;fi++){
      var fitem=data.items[fi];
      fhtml+='<div style="display:flex;padding:5px 0;border-bottom:1px solid var(--border);font-size:11px">';
      fhtml+='<span style="width:90px;opacity:.5;flex-shrink:0">'+esc(fitem.label)+'</span>';
      var valColor=fitem.color||'#ddd';
      fhtml+='<span style="color:'+valColor+'">'+esc(fitem.value)+'</span></div>';
    }
    fhtml+='</div>';panel.innerHTML=fhtml;return;
  }
  if(!data||!data.length){panel.innerHTML='<div style="padding:10px;opacity:.5;font-size:11px">暂无数据</div>';return}
  var html='';
  for(var i=0;i<data.length;i++){
    var item=data[i];var url=item.url||'';var title=item.title||'';var time=item.time||'';
    html+='<div class="news-item'+(url?'" data-url="'+esc(url):'')+'">';
    html+='<div class="time">'+esc(time)+'</div>';
    html+='<div class="title">'+esc(title)+'</div></div>';
  }
  panel.innerHTML=html;
  var items=panel.querySelectorAll('.news-item[data-url]');
  for(var j=0;j<items.length;j++){
    items[j].addEventListener('click',function(){vscode.postMessage({type:'openUrl',url:this.getAttribute('data-url')})});
  }
}

function openStockDetail(code,name){
  _detailCode=code;_detailName=name||'';_detailTab='news';
  var s={code:code,name:name||'',price:0,changeRate:0,open:0,preClose:0,high:0,low:0,volume:0,amount:0,turnover:0};
  renderStockDetail(s);
  vscode.postMessage({type:'fetchQuote',code:code});
}

function updateDetailQuote(d){
  if(!d)return;
  var nm=document.querySelector('.detail-hdr .nm');if(nm)nm.textContent=d.f14||_detailName||'';
  var pr=document.querySelector('.detail-price');if(pr){var p=Number(d.f2||0).toFixed(2);pr.textContent=p;pr.className='detail-price '+(Number(d.f3||0)>=0?'text-up':'text-down')}
  var tag=document.querySelector('.detail-tag');if(tag){var rate=Number(d.f3||0);tag.textContent=(rate>=0?'+':'')+rate.toFixed(2)+'%';tag.className='detail-tag '+(rate>=0?'tag-up':'tag-down')}
  var cells=document.querySelectorAll('.detail-cell .val');
  var vals=[(d.f18||0),(d.f17||0),(d.f15||0),(d.f16||0),(d.f5||0),(d.f6||0),(d.f8||0),(Number(d.f2||0)-Number(d.f18||0))];
  for(var i=0;i<cells.length&&i<vals.length;i++){
    var v=vals[i];
    if(i===4){var vol=Number(v);cells[i].textContent=vol>=10000?(vol/10000).toFixed(1)+'万':vol.toLocaleString('zh-CN')}
    else if(i===5){var amt=Number(v);cells[i].textContent=amt>=100000000?(amt/100000000).toFixed(2)+'亿':amt>=10000?(amt/10000).toFixed(1)+'万':amt.toLocaleString('zh-CN')}
    else if(i===6)cells[i].textContent=Number(v).toFixed(2)+'%';
    else if(i===7){var chg=Number(v);cells[i].textContent=(chg>=0?'+':'')+chg.toFixed(2);cells[i].className='val '+(chg>=0?'text-up':'text-down')}
    else cells[i].textContent=Number(v).toFixed(2);
  }
  updateOrderBook(d);
}

renderTabs();switchTab('market_overview');
window.addEventListener('message',function(e){
  var msg=e.data;
  if(msg.type==='tabData'&&msg.tab===currentTab){
    if(msg.tab==='market_overview')renderMarket(msg.data);
    else if(msg.tab==='fundFlow')renderFundFlow(msg.data);
    else if(msg.tab==='em_news')renderNews(msg.data);
    else if(msg.tab==='sector_limit')renderSector(msg.data);
    else if(msg.tab==='limit_leader')renderLeader(msg.data);
    else if(msg.tab==='strong_sector')renderStrongSector(msg.data);
    else if(msg.tab==='dragon_tiger')renderLhb(msg.data);
    else if(msg.tab==='yesterday_limit')renderLimitPool(msg.data);
    else if(msg.tab==='alert')renderAlert(msg.data);
    else if(msg.tab==='hot_stocks')renderHot(msg.data);
    else if(msg.tab==='watchlist')renderWatchlist(msg.data);
    else if(msg.tab==='realtime_news')renderRealtimeNews(msg.data);
    else $('#content').innerHTML='<div class="loading">开发中...</div>'
  }else if(msg.type==='refreshTab'&&msg.tab==='watchlist'&&currentTab==='watchlist'){
    vscode.postMessage({type:'switchTab',tab:'watchlist'});
  }else if(msg.type==='klineData'&&msg.code===_detailCode){
    drawKline(msg.data||[]);
  }else if(msg.type==='intradayData'&&msg.code===_detailCode){
    drawIntraday(msg.data||{});
  }else if(msg.type==='stockNewsData'&&msg.code===_detailCode){
    renderDetailTabContent('news',msg.data||[]);
  }else if(msg.type==='stockNoticeData'&&msg.code===_detailCode){
    renderDetailTabContent('notice',msg.data||[]);
  }else if(msg.type==='stockEssentialData'&&msg.code===_detailCode){
    renderDetailTabContent('essential',msg.data);
  }else if(msg.type==='stockFinanceData'&&msg.code===_detailCode){
    renderDetailTabContent('finance',msg.data);
  }else if(msg.type==='stockProfileData'&&msg.code===_detailCode){
    renderDetailTabContent('profile',msg.data);
  }else if(msg.type==='stockProfileSubData'&&msg.code===_detailCode){
    var pc=document.getElementById('profileContent');if(pc){
      if(!msg.data||!msg.data.items||!msg.data.items.length){pc.innerHTML='<div style="padding:10px;opacity:.5;font-size:11px">暂无数据</div>';return}
      var phtml='<div style="padding:8px">';
      for(var pi=0;pi<msg.data.items.length;pi++){
        var pit=msg.data.items[pi];
        phtml+='<div style="display:flex;padding:5px 0;border-bottom:1px solid var(--border);font-size:11px">';
        phtml+='<span style="width:80px;opacity:.5;flex-shrink:0">'+esc(pit.label)+'</span>';
        phtml+='<span style="color:#ddd;word-break:break-all">'+esc(pit.value)+'</span></div>';
      }
      phtml+='</div>';pc.innerHTML=phtml;
    }
  }else if(msg.type==='quoteData'&&msg.code===_detailCode){
    updateDetailQuote(msg.data);
  }else if(msg.type==='setOpacity'){
    document.documentElement.style.setProperty('--panel-opacity',msg.opacity);
  }else if(msg.type==='setVoice'){
    voiceOn=!!msg.on;renderTabs();
  }
});
</script>
</body>
</html>`;
}
