
window.onerror=function(m,s,l,c,e){document.getElementById('content').innerHTML='<pre style="color:red;padding:10px">'+m+' at line '+l+':'+c+'</pre>';};
var vscode=acquireVsCodeApi();
var TABS=[
  {id:'market_overview',label:'概况'},{id:'fundFlow',label:'资金'},{id:'em_news',label:'新闻'},
  {id:'sector_limit',label:'板块'},{id:'limit_leader',label:'龙头'},{id:'strong_sector',label:'强板'},
  {id:'dragon_tiger',label:'龙虎'},{id:'yesterday_limit',label:'涨停'},{id:'alert',label:'异动'},
  {id:'hot_stocks',label:'热股'},{id:'watchlist',label:'自选'},
];
var currentTab='market_overview';
function $(s){return document.querySelector(s)}
function esc(s){var d=document.createElement('div');d.textContent=s||'';return d.innerHTML}
function renderTabs(){var bar=$('#tabBar');if(!bar)return;bar.innerHTML='';for(var i=0;i<TABS.length;i++){var t=TABS[i];var btn=document.createElement('button');btn.className='tab-btn'+(t.id===currentTab?' active':'');btn.setAttribute('data-tab',t.id);btn.textContent=t.label;bar.appendChild(btn)}}
function switchTab(tab){currentTab=tab;renderTabs();$('#content').innerHTML='<div class="loading">加载中...</div>';vscode.postMessage({type:'switchTab',tab:tab})}
$('#tabBar').addEventListener('click',function(e){var btn=e.target.closest('.tab-btn');if(btn)switchTab(btn.getAttribute('data-tab'))});
function renderMarket(d){
  if(!d||!d.indices){$('#content').innerHTML='<div class="loading">暂无数据</div>';return}
  var indices=d.indices;var html='<div class="grid-3">';
  for(var i=0;i<Math.min(3,indices.length);i++){var item=indices[i];var up=item.changeRate>=0;html+='<div class="card"><div class="text-muted mb-1">'+esc(item.name||'')+'</div><div class="'+(up?'text-up':'text-down')+'" style="font-size:18px;font-weight:700">'+item.price.toFixed(2)+'</div><div class="'+(up?'text-up':'text-down')+'">'+(item.changeRate>=0?'+':'')+item.changeRate.toFixed(2)+'%</div></div>'}
  html+='</div>';$('#content').innerHTML=html
}
function renderNews(d){var list=d&&d.news?d.news:[];if(!list.length){$('#content').innerHTML='<div class="loading">暂无新闻</div>';return}var html='';for(var i=0;i<list.length;i++){var n=list[i];html+='<div class="card"><div class="text-muted mb-1">'+esc(n.time||'')+'</div><div style="font-weight:500">'+esc(n.title||'')+'</div></div>'}$('#content').innerHTML=html}
function renderSector(d){var list=d&&d.data?d.data.diff:[];if(!list||!list.length){$('#content').innerHTML='<div class="loading">暂无数据</div>';return}list.sort(function(a,b){return (b.f3||0)-(a.f3||0)});var html='<table><tr><th>板块</th><th>涨跌幅</th><th>上涨/下跌</th></tr>';for(var i=0;i<Math.min(50,list.length);i++){var d=list[i];html+='<tr><td>'+esc(d.f14||'')+'</td><td class="'+(d.f3>=0?'text-up':'text-down')+'">'+(d.f3>=0?'+':'')+(d.f3||0).toFixed(2)+'%</td><td><span class="text-up">'+(d.f104||0)+'</span>/<span class="text-down">'+(d.f105||0)+'</span></td></tr>'}html+='</table>';$('#content').innerHTML=html}
function renderLeader(d){var list=d&&d.data?d.data.diff:[];if(!list||!list.length){$('#content').innerHTML='<div class="loading">暂无数据</div>';return}list=list.filter(function(x){return x.f3>9}).sort(function(a,b){return (b.f3||0)-(a.f3||0)});var html='<table><tr><th>代码</th><th>名称</th><th>涨幅</th></tr>';for(var i=0;i<Math.min(30,list.length);i++){var d=list[i];html+='<tr><td>'+esc(d.f12||'')+'</td><td>'+esc(d.f14||'')+'</td><td class="text-up">+'+(d.f3||0).toFixed(2)+'%</td></tr>'}html+='</table>';$('#content').innerHTML=html}
function renderHot(d){var list=d&&d.data?d.data.diff:[];if(!list||!list.length){$('#content').innerHTML='<div class="loading">暂无数据</div>';return}var html='<table><tr><th>代码</th><th>名称</th><th>最新价</th><th>涨跌幅</th></tr>';for(var i=0;i<Math.min(30,list.length);i++){var d=list[i];html+='<tr><td>'+esc(d.f12||'')+'</td><td>'+esc(d.f14||'')+'</td><td>'+(d.f2||0).toFixed(2)+'</td><td class="'+(d.f3>=0?'text-up':'text-down')+'">'+(d.f3>=0?'+':'')+(d.f3||0).toFixed(2)+'%</td></tr>'}html+='</table>';$('#content').innerHTML=html}
renderTabs();switchTab('market_overview');
window.addEventListener('message',function(e){
  var msg=e.data;
  if(msg.type==='tabData'&&msg.tab===currentTab){
    if(msg.tab==='market_overview')renderMarket(msg.data);
    else if(msg.tab==='em_news')renderNews(msg.data);
    else if(msg.tab==='sector_limit')renderSector(msg.data);
    else if(msg.tab==='limit_leader')renderLeader(msg.data);
    else if(msg.tab==='hot_stocks')renderHot(msg.data);
    else $('#content').innerHTML='<div class="loading">开发中...</div>'
  }
});
