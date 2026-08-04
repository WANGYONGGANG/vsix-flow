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
.wl-acts{display:flex;gap:4px;flex-shrink:0}
.wl-code-act{border:1px solid var(--border);background:transparent;color:var(--fg);font-size:10px;line-height:1;padding:4px 7px;border-radius:4px;cursor:pointer;opacity:.85}
.wl-code-act:hover{opacity:1;border-color:var(--accent);color:var(--accent);background:rgba(232,179,57,.08)}
.wl-option{border:1px solid var(--border);background:transparent;color:var(--accent);font-size:10px;line-height:1;padding:4px 8px;border-radius:4px;cursor:pointer;opacity:.85}
.wl-option:hover{opacity:1;border-color:var(--accent);background:rgba(232,179,57,.1)}
.wl-card.dragging{opacity:.5;border:1px dashed var(--accent)}
.wl-card.drag-over{border-top:2px solid var(--accent)}
.wl-card{cursor:grab}
.wl-alert-tag{display:inline-block;background:rgba(232,179,57,.18);color:var(--accent);font-size:9px;padding:1px 5px;border-radius:3px;margin-left:6px}
.wl-alert-flash{animation:wlFlash 1s ease-in-out infinite}
@keyframes wlFlash{0%,100%{opacity:1}50%{opacity:.3}}
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
.kl-chart{flex:1;padding:6px 0;cursor:crosshair;user-select:none;touch-action:none;min-width:0;position:relative}
.kl-side{width:150px;border-left:1px solid var(--border);padding:4px 6px;font-size:10px;overflow:hidden;flex-shrink:0;overflow-y:auto}
.kl-side #klSideBook{overflow:hidden}
.kl-side #klSideChips{overflow-y:auto;margin-right:-8px;padding-right:4px}
.kl-side-title{font-size:10px;opacity:.6;margin-bottom:4px;font-weight:600}
.kl-side-tabs{display:flex;gap:4px;margin-bottom:6px}
.kl-side-tabs button{flex:1;padding:3px 0;border:1px solid var(--border);border-radius:4px;background:transparent;color:var(--fg);font-size:10px;cursor:pointer;opacity:.6}
.kl-side-tabs button.active{opacity:1;border-color:var(--accent);color:var(--accent)}
.kl-side-tabs button:hover{opacity:1}
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
.kl-more{text-align:center;padding:3px 0;font-size:10px;color:var(--accent);cursor:pointer;border-top:1px solid var(--border);margin-top:4px}
.kl-more:hover{opacity:.8}
.kl-more-hint{text-align:center;padding:2px 0;font-size:9px;opacity:.4}
.kl-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100;display:flex;align-items:center;justify-content:center}
.kl-modal{background:#1b1f26;border:1px solid var(--border);border-radius:8px;width:min(420px,90vw);max-height:70vh;display:flex;flex-direction:column;overflow:hidden}
.kl-modal-hdr{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--border);font-size:12px}
.kl-modal-hdr button{background:none;border:none;color:var(--fg);opacity:.6;cursor:pointer;font-size:12px}
.kl-modal-hdr button:hover{opacity:1}
.kl-modal-body{overflow-y:auto;padding:6px 12px;font-size:11px}
.kl-modal-body .tick-row{font-size:11px}
.kl-modal-body .tick-time{width:52px}
.kl-modal-body .tick-vol{width:60px}

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
var _refreshTimer=null;
var _inDetail=false;
var _tabCache={};
function renderTabData(tab,data){
  if(tab==='market_overview')renderMarket(data);
  else if(tab==='fundFlow')renderFundFlow(data);
  else if(tab==='em_news')renderNews(data);
  else if(tab==='sector_limit')renderSector(data);
  else if(tab==='limit_leader')renderLeader(data);
  else if(tab==='strong_sector')renderStrongSector(data);
  else if(tab==='dragon_tiger')renderLhb(data);
  else if(tab==='yesterday_limit')renderLimitPool(data);
  else if(tab==='alert')renderAlert(data);
  else if(tab==='hot_stocks')renderHot(data);
  else if(tab==='watchlist'){if(!_inDetail)renderWatchlist(data)}
  else if(tab==='realtime_news')renderRealtimeNews(data);
  else $('#content').innerHTML='<div class="loading">开发中...</div>'
}
function switchTab(tab){
  currentTab=tab;_lastNewsIds=[];_lastAlertIds=[];renderTabs();
  _inDetail=false;
  if(_tabCache[tab]&&_refreshTimer&&tab==='market_overview'){
    // 已有展示内容，不覆盖，等待新数据到达后再刷新
  }else if(_tabCache[tab]){
    renderTabData(tab,_tabCache[tab]);
  }else{
    $('#content').innerHTML='<div class="loading">加载中...</div>';
  }
  vscode.postMessage({type:'switchTab',tab:tab});
  if(_refreshTimer){clearInterval(_refreshTimer);_refreshTimer=null}
  if(tab==='market_overview'){
    _refreshTimer=setInterval(function(){vscode.postMessage({type:'switchTab',tab:'market_overview'})},30000);
  }else if(tab==='watchlist'){
    _refreshTimer=setInterval(function(){if(!_inDetail)vscode.postMessage({type:'switchTab',tab:'watchlist'})},5000);
  }
}
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

var _marketCache={};
function renderMarket(d){
  var list=d.diff||d.indices||d;if(!list||!list.length){$('#content').innerHTML='<div class="loading">暂无数据</div>';return}
  // 缓存合并：涨跌家数和分布为0时保留上次数据
  var dist=d.distribution||{};var counts=d.counts||{};var trade=d.trade||{};var yzt=d.yesterdayZt||{};
  if(counts.up===0&&counts.down===0&&_marketCache.counts){counts=_marketCache.counts}
  if((dist.zt||0)===0&&(dist.g5||0)===0&&_marketCache.distribution){dist=_marketCache.distribution}
  if((yzt.count||0)===0&&_marketCache.yesterdayZt){yzt=_marketCache.yesterdayZt}
  if((trade.total||0)===0&&_marketCache.trade){trade=_marketCache.trade}
  _marketCache={counts:counts,distribution:dist,trade:trade,yesterdayZt:yzt};
  var html='';
  // 三大指数卡片
  html+='<div class="grid-3" style="margin-bottom:8px">';
  for(var i=0;i<Math.min(3,list.length);i++){var item=list[i];var price=item.price||item.f2||0;var rate=item.changeRate!=null?item.changeRate:(item.f3||0);var name=item.name||item.f14||'';var up=rate>=0;html+='<div class="card" style="text-align:center"><div class="text-muted" style="font-size:11px;margin-bottom:4px">'+esc(name)+'</div><div class="'+(up?'text-up':'text-down')+'" style="font-size:20px;font-weight:700;line-height:1.2">'+(price||0).toFixed(2)+'</div><div class="'+(up?'text-up':'text-down')+'" style="font-size:13px;margin-top:2px">'+(rate>=0?'+':'')+(rate||0).toFixed(2)+'%</div></div>'}
  html+='</div>';
  // 涨跌分布卡片
  html+='<div class="card" style="margin-bottom:8px">';
  html+='<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">';
  html+='<div style="flex:1;display:flex;gap:8px">';
  html+='<span class="tag tag-up" style="font-size:12px;padding:2px 10px">涨 '+(counts.up||0)+'</span>';
  html+='<span class="text-muted" style="font-size:12px;line-height:22px">平 '+(counts.flat||0)+'</span>';
  html+='<span class="tag tag-down" style="font-size:12px;padding:2px 10px">跌 '+(counts.down||0)+'</span>';
  html+='</div></div>';
  // 竖向柱状图
  var bars=[
    {label:'涨停',val:dist.zt||0,color:'#e53e3e'},
    {label:'>5%',val:dist.g5||0,color:'#f56565'},
    {label:'>1%',val:dist.g1||0,color:'#fc8181'},
    {label:'>0%',val:dist.g0||0,color:'#feb2b2'},
    {label:'平盘',val:dist.flat||0,color:'#718096'},
    {label:'0~1%',val:dist.d0||0,color:'#9ae6b4'},
    {label:'1~5%',val:dist.d1||1,color:'#68d391'},
    {label:'>5%',val:dist.d5||0,color:'#48bb78'},
    {label:'跌停',val:dist.dt||0,color:'#38a169'}
  ];
  var maxVal=1;bars.forEach(function(b){if(b.val>maxVal)maxVal=b.val});
  html+='<div style="display:flex;align-items:flex-end;gap:6px;height:90px;padding:0 4px">';
  for(var i=0;i<bars.length;i++){var b=bars[i];var h=Math.max(2,Math.round(b.val/maxVal*75));html+='<div style="flex:1;display:flex;flex-direction:column;align-items:center"><div style="font-size:9px;color:'+b.color+';margin-bottom:3px;font-weight:600">'+b.val+'</div><div style="width:60%;height:'+h+'px;background:'+b.color+';border-radius:2px 2px 0 0;min-width:4px"></div><div style="font-size:8px;opacity:.5;margin-top:3px;white-space:nowrap">'+b.label+'</div></div>'}
  html+='</div>';
  // 横向涨跌家数对比条
  var total=(counts.up||0)+(counts.down||0)+(counts.flat||0);
  if(total>0){
    var upW=Math.round((counts.up||0)/total*100);
    var flatW=Math.round((counts.flat||0)/total*100);
    var downW=100-upW-flatW;
    html+='<div style="margin-top:10px">';
    html+='<div style="display:flex;height:8px;border-radius:4px;overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,.2)">';
    html+='<div style="width:'+upW+'%;background:linear-gradient(90deg,#e53e3e,#fc8181)"></div>';
    html+='<div style="width:'+flatW+'%;background:#4a5568"></div>';
    html+='<div style="width:'+downW+'%;background:linear-gradient(90deg,#48bb78,#9ae6b4)"></div>';
    html+='</div>';
    html+='<div style="display:flex;justify-content:space-between;font-size:10px;margin-top:4px;opacity:.7">';
    html+='<span class="text-up">▲ '+counts.up+'</span>';
    html+='<span>平 '+(counts.flat||0)+'</span>';
    html+='<span class="text-down">▼ '+counts.down+'</span>';
    html+='</div></div>';
  }
  html+='</div>';
  // 昨日涨停表现
  if(yzt.count>0){
    html+='<div class="card" style="margin-bottom:8px">';
    html+='<div class="section-title" style="margin-bottom:8px;font-size:12px;font-weight:600">📊 昨日涨停表现</div>';
    html+='<div style="display:flex;align-items:center;gap:16px">';
    html+='<div style="text-align:center"><div style="font-size:22px;font-weight:700;color:#fff">'+yzt.count+'</div><div style="font-size:10px;opacity:.5;margin-top:2px">涨停家数</div></div>';
    html+='<div style="width:1px;height:36px;background:var(--border)"></div>';
    html+='<div style="text-align:center"><div class="'+(yzt.avgChange>=0?'text-up':'text-down')+'" style="font-size:22px;font-weight:700">'+(yzt.avgChange>=0?'+':'')+(yzt.avgChange||0).toFixed(2)+'%</div><div style="font-size:10px;opacity:.5;margin-top:2px">今日平均</div></div>';
    html+='<div style="width:1px;height:36px;background:var(--border)"></div>';
    html+='<div style="text-align:center"><div class="text-up" style="font-size:22px;font-weight:700">'+yzt.upCount+'</div><div style="font-size:10px;opacity:.5;margin-top:2px">上涨家数</div></div>';
    html+='</div></div>';
  }
  // 三市成交额
  if(trade.total>0){
    var vr=trade.volumeRatio||0;
    var diff=trade.total-(trade.yesterdayTotal||0);
    // 以差额符号判断放缩量（东财口径：缩量标识小额收缩）；ratio作辅助，diff接近0时看ratio
    var isUp = diff > 1;            // 放量（今日大于昨日）
    var isDown = diff < -1;         // 缩量（今日大于昨日）
    if(Math.abs(diff) <= 1 && vr>0){ isUp = vr > 1.001; isDown = vr < 0.999; }
    var vrColor=isUp?'text-up':'text-down';
    var vrLabel=isUp?'放量':'缩量';
    var vrIcon=isUp?'🔺':'🔻';
    html+='<div class="card" style="margin-bottom:8px">';
    html+='<div class="section-title" style="margin-bottom:8px;font-size:12px;font-weight:600">💰 三市成交额</div>';
    html+='<div style="display:flex;align-items:baseline;gap:10px">';
    html+='<div style="font-size:22px;font-weight:700;color:var(--accent)">'+fmtYi(trade.total)+'</div>';
    if(vr>0){
      html+='<div class="'+vrColor+'" style="font-size:12px;font-weight:500">'+vrIcon+' '+vrLabel+' '+fmtYi(Math.abs(diff))+'</div>';
    }
    html+='</div>';
    html+='<div style="display:flex;gap:12px;margin-top:10px">';
    html+='<div style="flex:1;text-align:center;padding:8px 4px;background:rgba(255,255,255,.03);border-radius:6px;border:1px solid var(--border)"><div style="font-size:10px;opacity:.5">沪市</div><div style="font-size:14px;font-weight:600;margin-top:3px">'+fmtYi(trade.sh||0)+'</div></div>';
    html+='<div style="flex:1;text-align:center;padding:8px 4px;background:rgba(255,255,255,.03);border-radius:6px;border:1px solid var(--border)"><div style="font-size:10px;opacity:.5">深市</div><div style="font-size:14px;font-weight:600;margin-top:3px">'+fmtYi(trade.sz||0)+'</div></div>';
    html+='<div style="flex:1;text-align:center;padding:8px 4px;background:rgba(255,255,255,.03);border-radius:6px;border:1px solid var(--border)"><div style="font-size:10px;opacity:.5">创业板</div><div style="font-size:14px;font-weight:600;margin-top:3px">'+fmtYi(trade.cyb||0)+'</div></div>';
    html+='</div></div>';
  }
  // 指数对比
  if(list.length>3){
    html+='<div class="card">';
    html+='<div class="section-title" style="margin-bottom:8px;font-size:12px;font-weight:600">📈 指数对比</div>';
    html+='<table style="width:100%;font-size:11px">';
    html+='<tr style="opacity:.5"><td style="padding:4px 0">指数</td><td style="text-align:right;padding:4px 0">最新价</td><td style="text-align:right;padding:4px 0">涨跌幅</td></tr>';
    for(var j=0;j<list.length;j++){var it=list[j];var rt=it.changeRate!=null?it.changeRate:(it.f3||0);var up2=rt>=0;html+='<tr style="border-top:1px solid var(--border)"><td style="padding:6px 0;font-weight:500">'+esc(it.name||it.f14||'')+'</td><td style="text-align:right;padding:6px 0">'+(Number(it.price||it.f2)||0).toFixed(2)+'</td><td style="text-align:right;padding:6px 0" class="'+(up2?'text-up':'text-down')+'">'+(rt>=0?'+':'')+(rt||0).toFixed(2)+'%</td></tr>'}
    html+='</table></div>';
  }
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
  var html='<table><tr><th>排名</th><th>代码</th><th>名称</th><th>最新价</th><th>涨跌幅</th><th>今开</th><th>最高</th><th>最低</th><th>昨收</th><th>成交额</th><th>换手率</th></tr>';
  for(var i=0;i<Math.min(30,list.length);i++){var x=list[i];
    html+='<tr class="stock-row" data-code="'+esc(x.f12||'')+'" data-name="'+esc(x.f14||'')+'"><td>'+(x.rank||(i+1))+'</td><td>'+esc(x.f12||'')+'</td><td>'+esc(x.f14||'')+'</td><td>'+(x.f2||0).toFixed(2)+'</td><td class="'+upClass(x.f3)+'">'+upSign(x.f3)+(x.f3||0).toFixed(2)+'%</td><td>'+(x.f17||0).toFixed(2)+'</td><td class="text-up">'+(x.f15||0).toFixed(2)+'</td><td class="text-down">'+(x.f16||0).toFixed(2)+'</td><td>'+(x.f18||0).toFixed(2)+'</td><td>'+fmtYi(x.f6||0)+'</td><td>'+(x.f8?(x.f8).toFixed(2)+'%':'—')+'</td></tr>'}
  html+='</table>';$('#content').innerHTML=html
}

var _wlData=[];
var _wlAlerts={};
var _wlDragIdx=null;
function renderWatchlist(d){
  var list=d&&d.indices?d.indices:(d&&d.data?d.data.diff:[]);
  _wlAlerts=d&&d.alerts?d.alerts:{};
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
      var alertList=_wlAlerts[String(x.f12||'')]||[];
      var alertHtml='';
      var flash=alertList.length?'wl-alert-flash':'';
      for(var ai=0;ai<Math.min(2,alertList.length);ai++){
        var al=alertList[ai];
        alertHtml+='<span class="wl-alert-tag">'+(al.isUp?'▲':'▼')+esc(al.label)+'</span>';
      }
      html+='<div class="wl-card '+flash+'" draggable="true" data-code="'+code+'" data-idx="'+i+'"><div class="wl-row"><div class="wl-name"><div class="nm">'+name+(alertHtml?'<span>'+alertHtml+'</span>':'')+'</div><div class="cd">'+code+'</div></div><div class="wl-price"><div class="pr '+(up?'text-up':'text-down')+'">'+price+'</div></div><div class="wl-chg"><span class="tag '+(up?'tag-up':'tag-down')+'">'+(up?'+':'')+rate.toFixed(2)+'%</span></div><div class="wl-acts"><button class="wl-code-act" data-code="'+code+'" data-dir="top" title="置顶">⤒ 置顶</button><button class="wl-code-act" data-code="'+code+'" data-dir="bottom" title="置底">⤓ 置底</button></div><button class="wl-del" data-code="'+code+'">删除</button></div></div>';
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
  var actBtns=document.querySelectorAll('.wl-code-act');
  for(var k=0;k<actBtns.length;k++){
    actBtns[k].addEventListener('click',function(e){
      e.stopPropagation();
      vscode.postMessage({type:'moveWatch',code:this.getAttribute('data-code'),dir:this.getAttribute('data-dir')});
    });
  }
  setupWatchlistDrag();
}
function setupWatchlistDrag(){
  var cards=document.querySelectorAll('.wl-card');
  var dragEl=null;
  function getDragAfter(y){
    var list=Array.prototype.slice.call(document.querySelectorAll('.wl-card:not(.dragging)'));
    for(var i=0;i<list.length;i++){
      var box=list[i].getBoundingClientRect();
      if(y<box.top+box.height/2)return list[i];
    }
    return null;
  }
  for(var i=0;i<cards.length;i++){
    var card=cards[i];
    card.addEventListener('dragstart',function(e){
      dragEl=this;this.classList.add('dragging');
      e.dataTransfer.effectAllowed='move';
      try{e.dataTransfer.setData('text/plain',this.getAttribute('data-code'))}catch(err){}
    });
    card.addEventListener('dragover',function(e){
      e.preventDefault();e.dataTransfer.dropEffect='move';
    });
    card.addEventListener('dragenter',function(e){
      e.preventDefault();
    });
    card.addEventListener('drop',function(e){
      e.preventDefault();
      if(!dragEl||dragEl===this)return;
      var after=getDragAfter(e.clientY);
      var container=this.parentNode;
      if(after==null)container.appendChild(dragEl);
      else container.insertBefore(dragEl,after);
      var codes=[];
      var all=document.querySelectorAll('.wl-card');
      for(var c=0;c<all.length;c++)codes.push(all[c].getAttribute('data-code'));
      dragEl=null;
      vscode.postMessage({type:'reorderWatch',codes:codes});
    });
    card.addEventListener('dragend',function(){
      this.classList.remove('dragging');
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
  html+='<canvas id="klOverlay" style="position:absolute;top:0;left:0;pointer-events:none;z-index:20"></canvas>';
  html+='</div>';
  html+='<div class="kl-side" id="klSide">';
  html+='<div class="kl-side-tabs"><button data-side="book" class="active">盘口</button><button data-side="chips">筹码</button></div>';
  html+='<div id="klSideBook">';
  html+='<div class="kl-side-title">五档盘口</div>';
  html+='<div id="orderBook"></div>';
  html+='<div class="kl-side-title" style="margin-top:8px">分时成交</div>';
  html+='<div id="tickList"></div>';
  html+='<div class="kl-more" id="tickMore">查看更多</div>';
  html+='</div>';
  html+='<div id="klSideChips" style="display:none">';
  html+='<div class="kl-side-title">筹码分布</div>';
  html+='<canvas id="klChips" style="width:100%"></canvas>';
  html+='<div id="chipsSummary"></div>';
  html+='</div>';
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
  _inDetail=true;
  _idView={s:0,e:240};
  var goBack=function(){_inDetail=false;if(_intradayTimer){clearInterval(_intradayTimer);_intradayTimer=null}if(_quoteTimer){clearInterval(_quoteTimer);_quoteTimer=null}vscode.postMessage({type:'switchTab',tab:currentTab==='detail'?'watchlist':currentTab})};
  var backBtn=document.getElementById('detailBack');
  if(backBtn)backBtn.addEventListener('click',goBack);
  var backBtn2=document.getElementById('detailBackBtn');
  if(backBtn2)backBtn2.addEventListener('click',goBack);
  var delBtn=document.getElementById('detailDel');
  if(delBtn)delBtn.addEventListener('click',function(){vscode.postMessage({type:'delWatch',code:s.code})});
  _detailCode=s.code;_detailName=s.name||_detailName;_detailTab='news';_klPeriod='intraday';_allTicks=[];
  vscode.postMessage({type:'fetchKline',code:s.code,period:'intraday'});
  vscode.postMessage({type:'fetchStockNews',code:s.code});
  if(_quoteTimer){clearInterval(_quoteTimer);_quoteTimer=null}
  _quoteTimer=setInterval(function(){
    if(_detailCode)vscode.postMessage({type:'fetchQuote',code:_detailCode});
  },3000);
  var tickMore=document.getElementById('tickMore');
  if(tickMore)tickMore.addEventListener('click',function(){
    if(_allTicks.length&&_allTicks.length>16)openTickModal();
    else if(_allTicks.length&&_klPeriod!=='intraday')vscode.postMessage({type:'fetchKline',code:s.code,period:'intraday'});
    else if(_allTicks.length)openTickModal();
  });
  var pbtns=document.querySelectorAll('.kl-pbtn[data-period]');
  for(var i=0;i<pbtns.length;i++){
    pbtns[i].addEventListener('click',function(){
      _klPeriod=this.dataset.period;
      if(_intradayTimer){clearInterval(_intradayTimer);_intradayTimer=null}
      if(_klPeriod==='chips'){
        setSideTab('chips');
        if(_chipsData)renderChips(_chipsData);
        else vscode.postMessage({type:'fetchKline',code:s.code,period:'chips'});
      }else{
        setSideTab('book');
        vscode.postMessage({type:'fetchKline',code:s.code,period:_klPeriod});
      }
      updateSubBtns();
    });
  }
  var sideTabs=document.querySelectorAll('.kl-side-tabs button');
  for(var si=0;si<sideTabs.length;si++){
    sideTabs[si].addEventListener('click',function(){
      var side=this.dataset.side;
      setSideTab(side);
      if(side==='chips'){
        _klPeriod='chips';
        updateSubBtns();
        if(_chipsData)renderChips(_chipsData);
        else vscode.postMessage({type:'fetchKline',code:s.code,period:'chips'});
      }else if(side==='book'&&_klPeriod==='chips'){
        _klPeriod='intraday';
        updateSubBtns();
        vscode.postMessage({type:'fetchKline',code:s.code,period:'intraday'});
      }
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
var _floatShares=0;
var _lastQuote=null;
var _chipsData=null;
var _allTicks=[];
var _kl={data:[],scroll:0,subs:['vol'],dragging:false,dragX:0,gap:0};
var _klCanvases={};
var _intradayCache={data:[],preClose:0,totalMin:240};
var _intradayGeo=null;var _crossIdx=-1;var _klineGeo=null;
var _idView={s:0,e:240};var _idMinSpan=30;var _idMaxSpan=240;
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
  fitSideHeight(mainH+subH*_kl.subs.length);
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
function fitSideHeight(totalH){
  var side=document.getElementById('klSide');if(!side)return;
  side.style.maxHeight=Math.max(totalH,120)+'px';
}
function drawMain(canvas,data){
  var dpr=window.devicePixelRatio||1;
  var ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  var W=canvas.width/dpr,H=canvas.height/dpr;
  ctx.fillStyle='#12151a';ctx.fillRect(0,0,W,H);
  var padL=46,padR=8,padT=6,padB=18;
  var cW=W-padL-padR,cH=H-padT-padB;
  if(!_kl.gap)_kl.gap=cW/60;
  var gap=_kl.gap;
  var barW=Math.max(2,Math.min(14,gap*0.7));
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
  _klineGeo={start:start,gap:gap,padL:padL,padT:padT,cH:cH,minP:minP,pR:pR,H:H,W:W,vis:vis};
}
function drawVol(canvas,data){
  var dpr=window.devicePixelRatio||1;
  var ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  var W=canvas.width/dpr,H=canvas.height/dpr;
  ctx.fillStyle='#12151a';ctx.fillRect(0,0,W,H);
  var padL=46,padR=8,padT=4,padB=4;
  var cW=W-padL-padR,cH=H-padT-padB;
  var barW=Math.max(2,Math.min(14,(_kl.gap||cW/60)*0.7));var gap=_kl.gap||cW/60;
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
  var barW=Math.max(2,Math.min(14,(_kl.gap||cW/60)*0.7));var gap=_kl.gap||cW/60;
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
  var gap=_kl.gap||cW/60;var totalBars=Math.floor(cW/gap);var start=Math.floor(_kl.scroll);
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
  if(el.__crossBound)return;el.__crossBound=true;
  el.addEventListener('mousedown',function(e){if(e.button!==0)return;_kl.dragging=true;_kl.dragX=e.clientX;e.preventDefault()});
  window.addEventListener('mousemove',function(e){
    if(!_kl.dragging)return;
    var dx=e.clientX-_kl.dragX;_kl.dragX=e.clientX;
    if(_klPeriod==='intraday'){
      var span=_idView.e-_idView.s;
      var pxPerMin=(_klCanvases.main?_klCanvases.main.clientWidth:300)/span;
      var dm=-dx/pxPerMin;
      var ns=_idView.s+dm,ne=_idView.e+dm;
      if(ns<0){ns=0;ne=span}
      if(ne>240){ne=240;ns=240-span}
      _idView.s=ns;_idView.e=ne;
      redrawIntraday();
    }else{
      var gap=_kl.gap||((_klCanvases.main?_klCanvases.main.clientWidth:300)/60);
      _kl.scroll-=dx/gap;
      var cW=(_klCanvases.main?_klCanvases.main.clientWidth:300)-54;
      var maxS=Math.max(0,_kl.data.length-Math.floor(cW/gap));_kl.scroll=Math.max(0,Math.min(_kl.scroll,maxS));
      renderChart();
    }
  });
  window.addEventListener('mouseup',function(){_kl.dragging=false});
  el.addEventListener('wheel',function(e){
    e.preventDefault();
    if(_klPeriod==='intraday'){
      var r=el.getBoundingClientRect();
      var x=e.clientX-r.left;
      var g=_intradayGeo;if(!g)return;
      var frac=(x-g.padL)/g.cW;frac=Math.max(0,Math.min(1,frac));
      var span=_idView.e-_idView.s;
      var factor=e.deltaY>0?1.15:1/1.15;
      var newSpan=span*factor;
      newSpan=Math.max(_idMinSpan,Math.min(_idMaxSpan,newSpan));
      var anchor=_idView.s+span*frac;
      var ns=anchor-newSpan*frac;
      ns=Math.max(0,Math.min(240-newSpan,ns));
      _idView.s=ns;_idView.e=ns+newSpan;
      redrawIntraday();
    }else if(_kl.data.length){
      var main=_klCanvases.main;
      var W=main?main.parentElement.clientWidth-12:300;
      var cW=W-54;
      if(!_kl.gap)_kl.gap=cW/60;
      var factor=e.deltaY>0?1.15:1/1.15;
      _kl.gap=Math.max(cW/Math.min(_kl.data.length,200),Math.min(cW/10,_kl.gap*factor));
      var maxS=Math.max(0,_kl.data.length-Math.floor(cW/_kl.gap));
      _kl.scroll=Math.max(0,Math.min(_kl.scroll,maxS));
      renderChart();
    }
  },{passive:false});
  var mc=document.getElementById('klMain');
  if(mc)mc.addEventListener('mouseleave',function(){if(!_kl.dragging)document.getElementById('klChart').style.cursor='crosshair'});
  setupCrosshair();
}
var _intradayRedrawData=null;
function redrawIntraday(){
  if(_intradayRedrawData)drawIntraday(_intradayRedrawData);
}
function setupCrosshair(){
  var el=document.getElementById('klChart');if(!el)return;
  var ov=document.getElementById('klOverlay');if(!ov)return;
  el.addEventListener('mousemove',function(e){
    if(_kl.dragging){clearCrosshair(ov);return}
    var r=el.getBoundingClientRect();
    drawCrosshair(ov,e.clientX-r.left,e.clientY-r.top);
  });
  el.addEventListener('mouseleave',function(){clearCrosshair(ov);resetTopInfo()});
}
function drawCrosshair(ov,x,y){
  var dpr=window.devicePixelRatio||1;
  var main=document.getElementById('klMain');
  var ct=document.getElementById('klChart');
  var pw=main?main.parentElement.clientWidth:ov.clientWidth;
  var w=pw-12,h=ct?ct.clientHeight:ov.clientHeight;
  ov.width=w*dpr;ov.height=h*dpr;ov.style.width=w+'px';ov.style.height=h+'px';
  var ctx=ov.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  var isIntraday=_klPeriod==='intraday';
  if(isIntraday){
    if(!_intradayGeo||!_intradayCache.data.length)return;
    var g=_intradayGeo;
    if(x>=g.padL&&x<=w){
      var span=g.viewE-g.viewS;
      var minute=g.viewS+(x-g.padL)/g.cW*span;
      var idx=-1;
      for(var k=0;k<_intradayCache.data.length;k++){if(_intradayCache.data[k].min<=minute)idx=k;else break}
      if(idx>=0){
        var d=_intradayCache.data[idx];
        var cx=g.padL+g.cW*(d.min-g.viewS)/span;
        drawCrossLines(ctx,w,h,cx,y);
        updateTopInfo(d.price,d.time,idx);
        var dVol=(d.vol||0);
        drawCrossInfo(ctx,d.price.toFixed(2)+'  '+d.time.slice(0,2)+':'+d.time.slice(2,4),'量 '+fmtPrice(dVol)+'  涨跌 '+(d.price>=_intradayCache.preClose?'+':'')+(d.price-_intradayCache.preClose).toFixed(2),cx,y,w,h);
      }
    }
  }else{
    if(!_klineGeo||!_kl.data.length)return;
    var g=_klineGeo;
    if(x>=g.padL&&x<=w){
      var idx=Math.floor((x-g.padL)/g.gap)+g.start;
      if(idx<0)idx=0;
      if(idx>=_kl.data.length)idx=_kl.data.length-1;
      var d=_kl.data[idx];
      var cx=g.padL+g.gap*(idx-g.start)+g.gap/2;
      drawCrossLines(ctx,w,h,cx,y);
      updateTopInfo(d.close,d.date,idx);
      var dir=d.close>=d.open?'▲':'▼';
      drawCrossInfo(ctx,d.date+' '+dir,'开 '+d.open.toFixed(2)+' 高 '+d.high.toFixed(2),'低 '+d.low.toFixed(2)+' 收 '+d.close.toFixed(2)+'  量 '+fmtPrice(d.vol),cx,y,w,h);
    }
  }
}
function drawCrossLines(ctx,w,h,cx,cy){
  ctx.save();
  ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=1.2;ctx.setLineDash([5,3]);
  ctx.beginPath();ctx.moveTo(cx,0);ctx.lineTo(cx,h);ctx.stroke();
  ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(0,cy);ctx.lineTo(w,cy);ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle='rgba(232,179,57,.9)';ctx.lineWidth=1.6;
  ctx.beginPath();ctx.arc(cx,cy,3.5,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='rgba(232,179,57,.25)';ctx.beginPath();ctx.arc(cx,cy,3.5,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function drawCrossInfo(ctx,line1,line2,line3,cx,cy,w,h){
  ctx.font='10px monospace';
  var w1=line1?ctx.measureText(line1).width:0;
  var w2=line2?ctx.measureText(line2).width:0;
  var w3=line3?ctx.measureText(line3).width:0;
  var tw=Math.max(w1,w2,w3);
  var pad=6,rowH=15,n=line3?3:(line2?2:1);
  var bw=tw+pad*2,bh=rowH*n+pad*2;
  var bx=cx+12;if(bx+bw>w-4)bx=cx-bw-12;
  if(bx<4)bx=4;else if(bx+bw>w-4)bx=w-bw-4;
  var by=cy-bh-12;if(by<4)by=cy+14;
  if(by<4)by=4;else if(by+bh>h-4)by=h-bh-4;
  ctx.fillStyle='rgba(15,18,24,.92)';
  roundRect(ctx,bx,by,bw,bh,6);ctx.fill();
  ctx.strokeStyle='rgba(232,179,57,.7)';ctx.lineWidth=1;roundRect(ctx,bx,by,bw,bh,6);ctx.stroke();
  ctx.fillStyle='#e8b339';ctx.textAlign='left';
  if(line1)ctx.fillText(line1,bx+pad,by+pad+9);
  ctx.fillStyle='rgba(255,255,255,.85)';
  var row=1;
  if(line2){ctx.fillText(line2,bx+pad,by+pad+9+row*rowH);row++}
  if(line3){ctx.fillText(line3,bx+pad,by+pad+9+row*rowH)}
}
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
}
function clearCrosshair(ov){
  if(!ov)return;
  var dpr=window.devicePixelRatio||1;
  var main=document.getElementById('klMain');
  var ct=document.getElementById('klChart');
  var pw=main?main.parentElement.clientWidth:ov.clientWidth;
  var w=pw-12,h=ct?ct.clientHeight:ov.clientHeight;
  ov.width=w*dpr;ov.height=h*dpr;ov.style.width=w+'px';ov.style.height=h+'px';
  var ctx=ov.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
}
function updateTopInfo(price,label,idx){
  var pr=document.querySelector('.detail-price');
  var tag=document.querySelector('.detail-tag');
  var preClose=Number(_lastQuote&&_lastQuote.f18||0);
  var rate=preClose?((price-preClose)/preClose*100):0;
  var up=rate>=0;
  if(pr){pr.textContent=Number(price).toFixed(2);pr.className='detail-price '+(up?'text-up':'text-down')}
  if(tag){tag.textContent=(up?'+':'')+rate.toFixed(2)+'%';tag.className='detail-tag '+(up?'tag-up':'tag-down')}
  var cells=document.querySelectorAll('.detail-cell .val');
  if(cells.length>=8){
    if(_klPeriod==='intraday'){
      var cache=_intradayCache.data;
      if(idx>=0&&idx<cache.length){
        var d=cache[idx];
        var openP=cache[0].price;
        var hi=d.price,lo=d.price,cumVol=0,cumAmt=0;
        for(var k=0;k<=idx;k++){if(cache[k].price>hi)hi=cache[k].price;if(cache[k].price<lo)lo=cache[k].price;cumVol+=cache[k].vol;cumAmt=cache[k].amt||cumAmt}
        cells[0].textContent=preClose.toFixed(2);
        cells[1].textContent=openP.toFixed(2);
        cells[2].textContent=hi.toFixed(2);cells[2].className='val text-up';
        cells[3].textContent=lo.toFixed(2);cells[3].className='val text-down';
        cells[4].textContent=fmtPrice(cumVol);
        cells[5].textContent=fmtYi(cumAmt);
        var to=_floatShares>0?(cumVol*100/_floatShares*100):0;
        cells[6].textContent=to.toFixed(2)+'%';
        cells[7].textContent=(up?'+':'')+(price-preClose).toFixed(2);
        cells[7].className='val '+(up?'text-up':'text-down');
      }
    }else{
      var d=_kl.data[idx]||null;
      if(d){
        var prevClose=idx>0?_kl.data[idx-1].close:preClose;
        var estAmt=d.vol*d.close*100;
        var to2=_floatShares>0?(d.vol*100/_floatShares*100):0;
        cells[0].textContent=prevClose.toFixed(2);
        cells[1].textContent=Number(d.open).toFixed(2);
        cells[2].textContent=Number(d.high).toFixed(2);cells[2].className='val text-up';
        cells[3].textContent=Number(d.low).toFixed(2);cells[3].className='val text-down';
        cells[4].textContent=fmtPrice(d.vol);
        cells[5].textContent=fmtYi(estAmt);
        cells[6].textContent=to2.toFixed(2)+'%';
        cells[7].textContent=(up?'+':'')+(price-preClose).toFixed(2);
        cells[7].className='val '+(up?'text-up':'text-down');
      }
    }
  }
}
function resetTopInfo(){
  if(_lastQuote)updateDetailQuote(_lastQuote);
}
function toggleSubChart(id){
  var idx=_kl.subs.indexOf(id);
  if(idx>=0){if(id==='vol')return;_kl.subs.splice(idx,1)}
  else{_kl.subs.push(id)}
  refreshSubChartDOM();updateSubBtns();
  if(_klPeriod==='intraday'){if(_intradayRedrawData)drawIntraday(_intradayRedrawData)}
  else renderChart();
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
  _kl.gap=0;
  _kl.scroll=Math.max(0,_kl.data.length-60);
  refreshSubChartDOM();updateSubBtns();setupChartDrag();renderChart();
}

var _intradayTimer=null;
var _quoteTimer=null;
function drawIntraday(d){
  if(_intradayTimer){clearInterval(_intradayTimer);_intradayTimer=null}
  _intradayRedrawData=d;
  var minutes=d.minutes||[];var preClose=Number(d.preClose||0);
  _kl.data=[];_kl.scroll=0;
  var canvas=document.getElementById('klMain');if(!canvas)return;
  refreshSubChartDOM();
  var dpr=window.devicePixelRatio||1;var W=canvas.parentElement.clientWidth-12;
  var mainH=Math.max(120,W*0.45);canvas.style.width=W+'px';canvas.style.height=mainH+'px';
  canvas.width=W*dpr;canvas.height=mainH*dpr;
  var subH=Math.max(60,W*0.18);
  for(var si=0;si<_kl.subs.length;si++){
    var sc=document.getElementById('kl'+_kl.subs[si].charAt(0).toUpperCase()+_kl.subs[si].slice(1));
    if(sc){sc.style.width=W+'px';sc.style.height=subH+'px';sc.width=W*dpr;sc.height=subH*dpr}
  }
  fitSideHeight(mainH+subH*_kl.subs.length);
  setupChartDrag();
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
  function minToClock(m){
    if(m>=120){
      var a=m-120;var h=13+Math.floor(a/60),mn=a%60;
      return ('0'+h).slice(-2)+':'+('0'+mn).slice(-2);
    }
    var mh=Math.floor(m/60),mm=30+(m%60);
    if(mm>=60){mm-=60;mh++}
    var h=9+mh;
    return ('0'+h).slice(-2)+':'+('0'+mm).slice(-2);
  }
  var data=[];
  var deltaCum=0;
  for(var i=0;i<minutes.length;i++){
    var p=minutes[i].split(',');if(p.length<2)continue;
    var vol=Number(p[2]||0),amt=Number(p[3]||0);
    var dVol=i>0?(vol-deltaCum):vol;
    deltaCum=vol;
    data.push({time:p[0],price:Number(p[1]),close:Number(p[1]),min:timeToMin(p[0]),vol:dVol,amt:amt,preClose:preClose});
  }
  if(!data.length)return;
  if(!preClose)preClose=data[0].price;
  _intradayCache={data:data,preClose:preClose,totalMin:240};
  var totalMin=240;
  var padL=46,padR=8,padT=8,padB=20;
  var cW=W-padL-padR,cH=mainH-padT-padB;
  var minP=preClose,maxP=preClose;
  for(var i=0;i<data.length;i++){if(data[i].price<minP)minP=data[i].price;if(data[i].price>maxP)maxP=data[i].price}
  var pR=maxP-minP||1;minP-=pR*0.1;maxP+=pR*0.1;pR=maxP-minP;
  renderIntradayTicks(data,preClose);
  ctx.strokeStyle='#1f2124';ctx.lineWidth=0.5;
  for(var i=0;i<=4;i++){var y=padT+cH*i/4;ctx.beginPath();ctx.moveTo(padL,y);ctx.lineTo(W-padR,y);ctx.stroke();
    ctx.fillStyle='#666';ctx.font='10px monospace';ctx.textAlign='right';
    var v=maxP-pR*i/4;ctx.fillText(v.toFixed(2),padL-4,y+3);
    var pct=((v-preClose)/preClose*100).toFixed(2);ctx.fillStyle=v>=preClose?'#ff4d4f':'#23c343';ctx.textAlign='left';ctx.fillText(pct+'%',W-padR+2,y+3);
  }
  var closeY=padT+cH*(1-(preClose-minP)/pR);
  ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(padL,closeY);ctx.lineTo(W-padR,closeY);ctx.stroke();ctx.setLineDash([]);
  _intradayGeo={padL:padL,padR:padR,padT:padT,cW:cW,cH:cH,minP:minP,pR:pR,mainH:mainH,W:W,viewS:_idView.s,viewE:_idView.e};
  ctx.beginPath();ctx.strokeStyle='#36a2eb';ctx.lineWidth=1.5;
  for(var i=0;i<data.length;i++){
    var x=padL+cW*(data[i].min-_idView.s)/(_idView.e-_idView.s);
    var y=padT+cH*(1-(data[i].price-minP)/pR);
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }ctx.stroke();
  var grad=ctx.createLinearGradient(0,padT,0,padT+cH);grad.addColorStop(0,'rgba(54,162,235,.2)');grad.addColorStop(1,'rgba(54,162,235,.02)');
  ctx.lineTo(padL+cW*(data[data.length-1].min-_idView.s)/(_idView.e-_idView.s),padT+cH);ctx.lineTo(padL,padT+cH);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  ctx.fillStyle='#666';ctx.font='10px monospace';ctx.textAlign='center';
  var spanM=_idView.e-_idView.s;
  var stepM=spanM>180?60:(spanM>90?30:15);
  var s0=Math.ceil(_idView.s/stepM)*stepM;
  for(var m=s0;m<=_idView.e;m+=stepM){
    var tLabel=minToClock(m);
    var x=padL+cW*(m-_idView.s)/spanM;
    ctx.fillText(tLabel,x,mainH-4);
  }
  for(var si=0;si<_kl.subs.length;si++){
    drawIntradaySub(_kl.subs[si],data,preClose,W,dpr,subH);
  }
  _intradayTimer=setInterval(function(){
    if(_klPeriod==='intraday'&&_detailCode){
      vscode.postMessage({type:'fetchKline',code:_detailCode,period:'intraday'});
    }
  },3000);
}
function drawIntradaySub(sid,data,preClose,W,dpr,subH){
  var canvas=document.getElementById('kl'+sid.charAt(0).toUpperCase()+sid.slice(1));
  if(!canvas)return;
  var ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  var vW=canvas.width/dpr,vH=canvas.height/dpr;
  ctx.fillStyle='#12151a';ctx.fillRect(0,0,vW,vH);
  var vPadL=46,vPadR=8,vPadT=4,vPadB=12;
  var vCW=vW-vPadL-vPadR,vCH=vH-vPadT-vPadB;
  var span=_idView.e-_idView.s;
  function vx(m){return vPadL+vCW*(m-_idView.s)/span}
  if(sid==='vol'){
    var maxV=0;
    for(var i=0;i<data.length;i++)if(data[i].vol>maxV)maxV=data[i].vol;
    if(maxV>0){
      ctx.strokeStyle='#1f2124';ctx.lineWidth=0.5;
      for(var gi=0;gi<=2;gi++){var gy=vPadT+vCH*gi/2;ctx.beginPath();ctx.moveTo(vPadL,gy);ctx.lineTo(vW-vPadR,gy);ctx.stroke()}
      var prevP=preClose;
      for(var bi=0;bi<data.length;bi++){
        var bx=vx(data[bi].min);
        var bW=Math.max(1,vCW/span-1);
        var bH=data[bi].vol/maxV*vCH;
        var upDir=data[bi].price>=prevP;prevP=data[bi].price;
        ctx.fillStyle=upDir?'rgba(255,77,79,.55)':'rgba(35,195,67,.55)';
        ctx.fillRect(bx,vPadT+vCH-bH,bW,bH);
      }
      ctx.fillStyle='#666';ctx.font='9px monospace';ctx.textAlign='right';
      ctx.fillText(fmtPrice(maxV),vPadL-4,vPadT+10);
    }
  }else if(sid==='macd'){
    var md=calcMACD(data);var dif=md.dif,dea=md.dea,hist=md.macd;
    var mx=0;
    for(var i=0;i<data.length;i++){
      var a=Math.abs(hist[i]);if(a>mx)mx=a;
      var b=Math.abs(dif[i]);if(b>mx)mx=b;
      var c=Math.abs(dea[i]);if(c>mx)mx=c;
    }
    mx*=1.2||1;var sc=vCH/(mx*2);var mid=vPadT+vCH/2;
    ctx.strokeStyle='#1f2124';ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(vPadL,mid);ctx.lineTo(vW-vPadR,mid);ctx.stroke();
    var bW=Math.max(1,vCW/span-1);
    for(var i=0;i<data.length;i++){
      var x=vx(data[i].min);var v=hist[i];
      var bH=Math.abs(v)*sc;
      ctx.fillStyle=v>=0?'rgba(255,77,79,.6)':'rgba(35,195,67,.6)';
      ctx.fillRect(x,v>=0?mid-bH:mid,bW,bH);
    }
    var lc=['#36a2eb','#e8b393'];
    for(var L=0;L<2;L++){
      ctx.strokeStyle=lc[L];ctx.lineWidth=1;ctx.beginPath();var st=false;
      for(var i=0;i<data.length;i++){
        var x=vx(data[i].min);
        var v=L===0?dif[i]:dea[i];var y=mid-v*sc;
        if(!st){ctx.moveTo(x,y);st=true}else ctx.lineTo(x,y);
      }ctx.stroke();
    }
  }else if(sid==='rsi'){
    var r6=calcRSI(data,6),r12=calcRSI(data,12);
    var sc2=vCH/100;
    ctx.strokeStyle='#1f2124';ctx.lineWidth=0.5;
    [30,50,70].forEach(function(v){var y=vPadT+vCH*(1-v/100);ctx.beginPath();ctx.moveTo(vPadL,y);ctx.lineTo(vW-vPadR,y);ctx.stroke();
      ctx.fillStyle='#555';ctx.font='9px monospace';ctx.textAlign='right';ctx.fillText(v+'',vPadL-4,y+3)});
    var cols=['#36a2eb','#e8b393'];
    [r6,r12].forEach(function(vis,ci){
      ctx.strokeStyle=cols[ci];ctx.lineWidth=1;ctx.beginPath();var st=false;
      for(var i=0;i<data.length;i++){var x=vx(data[i].min);var y=vPadT+vCH*(1-vis[i]/100);
        if(!st){ctx.moveTo(x,y);st=true}else ctx.lineTo(x,y)}ctx.stroke()});
  }
  ctx.fillStyle='#666';ctx.font='9px sans-serif';ctx.textAlign='center';
  var labels={vol:'分时量能',macd:'MACD(12,26,9)',rsi:'RSI(6,12)'};
  ctx.fillText(labels[sid]||sid,vW/2,vH-3);
}

function renderIntradayTicks(data,preClose){
  _allTicks=data.slice();
  var tk=document.getElementById('tickList');if(!tk)return;
  var html='';
  var start=Math.max(0,data.length-16);
  var prev=preClose;
  var rows=[];
  for(var i=start;i<data.length;i++){
    var d=data[i];
    var hh=d.time.slice(0,2),mm=d.time.slice(2,4);
    var cls=d.price>=prev?'ob-up':'ob-down';prev=d.price;
    rows.push('<div class="tick-row"><span class="tick-time">'+hh+':'+mm+'</span>');
    rows.push('<span class="tick-price '+cls+'">'+d.price.toFixed(2)+'</span>');
    rows.push('<span class="tick-vol">'+fmtPrice(d.vol)+'</span></div>');
  }
  for(var ri=rows.length-1;ri>=0;ri--)html+=rows[ri];
  if(!html){html='<div style="padding:4px;opacity:.4">暂无数据</div>'}
  tk.innerHTML=html;
  var more=document.getElementById('tickMore');
  if(more)more.style.display=data.length>16?'block':'none';
}

function openTickModal(){
  var ov=document.createElement('div');ov.className='kl-modal-overlay';ov.id='tickModal';
  var modal=document.createElement('div');modal.className='kl-modal';
  modal.innerHTML='<div class="kl-modal-hdr"><span>全部成交（'+_detailName+'）</span><button id="tickModalClose">×</button></div>';
  var body=document.createElement('div');body.className='kl-modal-body';
  var html='';
  var prev=_allTicks.length>0?(_allTicks[0].preClose||0):0;
  var rows=[];
  for(var i=0;i<_allTicks.length;i++){
    var d=_allTicks[i];
    var hh=d.time.slice(0,2),mm=d.time.slice(2,4);
    var cls=d.price>=prev?'ob-up':'ob-down';prev=d.price;
    rows.push('<div class="tick-row"><span class="tick-time">'+hh+':'+mm+'</span>');
    rows.push('<span class="tick-price '+cls+'">'+d.price.toFixed(2)+'</span>');
    rows.push('<span class="tick-vol">'+fmtPrice(d.vol)+'</span></div>');
  }
  for(var ri=rows.length-1;ri>=0;ri--)html+=rows[ri];
  if(!html)html='<div style="padding:8px;opacity:.5">暂无数据</div>';
  body.innerHTML=html;
  modal.appendChild(body);
  ov.appendChild(modal);
  document.body.appendChild(ov);
  ov.addEventListener('click',function(e){if(e.target===ov)ov.remove()});
  var closeBtn=document.getElementById('tickModalClose');
  if(closeBtn)closeBtn.addEventListener('click',function(){ov.remove()});
}

function getFloatShares(){
  if(_detailCode)vscode.postMessage({type:'fetchQuote',code:_detailCode});
}

function setSideTab(side){
  var tabs=document.querySelectorAll('.kl-side-tabs button');
  for(var i=0;i<tabs.length;i++)tabs[i].classList.toggle('active',tabs[i].dataset.side===side);
  var book=document.getElementById('klSideBook');
  var chips=document.getElementById('klSideChips');
  if(book)book.style.display=side==='book'?'':'none';
  if(chips)chips.style.display=side==='chips'?'':'none';
}

function renderChips(rows){
  var canvas=document.getElementById('klChips');if(!canvas)return;
  if(!rows||!rows.length)return;
  var dpr=window.devicePixelRatio||1;
  var W=Math.max(120,canvas.parentElement.clientWidth-8);
  var H=Math.max(360,W*2.6);
  canvas.style.width=W+'px';canvas.style.height=H+'px';
  canvas.width=W*dpr;canvas.height=H*dpr;
  var ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  ctx.fillStyle='#12151a';ctx.fillRect(0,0,W,H);

  // parse klines (date,open,close,high,low,vol)
  var kdata=[];
  for(var i=0;i<rows.length;i++){
    var p=rows[i].split(',');if(p.length<6)continue;
    kdata.push({date:p[0],open:+p[1],close:+p[2],high:+p[3],low:+p[4],volume:+p[5]});
  }
  if(kdata.length<2){ctx.fillStyle='#666';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText('数据不足',W/2,H/2);return}
  var range=120;
  var start=Math.max(0,kdata.length-range);
  var use=kdata.slice(start);
  var factor=150;
  var maxPrice=0,minPrice=Infinity;
  for(var i=0;i<use.length;i++){if(use[i].high>maxPrice)maxPrice=use[i].high;if(use[i].low<minPrice)minPrice=use[i].low}
  var accuracy=Math.max(0.01,(maxPrice-minPrice)/(factor-1));
  var yr=[],xr=[];
  for(var i=0;i<factor;i++){yr.push((minPrice+accuracy*i));xr.push(0)}

  var floatShares=_floatShares||0;
  var lastClose=use[use.length-1].close;
  for(var i=0;i<use.length;i++){
    var k=use[i];
    var o=k.open,c=k.close,h=k.high,l=k.low;
    var avg=(o+c+h+l)/4;
    var volShares=k.volume*100;
    var hsl=floatShares>0?Math.min(1,volShares/floatShares):0.03;
    if(hsl<=0)hsl=0.02;
    var HIdx=Math.floor((h-minPrice)/accuracy);
    var LIdx=Math.ceil((l-minPrice)/accuracy);
    var GPx=(h==l?factor-1:2/(h-l));
    var GPy=Math.floor((avg-minPrice)/accuracy);
    for(var n=0;n<xr.length;n++)xr[n]*=(1-hsl);
    if(h==l){xr[GPy]+=GPx*hsl/2}
    else{
      for(var j=Math.max(0,LIdx);j<=Math.min(factor-1,HIdx);j++){
        var cur=minPrice+accuracy*j;
        var add;
        if(cur<=avg){
          add=Math.abs(avg-l)<1e-8?GPx*hsl:(cur-l)/(avg-l)*GPx*hsl;
        }else{
          add=Math.abs(h-avg)<1e-8?GPx*hsl:(h-cur)/(h-avg)*GPx*hsl;
        }
        xr[j]+=add;
      }
    }
  }
  var total=0;for(var i=0;i<xr.length;i++)total+=xr[i];
  var mx=0;for(var i=0;i<xr.length;i++)if(xr[i]>mx)mx=xr[i];
  if(mx<=0){ctx.fillStyle='#666';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText('暂无筹码数据',W/2,H/2);return}

  // draw horizontal bars from right
  var padL=44,padR=6,padT=6,padB=6;
  var barH=(H-padT-padB)/factor;
  for(var i=0;i<xr.length;i++){
    var w=(xr[i]/mx)*(W-padL-padR);
    var y=padT+i*barH;
    var cur=yr[i];
    var isUp=cur>=lastClose;
    ctx.fillStyle=isUp?'rgba(255,77,79,.75)':'rgba(35,195,67,.75)';
    ctx.fillRect(W-padR-w,y,Math.max(w,0.5),Math.max(barH-1,0.5));
    if(i%15===0||i===0){
      ctx.fillStyle='#666';ctx.font='8px monospace';ctx.textAlign='right';
      ctx.fillText(cur.toFixed(2),padL-2,y+8);
    }
  }
  // current price line
  var lineY=padT+((lastClose-minPrice)/accuracy)*barH;
  ctx.strokeStyle='#e8b339';ctx.lineWidth=1;ctx.setLineDash([3,3]);
  ctx.beginPath();ctx.moveTo(padL,lineY);ctx.lineTo(W-padR,lineY);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#e8b339';ctx.font='9px sans-serif';ctx.textAlign='left';
  ctx.fillText('现价 '+lastClose.toFixed(2),padL,lineY-3);

  // profit ratio & avg cost
  var benefit=0;
  for(var i=0;i<xr.length;i++){if(yr[i]<=lastClose)benefit+=xr[i]}
  var benefitPct=total>0?(benefit/total*100):0;
  var half=total*0.5,acc=0,avgCost=0;
  for(var i=0;i<xr.length;i++){acc+=xr[i];if(acc>=half){avgCost=yr[i];break}}
  ctx.fillStyle='#fff';ctx.font='10px sans-serif';ctx.textAlign='left';
  ctx.fillText('获利比例 '+benefitPct.toFixed(1)+'%',padL,H-24);
  ctx.fillText('平均成本 '+avgCost.toFixed(2),padL,H-10);
  ctx.fillStyle='#666';ctx.font='9px sans-serif';ctx.textAlign='right';
  ctx.fillText('近'+use.length+'日',W-padR,H-10);
  var sum=document.getElementById('chipsSummary');
  if(sum)sum.innerHTML='';
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
    var s=sells[i];var cls='ob-down';
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
    var b=buys[i];var cls='ob-up';
    html+='<div class="ob-row"><span class="ob-label">'+b.label+'</span>';
    html+='<span class="ob-price '+cls+'">'+(b.price?b.price.toFixed(2):'-')+'</span>';
    html+='<span class="ob-vol">'+(b.vol?b.vol:'-')+'</span></div>';
  }
  ob.innerHTML=html;
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
  _detailCode=code;_detailName=name||'';_detailTab='news';_chipsData=null;_floatShares=0;
  var s={code:code,name:name||'',price:0,changeRate:0,open:0,preClose:0,high:0,low:0,volume:0,amount:0,turnover:0};
  renderStockDetail(s);
  vscode.postMessage({type:'fetchQuote',code:code});
}

function updateDetailQuote(d){
  if(!d)return;
  _lastQuote=d;
  if(d.f72)_floatShares=d.f72;
  if(_klPeriod==='chips'&&_chipsData){try{renderChips(_chipsData);}catch(e){}}
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
    _tabCache[msg.tab]=msg.data;
    renderTabData(msg.tab,msg.data);
  }else if(msg.type==='refreshTab'&&msg.tab==='watchlist'&&currentTab==='watchlist'&&!_inDetail){
    vscode.postMessage({type:'switchTab',tab:'watchlist'});
  }else if(msg.type==='klineData'&&msg.code===_detailCode){
    if(msg.period==='chips'){_chipsData=msg.data||[];setSideTab('chips');try{getFloatShares();}catch(e){}renderChips(msg.data||[]);}
    else drawKline(msg.data||[]);
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
