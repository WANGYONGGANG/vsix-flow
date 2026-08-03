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
:root{--bg:#0a0c10;--fg:#b8bfc6;--up:#ff4d4f;--down:#23c343;--card:#12151a;--border:#1f2124;--accent:#e8b339}
html,body{background:var(--bg);color:var(--fg);font:13px/1.5 -apple-system,sans-serif;height:100vh;overflow:hidden}
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
th{text-align:left;opacity:.6;font-weight:400}td:first-child,th:first-child{text-align:left}
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
.kl-chart{background:var(--card);border-radius:6px;padding:6px 0;cursor:crosshair;user-select:none;touch-action:none}
.kl-canvas{width:100%;display:block}
.kl-sub{border-top:1px solid var(--border);position:relative}
.kl-sub-hdr{display:flex;align-items:center;justify-content:space-between;padding:2px 8px 0;font-size:10px;opacity:.6}
.kl-sub-hdr button{background:none;border:none;color:var(--fg);opacity:.5;cursor:pointer;font-size:10px;padding:0 4px}
.kl-sub-hdr button:hover{opacity:1}
.kl-sub canvas{width:100%;display:block}
.detail-actions{margin-top:14px;display:flex;gap:8px}
.detail-actions button{flex:1;padding:8px;border:none;border-radius:6px;font-size:12px;cursor:pointer}
.detail-actions .btn-del{background:rgba(255,77,79,.15);color:var(--up)}
.detail-actions .btn-del:hover{background:rgba(255,77,79,.3)}
.detail-actions .btn-back{background:var(--bg);color:var(--fg);border:1px solid var(--border)}
.detail-actions .btn-back:hover{background:#1a1e24}
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
  {id:'sector_limit',label:'板块'},{id:'limit_leader',label:'龙头'},{id:'strong_sector',label:'强板'},
  {id:'dragon_tiger',label:'龙虎'},{id:'yesterday_limit',label:'涨停'},{id:'alert',label:'异动'},
  {id:'hot_stocks',label:'热股'},{id:'watchlist',label:'自选'},
];
var CHG_TYPES={4:'秒板',8:'封板',16:'打开涨停',32:'大笔买入',64:'大笔卖出',128:'大笔买入',8193:'火箭发射',8194:'快速反弹',8201:'加速上涨',8202:'高台跳水',8203:'加速下跌',8204:'大笔卖出',8207:'大幅上升',8208:'大幅下降',8209:'封涨停',8210:'封跌停',8211:'打开涨停',8212:'打开跌停',8213:'创历史新高',8214:'创历史新低',8215:'竞价上涨',8216:'竞价下跌'};
var currentTab='market_overview';
function $(s){return document.querySelector(s)}
function esc(s){var d=document.createElement('div');d.textContent=s||'';return d.innerHTML}
function fmtPrice(v){v=Number(v)||0;return v>10000?(v/10000).toFixed(2)+'万':v.toLocaleString('zh-CN',{maximumFractionDigits:0})}
function fmtYi(v){v=Number(v)||0;return (v/100000000).toFixed(2)+'亿'}
function upClass(v){return v>=0?'text-up':'text-down'}
function upSign(v){return v>=0?'+':''}
function fmtTime(t){var s=String(t);if(s.length>=6)return s.slice(0,2)+':'+s.slice(2,4);return s}
function renderTabs(){var bar=$('#tabBar');if(!bar)return;bar.innerHTML='';for(var i=0;i<TABS.length;i++){var t=TABS[i];var btn=document.createElement('button');btn.className='tab-btn'+(t.id===currentTab?' active':'');btn.setAttribute('data-tab',t.id);btn.textContent=t.label;bar.appendChild(btn)}}
function switchTab(tab){currentTab=tab;renderTabs();$('#content').innerHTML='<div class="loading">加载中...</div>';vscode.postMessage({type:'switchTab',tab:tab})}
$('#tabBar').addEventListener('click',function(e){var btn=e.target.closest('.tab-btn');if(btn)switchTab(btn.getAttribute('data-tab'))});
document.addEventListener('click',function(e){
  var item=e.target.closest('.news-item');
  if(item&&item.getAttribute('data-url')){
    vscode.postMessage({type:'openUrl',url:item.getAttribute('data-url')});
    return;
  }
  if(e.target.closest('.wl-del')||e.target.closest('.wl-add')||e.target.closest('.detail-actions'))return;
  var card=e.target.closest('.wl-card');
  if(card&&card.dataset.idx!==undefined){
    var stock=_wlData[Number(card.dataset.idx)];
    if(stock)renderStockDetail(stock);
  }
});

function renderMarket(d){
  var indices=d.indices||d;if(!indices||!indices.length){$('#content').innerHTML='<div class="loading">暂无数据</div>';return}
  var html='<div class="grid-3">';
  for(var i=0;i<Math.min(3,indices.length);i++){var item=indices[i];var price=item.price||item.f2||0;var rate=item.changeRate!=null?item.changeRate:(item.f3||0);var name=item.name||item.f14||'';var up=rate>=0;html+='<div class="card"><div class="text-muted mb-1">'+esc(name)+'</div><div class="'+(up?'text-up':'text-down')+'" style="font-size:18px;font-weight:700">'+(price||0).toFixed(2)+'</div><div class="'+(up?'text-up':'text-down')+'">'+(rate>=0?'+':'')+(rate||0).toFixed(2)+'%</div></div>'}
  html+='</div>';
  if(indices.length>3){html+='<div class="card"><div class="section-title">指数对比</div>';for(var j=0;j<indices.length;j++){var it=indices[j];var rt=it.changeRate!=null?it.changeRate:(it.f3||0);var up2=rt>=0;html+='<div class="flex items-center gap-2 mb-1"><span class="text-muted" style="width:56px">'+esc(it.name||it.f14||'')+'</span><span class="'+(up2?'text-up':'text-down')+'">'+(rt>=0?'+':'')+(rt||0).toFixed(2)+'%</span><span class="text-muted">'+(Number(it.price||it.f2)||0).toFixed(2)+'</span></div>'}html+='</div>'}
  $('#content').innerHTML=html
}

function renderNews(d){
  var list=d&&d.news?d.news:(d&&d.data?d.data.list:[]);if(!list.length){$('#content').innerHTML='<div class="loading">暂无新闻</div>';return}
  var html='';for(var i=0;i<Math.min(80,list.length);i++){var n=list[i];var url=n.url_w||n.url_m||n.url||'';var title=n.title||n.Art_Title||'';var time=n.showtime||n.ctime||'';var src=n.Art_Media_Name||n.source||'';html+='<div class="news-item" data-url="'+esc(url)+'"><div class="time">'+esc(time)+' '+(src?'· '+esc(src):'')+'</div><div class="title">'+esc(title)+'</div></div>'}
  $('#content').innerHTML=html
}

function renderSector(d){
  var list=d&&d.data?d.data.diff:(d||[]);if(!list||!list.length){$('#content').innerHTML='<div class="loading">暂无数据</div>';return}
  list=list.slice().sort(function(a,b){return (b.f174||b.f62||0)-(a.f174||a.f62||0)});
  var html='<table><tr><th>板块</th><th>主力净流入</th></tr>';
  for(var i=0;i<Math.min(30,list.length);i++){var x=list[i];var flow=Number(x.f174||x.f62||0);html+='<tr><td>'+esc(x.f14||'')+'</td><td class="'+(flow>=0?'text-up':'text-down')+'">'+(flow>=0?'+':'')+fmtYi(flow)+'</td></tr>'}
  html+='</table>';$('#content').innerHTML=html
}

function renderFundFlow(d){
  var ind=d.industry||[];var gn=d.concept||[];
  ind=ind.slice().sort(function(a,b){return (b.f174||0)-(a.f174||0)});
  gn=gn.slice().sort(function(a,b){return (b.f174||0)-(a.f174||0)});
  var html='<div class="section-title">行业资金流入 TOP10</div><table><tr><th>行业</th><th>主力净流入</th></tr>';
  for(var i=0;i<Math.min(10,ind.length);i++){var x=ind[i];var f=Number(x.f174||0);html+='<tr><td>'+esc(x.f14||'')+'</td><td class="'+(f>=0?'text-up':'text-down')+'">'+(f>=0?'+':'')+fmtYi(f)+'</td></tr>'}
  html+='</table>';
  html+='<div class="section-title">概念资金流入 TOP10</div><table><tr><th>概念</th><th>主力净流入</th></tr>';
  for(var j=0;j<Math.min(10,gn.length);j++){var y=gn[j];var g=Number(y.f174||0);html+='<tr><td>'+esc(y.f14||'')+'</td><td class="'+(g>=0?'text-up':'text-down')+'">'+(g>=0?'+':'')+fmtYi(g)+'</td></tr>'}
  html+='</table>';$('#content').innerHTML=html
}

function renderLimitPool(d){
  var pool=d&&d.data?d.data.pool:(d&&d.pool?d.pool:[]);if(!pool||!pool.length){$('#content').innerHTML='<div class="loading">暂无涨停数据</div>';return}
  pool=pool.slice().sort(function(a,b){return (b.lbc||0)-(a.lbc||0)||(b.zdp||0)-(a.zdp||0)});
  var html='<table><tr><th>名称/代码</th><th>连板</th><th>涨停原因</th><th>封板</th><th>炸板</th></tr>';
  for(var i=0;i<pool.length;i++){var x=pool[i];html+='<tr><td>'+esc(x.n||'')+'<div class="text-muted" style="font-size:10px">'+esc(x.c||'')+'</div></td><td><span class="tag tag-up">'+(x.lbc||1)+'板</span></td><td class="text-muted">'+esc(x.hybk||'')+'</td><td>'+fmtTime(x.fbt)+'</td><td>'+(x.zbc||0)+'</td></tr>'}
  html+='</table>';$('#content').innerHTML=html
}

function renderLeader(d){
  var pool=d&&d.data?d.data.pool:(d&&d.pool?d.pool:[]);if(!pool||!pool.length){$('#content').innerHTML='<div class="loading">暂无数据</div>';return}
  pool=pool.slice().filter(function(x){return (x.lbc||1)>=2}).sort(function(a,b){return (b.lbc||0)-(a.lbc||0)||(b.zdp||0)-(a.zdp||0)});
  if(!pool.length){$('#content').innerHTML='<div class="loading">今日暂无连板股</div>';return}
  var html='<table><tr><th>名称/代码</th><th>连板</th><th>涨幅</th><th>板块</th></tr>';
  for(var i=0;i<pool.length;i++){var x=pool[i];html+='<tr><td>'+esc(x.n||'')+'<div class="text-muted" style="font-size:10px">'+esc(x.c||'')+'</div></td><td><span class="tag tag-accent">'+(x.lbc||1)+'板</span></td><td class="text-up">+'+(x.zdp||0).toFixed(2)+'%</td><td class="text-muted">'+esc(x.hybk||'')+'</td></tr>'}
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
  for(var i=0;i<list.length;i++){var x=list[i];var net=Number(x.BILLBOARD_NET_AMT||0);html+='<tr><td>'+esc(x.SECURITY_NAME_ABBR||'')+'<div class="text-muted" style="font-size:10px">'+esc(x.SECURITY_CODE||'')+'</div></td><td class="'+upClass(x.CHANGE_RATE)+'">'+upSign(x.CHANGE_RATE)+(x.CHANGE_RATE||0).toFixed(2)+'%</td><td class="'+(net>=0?'text-up':'text-down')+'">'+(net>=0?'+':'')+fmtYi(net)+'</td><td class="text-muted">'+esc(x.EXPLANATION||x.EXPLAIN||'')+'</td></tr>'}
  html+='</table>';$('#content').innerHTML=html
}

function renderAlert(d){
  var list=d&&d.data?d.data.list:(d&&d.list?d.list:[]);if(!list||!list.length){$('#content').innerHTML='<div class="loading">暂无异动</div>';return}
  var html='<table><tr><th>时间</th><th>名称/代码</th><th>异动</th><th>信息</th></tr>';
  for(var i=0;i<Math.min(60,list.length);i++){var x=list[i];var label=CHG_TYPES[x.t]||('类型'+x.t);var isUp=(x.t==4||x.t==8||x.t==32||x.t==128||x.t==8193||x.t==8194||x.t==8201||x.t==8207||x.t==8209||x.t==8211||x.t==8213||x.t==8215);html+='<tr><td class="text-muted">'+fmtTime(x.tm)+'</td><td>'+esc(x.n||'')+'<div class="text-muted" style="font-size:10px">'+esc(x.c||'')+'</div></td><td><span class="tag '+(isUp?'tag-up':'tag-down')+'">'+esc(label)+'</span></td><td class="text-muted">'+esc(x.i||'')+'</td></tr>'}
  html+='</table>';$('#content').innerHTML=html
}

function renderHot(d){
  var list=d&&d.data?d.data.diff:(d&&d.diff?d.diff:[]);if(!list||!list.length){$('#content').innerHTML='<div class="loading">暂无数据</div>';return}
  var html='<table><tr><th>代码</th><th>名称</th><th>最新价</th><th>涨跌幅</th></tr>';
  for(var i=0;i<Math.min(30,list.length);i++){var x=list[i];html+='<tr><td>'+esc(x.f12||'')+'</td><td>'+esc(x.f14||'')+'</td><td>'+(x.f2||0).toFixed(2)+'</td><td class="'+upClass(x.f3)+'">'+upSign(x.f3)+(x.f3||0).toFixed(2)+'%</td></tr>'}
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
  var code=esc(s.code||'');var name=esc(s.name||'');var price=Number(s.price||0).toFixed(2);
  var rate=Number(s.changeRate||0);var up=rate>=0;
  var preClose=Number(s.preClose||0).toFixed(2);
  var open=Number(s.open||0).toFixed(2);
  var high=Number(s.high||0).toFixed(2);
  var low=Number(s.low||0).toFixed(2);
  var vol=Number(s.volume||0);var volStr=vol>=10000?(vol/10000).toFixed(1)+'万':vol.toLocaleString('zh-CN');
  var amt=Number(s.amount||0);var amtStr=amt>=100000000?(amt/100000000).toFixed(2)+'亿':amt>=10000?(amt/10000).toFixed(1)+'万':amt.toLocaleString('zh-CN');
  var turnover=Number(s.turnover||0).toFixed(2);
  var chg=Number(s.price||0)-Number(s.preClose||0);var chgStr=(chg>=0?'+':'')+chg.toFixed(2);
  var html='<button class="detail-back" id="detailBack">← 返回自选</button>';
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
  html+='<button class="kl-pbtn active" data-period="day">日K</button>';
  html+='<button class="kl-pbtn" data-period="week">周K</button>';
  html+='<button class="kl-pbtn" data-period="month">月K</button>';
  html+='<button class="kl-add" id="klAddSub">+ 副图</button>';
  html+='</div>';
  html+='<div class="kl-chart" id="klChart">';
  html+='<canvas class="kl-canvas" id="klMain"></canvas>';
  html+='<div class="kl-sub" id="klSubVol"><div class="kl-sub-hdr"><span>成交量</span></div><canvas class="kl-canvas" id="klVol"></canvas></div>';
  html+='</div>';
  html+='<div class="detail-actions"><button class="btn-del" id="detailDel">删除自选</button><button class="btn-back" id="detailBackBtn">返回列表</button></div>';
  $('#content').innerHTML=html;
  var goBack=function(){vscode.postMessage({type:'switchTab',tab:'watchlist'})};
  var backBtn=document.getElementById('detailBack');
  if(backBtn)backBtn.addEventListener('click',goBack);
  var backBtn2=document.getElementById('detailBackBtn');
  if(backBtn2)backBtn2.addEventListener('click',goBack);
  var delBtn=document.getElementById('detailDel');
  if(delBtn)delBtn.addEventListener('click',function(){vscode.postMessage({type:'delWatch',code:s.code})});
  _detailCode=s.code;_klPeriod='day';
  vscode.postMessage({type:'fetchKline',code:s.code,period:'day'});
  var pbtns=document.querySelectorAll('.kl-pbtn[data-period]');
  for(var i=0;i<pbtns.length;i++){
    pbtns[i].addEventListener('click',function(){
      _klPeriod=this.dataset.period;
      vscode.postMessage({type:'fetchKline',code:s.code,period:_klPeriod});
      updateSubBtns();
    });
  }
}

var _detailCode='';var _klinePeriod='day';
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
    else $('#content').innerHTML='<div class="loading">开发中...</div>'
  }else if(msg.type==='refreshTab'&&msg.tab==='watchlist'&&currentTab==='watchlist'){
    vscode.postMessage({type:'switchTab',tab:'watchlist'});
  }else if(msg.type==='klineData'&&msg.code===_detailCode){
    drawKline(msg.data||[]);
  }
});
</script>
</body>
</html>`;
}
