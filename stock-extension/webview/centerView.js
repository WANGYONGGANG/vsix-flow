window.onerror=function(m,s,l,c,e){document.getElementById('content').innerHTML='<pre style="color:red;padding:10px">'+m+' at line '+l+':'+c+'</pre>';try{vscode.postMessage({type:'__error',message:String(m),line:l})}catch(_){}};
var vscode=acquireVsCodeApi();
try{vscode.postMessage({type:'__ready'})}catch(_){}
var _currentTheme='classic';
var _riseColor='';var _fallColor='';
var THEMES={
  classic:{bg:'#0a0c10',fg:'#b8bfc6',up:'#ff4d4f',down:'#23c343',card:'#12151a',border:'#1f2124',accent:'#e8b339',msgBg:'#1a1d24',name:'经典主题'},
  dark:{bg:'#111111',fg:'#cccccc',up:'#ff5252',down:'#4caf50',card:'#1e1e1e',border:'#333333',accent:'#4fc3f7',msgBg:'#252525',name:'黑色主题'},
  light:{bg:'#ffffff',fg:'#333333',up:'#d32f2f',down:'#2e7d32',card:'#f5f5f5',border:'#e0e0e0',accent:'#1976d2',msgBg:'#eeeeee',name:'白色主题'},
  system:{bg:'#0a0c10',fg:'#b8bfc6',up:'#ff4d4f',down:'#23c343',card:'#12151a',border:'#1f2124',accent:'#e8b339',msgBg:'#1a1d24',name:'跟随系统'}
};
function applyTheme(themeId){
  var t=THEMES[themeId]||THEMES.classic;
  _currentTheme=themeId;
  var r=document.documentElement;
  r.style.setProperty('--bg',t.bg);
  r.style.setProperty('--fg',t.fg);
  r.style.setProperty('--up',_riseColor||t.up);
  r.style.setProperty('--down',_fallColor||t.down);
  r.style.setProperty('--card',t.card);
  r.style.setProperty('--border',t.border);
  r.style.setProperty('--accent',t.accent);
  r.style.setProperty('--msg-bg',t.msgBg);
}
function applySettingsColors(cfg){
  if(!cfg)return;
  if(cfg.riseColor!==undefined&&cfg.riseColor!==null)_riseColor=cfg.riseColor;
  if(cfg.fallColor!==undefined&&cfg.fallColor!==null)_fallColor=cfg.fallColor;
  var r=document.documentElement;
  r.style.setProperty('--up',_riseColor||THEMES[_currentTheme].up);
  r.style.setProperty('--down',_fallColor||THEMES[_currentTheme].down);
}
var TABS=[
  {id:'market_overview',label:'概况'},{id:'fundFlow',label:'资金'},{id:'em_news',label:'新闻'},
  {id:'realtime_news',label:'快讯'},{id:'sector_limit',label:'板块'},{id:'limit_leader',label:'龙头'},
  {id:'strong_sector',label:'强板'},{id:'dragon_tiger',label:'龙虎'},{id:'yesterday_limit',label:'涨停'},
  {id:'alert',label:'异动'},{id:'hot_stocks',label:'热股'},{id:'watchlist',label:'自选'},{id:'agent',label:'AI助手'},{id:'settings',label:'设置'},
];
var CHG_TYPES={4:'秒板',8:'封板',16:'打开涨停',32:'大笔买入',64:'大笔卖出',128:'大笔买入',8193:'火箭发射',8194:'快速反弹',8201:'加速上涨',8202:'高台跳水',8203:'加速下跌',8204:'大笔卖出',8207:'大幅上升',8208:'大幅下降',8209:'封涨停',8210:'封跌停',8211:'打开涨停',8212:'打开跌停',8213:'创历史新高',8214:'创历史新低',8215:'竞价上涨',8216:'竞价下跌'};
var currentTab='market_overview';
var voiceOn=false;var _lastNewsIds=[];var _lastAlertIds=[];var _lastAlertData=[];
var _selectedVoiceURI='';var _availableVoices=[];
var _selectedVoicePreset='default';
try{var _vstate=vscode.getState();if(_vstate&&_vstate.voiceURI){_selectedVoiceURI=_vstate.voiceURI;}if(_vstate&&_vstate.voicePreset){_selectedVoicePreset=_vstate.voicePreset;}}catch(_){}
var VOICE_PRESETS=[
  {id:'default',name:'默认语音',rate:1.1,pitch:1,gender:''},
  {id:'gentle_female',name:'温柔女声',rate:0.95,pitch:1.15,gender:'female'},
  {id:'magnetic_male',name:'磁性男声',rate:0.9,pitch:0.85,gender:'male'},
  {id:'lively_girl',name:'活泼少女',rate:1.25,pitch:1.3,gender:'female'},
  {id:'calm_anchor',name:'沉稳播音',rate:0.85,pitch:0.95,gender:'male'},
  {id:'child_voice',name:'童声播报',rate:1.15,pitch:1.6,gender:'child'},
  {id:'fast_news',name:'快速播报',rate:1.5,pitch:1,gender:''}
];
var _maleKeywords=['kangkang','david','george','ravi','mark','male','男','yunxi','yunyang','google 普通话（中国大陆）','google mandarin','pinyin'];
var _femaleKeywords=['huihui','yaoyao','zira','susan','anna','female','女','xiaoxiao','xiaoyi','tingting','google 普通话','google粤','cantonese'];
var _childKeywords=['child','kid','童','xiaoyou'];
function matchVoiceForGender(gender){
  if(!gender||!_availableVoices.length)return '';
  var kws=gender==='male'?_maleKeywords:gender==='female'?_femaleKeywords:gender==='child'?_childKeywords:[];
  if(!kws.length)return '';
  var zhVoices=[];var otherVoices=[];
  for(var i=0;i<_availableVoices.length;i++){
    var v=_availableVoices[i];var vn=(v.name||'').toLowerCase();
    var lang=(v.lang||'').toLowerCase();
    if(lang.indexOf('zh')>=0||lang.indexOf('cmn')>=0||lang.indexOf('chinese')>=0)zhVoices.push(v);else otherVoices.push(v);
  }
  var searchList=zhVoices.length?zhVoices:_availableVoices;
  for(var i=0;i<searchList.length;i++){
    var vn=(searchList[i].name||'').toLowerCase();
    for(var j=0;j<kws.length;j++){if(vn.indexOf(kws[j])>=0)return searchList[i].voiceURI;}
  }
  return '';
}
function getEffectiveVoiceURI(){
  if(_selectedVoiceURI)return _selectedVoiceURI;
  var preset=getVoicePreset(_selectedVoicePreset);
  return matchVoiceForGender(preset.gender);
}
function getVoiceNameByURI(uri){
  if(!uri)return '';
  for(var i=0;i<_availableVoices.length;i++){
    if(_availableVoices[i].voiceURI===uri)return _availableVoices[i].name||'';
  }
  return '';
}
function warmUpVoices(){
  if(!('speechSynthesis' in window))return;
  _availableVoices=window.speechSynthesis.getVoices()||[];
  if(!_availableVoices.length){
    var u=new SpeechSynthesisUtterance(' ');u.lang='zh-CN';u.volume=0;
    window.speechSynthesis.speak(u);
    setTimeout(function(){_availableVoices=window.speechSynthesis.getVoices()||[];},200);
  }
}
function loadVoices(){
  if(!('speechSynthesis' in window))return;
  _availableVoices=window.speechSynthesis.getVoices()||[];
  if(_availableVoices.length&&!_selectedVoiceURI){
    var preset=getVoicePreset(_selectedVoicePreset);
    var matched=matchVoiceForGender(preset.gender);
    if(matched){
      _selectedVoiceURI=matched;
      try{var st=vscode.getState()||{};st.voiceURI=matched;vscode.setState(st);}catch(_){}
    }
  }
}
if('speechSynthesis' in window){loadVoices();warmUpVoices();window.speechSynthesis.onvoiceschanged=loadVoices;}
function getVoicePreset(id){for(var i=0;i<VOICE_PRESETS.length;i++){if(VOICE_PRESETS[i].id===id)return VOICE_PRESETS[i];}return VOICE_PRESETS[0];}
function speakText(text){if(!text)return;if(!('speechSynthesis' in window))return;window.speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';var preset=getVoicePreset(_selectedVoicePreset);u.rate=preset.rate;u.pitch=preset.pitch;var uri=getEffectiveVoiceURI();if(uri){for(var i=0;i<_availableVoices.length;i++){if(_availableVoices[i].voiceURI===uri){u.voice=_availableVoices[i];break;}}}window.speechSynthesis.speak(u)}
function toggleVoice(){voiceOn=!voiceOn;var btn=document.getElementById('voiceBtn');if(btn){btn.className='voice-toggle'+(voiceOn?' on':'');btn.querySelector('.voice-icon').textContent=voiceOn?'🔊':'🔇';btn.querySelector('.voice-label').textContent=voiceOn?'播报中':'播报'}if(voiceOn&&currentTab==='realtime_news')speakLatestNews();if(voiceOn&&currentTab==='alert')speakLatestAlert()}
function speakLatestNews(){if(!voiceOn||currentTab!=='realtime_news')return;var items=document.querySelectorAll('#content .realtime-item .rt-title');if(items.length>0)speakText(items[0].textContent)}
function speakLatestAlert(){if(!voiceOn||currentTab!=='alert')return;if(!_lastAlertData||!_lastAlertData.length)return;var x=_lastAlertData[0];var lbl=CHG_TYPES[x.t]||'异动';speakText((x.n||'')+'，'+lbl+'，'+decodeAlertSpeech(x.t,x.i))}
function renderTabs(){var bar=$('#tabBar');if(!bar)return;bar.innerHTML='';for(var i=0;i<TABS.length;i++){var t=TABS[i];var btn=document.createElement('button');btn.className='tab-btn'+(t.id===currentTab?' active':'');btn.setAttribute('data-tab',t.id);btn.textContent=t.label;bar.appendChild(btn)}var vb=document.createElement('button');vb.id='voiceBtn';vb.className='voice-toggle'+(voiceOn?' on':'');vb.onclick=toggleVoice;vb.innerHTML='<span class="voice-icon">'+(voiceOn?'🔊':'🔇')+'</span><span class="voice-label">'+(voiceOn?'播报中':'播报')+'</span>';var voiceTabs=['em_news','realtime_news','alert'];if(voiceTabs.indexOf(currentTab)>=0)bar.appendChild(vb)}
function $(s){return document.querySelector(s)}
function esc(s){var d=document.createElement('div');d.textContent=s||'';return d.innerHTML}
function fmtPrice(v){v=Number(v)||0;return v>10000?(v/10000).toFixed(2)+'万':v.toLocaleString('zh-CN',{maximumFractionDigits:0})}
function fmtYi(v){v=Number(v)||0;var abs=Math.abs(v);var s=(abs>=100000000?(abs/100000000).toFixed(2)+'亿':abs>=10000?(abs/10000).toFixed(2)+'万':abs.toFixed(2));return v<0?'-'+s:s}
function upClass(v){return v>=0?'text-up':'text-down'}
function upSign(v){return v>=0?'+':''}
function fmtTime(t){var s=String(t);if(s.length>=6)return s.slice(0,2)+':'+s.slice(2,4);return s}
// 解码东财异动 info 字段（逗号分隔数字串，含义随类型不同）
function decodeAlertInfo(t,i){
  var raw=String(i||'');if(!raw)return '';
  var p=raw.split(',').map(function(v){return parseFloat(v)});
  if(p.some(function(v){return isNaN(v)}))return esc(raw);
  var price='',ratio='',vol='',amt='';
  if(t===4||t===8){ // 秒板/封板: 价,封单量(手),价,涨跌幅
    price=p[0];vol=p[1]>=0?(p[1]>=10000?(p[1]/10000).toFixed(2)+'万手':p[1].toFixed(0)+'手'):'';ratio=p[3];
  }else if(t===16||t===8211||t===8212){ // 打开涨停/跌停: 价,涨跌幅
    price=p[0];ratio=p[1];
  }else if(t===32||t===64||t===128||t===8193||t===8194){ // 大笔买入/卖出/火箭发射/快速反弹: 量(股),价,涨跌幅,金额
    vol=p[0]>=0?(p[0]>=10000?(p[0]/10000).toFixed(1)+'万股':p[0].toFixed(0)+'股'):'';price=p[1];ratio=p[2];amt=p[3]>=0?fmtYi(p[3]):'';
  }else{ // 加速/大幅/封涨跌停/竞价等: 涨跌幅,价,涨跌幅
    ratio=p[0];price=p[1];
  }
  var out=[];
  if(price!=='')out.push('价 '+price.toFixed(2));
  if(vol!=='')out.push('量 '+vol);
  if(ratio!==''&&!isNaN(ratio))out.push((ratio>=0?'+':'')+(ratio*100).toFixed(2)+'%');
  if(amt!=='')out.push('额 '+amt);
  return esc(out.join(' · '));
}
// 异动播报：把数字解码成自然语言
function decodeAlertSpeech(t,i){
  var raw=String(i||'');if(!raw)return '';
  var p=raw.split(',').map(function(v){return parseFloat(v)});
  if(p.some(function(v){return isNaN(v)}))return raw;
  var price='',ratio='',vol='',amt='';
  if(t===4||t===8){
    price=p[0];vol=p[1]>=0?(p[1]>=10000?(p[1]/10000).toFixed(2)+'万手':p[1].toFixed(0)+'手'):'';ratio=p[3];
  }else if(t===16||t===8211||t===8212){
    price=p[0];ratio=p[1];
  }else if(t===32||t===64||t===128||t===8193||t===8194){
    vol=p[0]>=0?(p[0]>=10000?(p[0]/10000).toFixed(1)+'万股':p[0].toFixed(0)+'股'):'';price=p[1];ratio=p[2];amt=p[3]>=0?fmtYi(p[3]):'';
  }else{
    ratio=p[0];price=p[1];
  }
  var out=[];
  if(price!=='')out.push('价格'+price.toFixed(2)+'元');
  if(vol!=='')out.push(vol);
  if(ratio!==''&&!isNaN(ratio))out.push((ratio>=0?'上涨':'下跌')+Math.abs(ratio*100).toFixed(2)+'%');
  if(amt!=='')out.push('金额'+amt);
  return out.join('，');
}
var _refreshTimer=null;
var _inDetail=false;
var _tabCache={};
try{var _savedState=vscode.getState();if(_savedState&&_savedState.tabCache){_tabCache=_savedState.tabCache;}}catch(_){}
var _agentMsgs=[];
var _agentLoading=false;
var _settingsData=null;
var _agentModels=[];
var _activeModelId='';
function agentAvatar(kind){
  if(kind==='user')return '<div style="width:28px;height:28px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#f59f00,#ff6b6b);box-shadow:0 1px 3px rgba(0,0,0,.3)"><svg width="16" height="16" viewBox="0 0 16 16" fill="#fff" opacity="0.95"><circle cx="8" cy="5.5" r="2.8"/><path d="M2.5 15c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5"/></svg></div>';
  return '<div style="width:28px;height:28px;flex-shrink:0;background:linear-gradient(135deg,#00d4ff,#7c3aed);clip-path:polygon(50% 0%,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%);display:flex;align-items:center;justify-content:center;box-shadow:0 0 6px rgba(0,212,255,.35)"><svg width="18" height="18" viewBox="0 0 18 18"><circle cx="6.5" cy="7.5" r="1.8" fill="#fff" opacity="0.95"/><circle cx="11.5" cy="7.5" r="1.8" fill="#fff" opacity="0.95"/><rect x="5" y="11.5" width="8" height="1.2" rx="0.6" fill="#fff" opacity="0.55"/><circle cx="9" cy="3.5" r="0.9" fill="#00ff88"/></svg></div>';
}
function renderAgentTab(){
  var ct=$('#content');if(!ct)return;
  ct.style.cssText='flex:1 1 0;display:flex;flex-direction:column;overflow:hidden;padding:0;min-height:0';
  var html='<div style="display:flex;flex-direction:column;flex:1 1 0;min-height:0;overflow:hidden">';
  html+='<div style="padding:8px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;flex-shrink:0">';
  html+=agentAvatar('agent');
  html+='<span style="font-weight:600;font-size:13px;flex:1">StockAgent</span>';
  html+='<select id="agentModelSel" style="background:var(--card);border:1px solid var(--border);border-radius:4px;padding:2px 6px;color:var(--fg);font-size:11px;max-width:140px;outline:none">';
  if(_agentModels.length===0){html+='<option value="">默认模型</option>'}
  for(var i=0;i<_agentModels.length;i++){
    var ml=_agentModels[i];
    html+='<option value="'+esc(ml.id)+'"'+(ml.id===_activeModelId?' selected':'')+'>'+esc(ml.name||ml.model||ml.id)+'</option>';
  }
  html+='</select>';
  html+='<button onclick="vscode.postMessage({type:\'openModelConfig\'})" style="background:none;border:none;color:var(--fg);cursor:pointer;opacity:.5;font-size:14px" title="配置模型">⚙</button>';
  html+='</div>';
  html+='<div style="display:flex;gap:4px;padding:6px 12px;flex-wrap:wrap;border-bottom:1px solid var(--border);flex-shrink:0">';
  html+='<button onclick="sendAgentQuick(\'summary\')" style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:3px 10px;font-size:11px;color:var(--fg);cursor:pointer">📊 摘要快讯</button>';
  html+='<button onclick="sendAgentQuick(\'portfolio\')" style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:3px 10px;font-size:11px;color:var(--fg);cursor:pointer">💼 自选概览</button>';
  html+='<button onclick="sendAgentQuick(\'explain\')" style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:3px 10px;font-size:11px;color:var(--fg);cursor:pointer">🔍 解读标的</button>';
  html+='<button onclick="openStockReport()" style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:3px 10px;font-size:11px;color:var(--fg);cursor:pointer">📈 选股报告</button>';
  html+='</div>';
  html+='<div id="agentMsgs" style="flex:1 1 0;min-height:0;overflow-y:auto;padding:10px 12px">';
  if(_agentMsgs.length===0){
    html+='<div style="text-align:center;padding:40px 20px;opacity:.55">';
    html+='<div style="width:56px;height:56px;margin:0 auto 14px;background:linear-gradient(135deg,#00d4ff,#7c3aed);clip-path:polygon(50% 0%,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%);display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px rgba(0,212,255,.4)"><svg width="36" height="36" viewBox="0 0 18 18"><circle cx="6.5" cy="7.5" r="1.8" fill="#fff" opacity="0.95"/><circle cx="11.5" cy="7.5" r="1.8" fill="#fff" opacity="0.95"/><rect x="5" y="11.5" width="8" height="1.2" rx="0.6" fill="#fff" opacity="0.55"/><circle cx="9" cy="3.5" r="0.9" fill="#00ff88"/></svg></div>';
    html+='<div style="font-size:13px;margin-bottom:6px;color:var(--fg)">你好，我是 StockAgent</div>';
    html+='<div style="font-size:11px;line-height:1.6;opacity:.7">可以帮你分析行情、解读资讯、<br>整理自选信息（不提供投资建议）</div></div>';
  }
  if(noAgentModel()&&_agentMsgs.length===0){
    html+='<div style="margin:0 12px 8px;padding:10px 12px;background:rgba(232,179,57,.1);border:1px solid rgba(232,179,57,.3);border-radius:8px;font-size:11px;line-height:1.5">';
    html+='<div style="color:var(--accent);margin-bottom:6px">⚠️ 尚未接入 AI 模型</div>';
    html+='<div style="opacity:.7;margin-bottom:6px">请先在设置中配置模型，或确认 VS Code 已安装 Copilot 等 AI 扩展</div>';
    html+='<button onclick="vscode.postMessage({type:\'openModelConfig\'})" style="background:var(--accent);color:#fff;border:none;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:11px">前往配置 →</button>';
    html+='</div>';
  }
  for(var i=0;i<_agentMsgs.length;i++){
    var m=_agentMsgs[i];
    var isUser=m.role==='user';
    html+='<div style="display:flex;gap:8px;margin-bottom:12px;'+(isUser?'justify-content:flex-end':'')+'">';
    if(!isUser)html+=agentAvatar('agent');
    html+='<div style="max-width:75%;padding:8px 12px;border-radius:'+(!isUser?'2px 10px 10px 10px':'10px 2px 10px 10px')+';font-size:12px;line-height:1.7;white-space:pre-wrap;word-break:break-word;';
    html+=!isUser?'background:#1a1d24;color:#d4d4d4':'background:var(--accent);color:#fff">';
    html+=esc(m.text)+'</div>';
    if(isUser)html+=agentAvatar('user');
    html+='</div>';
  }
  if(_agentLoading){
    html+='<div style="display:flex;gap:8px;margin-bottom:12px">';
    html+=agentAvatar('agent');
    html+='<div style="padding:10px 14px;border-radius:2px 10px 10px 10px;background:#1a1d24;font-size:12px">';
    html+='<span style="animation:pulse 1.2s infinite">思考中</span></div></div>';
  }
  html+='</div>';
  html+='<div style="display:flex;gap:6px;padding:8px 12px;border-top:1px solid var(--border);flex-shrink:0">';
  html+='<input id="agentInput" style="flex:1;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 12px;color:var(--fg);font-size:12px;outline:none" placeholder="'+(noAgentModel()?'⚠️ 请先配置 AI 模型...':'输入消息...')+'" onkeydown="if(event.key===\'Enter\')sendAgentMsg()">';
  html+='<button id="agentSendBtn" onclick="sendAgentMsg()" style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:12px;white-space:nowrap">发送</button>';
  html+='</div></div>';
  ct.innerHTML=html;
  var sel=$('#agentModelSel');
  if(sel)sel.addEventListener('change',function(){_activeModelId=this.value;vscode.postMessage({type:'setActiveModel',id:this.value})});
  var msgsCt=$('#agentMsgs');
  if(msgsCt)msgsCt.scrollTop=msgsCt.scrollHeight;
}
function noAgentModel(){return !_agentModels.length&&!_activeModelId}
var _noModelWarned=false;
function promptNoModel(){
  _agentMsgs.push({role:'assistant',text:'⚠️ 尚未接入 AI 模型，请点击右上角 ⚙ 或前往设置页配置模型。配置后即可使用 AI 对话功能。'});
  _noModelWarned=true;
  renderAgentTab();
}
function sendAgentMsg(){
  var inp=$('#agentInput');if(!inp||!inp.value.trim()||_agentLoading)return;
  var text=inp.value.trim();inp.value='';
  if(noAgentModel()&&!_noModelWarned){promptNoModel();_agentMsgs.push({role:'user',text:text});renderAgentTab();return}
  if(noAgentModel()){_agentMsgs.push({role:'user',text:text});renderAgentTab();return}
  _agentMsgs.push({role:'user',text:text});
  _agentLoading=true;renderAgentTab();
  vscode.postMessage({type:'agentChat',text:text,modelId:_activeModelId});
}
function sendAgentQuick(action){
  if(_agentLoading)return;
  if(noAgentModel()&&!_noModelWarned){promptNoModel();_agentMsgs.push({role:'user',text:'/'+action});renderAgentTab();return}
  if(noAgentModel()){_agentMsgs.push({role:'user',text:'/'+action});renderAgentTab();return}
  _agentMsgs.push({role:'user',text:'/'+action});
  _agentLoading=true;renderAgentTab();
  vscode.postMessage({type:'agentChat',text:'/'+action,modelId:_activeModelId});
}
function openStockReport(){
  vscode.postMessage({type:'openReport'});
}
function detailAskAI(action){
  var code=_detailCode||'';var name=_detailName||'';
  var text='';
  if(action==='analyze')text='请分析股票 '+name+'('+code+')的基本面情况，包括财务数据、行业地位、估值水平等';
  else if(action==='trend')text='请解读股票 '+name+'('+code+')的技术走势，包括K线形态、支撑压力位、成交量变化等';
  else if(action==='news')text='请总结股票 '+name+'('+code+')最近的新闻资讯和市场动态';
  if(!text)return;
  _agentMsgs.push({role:'user',text:text});
  _agentLoading=true;
  switchTab('agent');
  vscode.postMessage({type:'agentChat',text:text,modelId:_activeModelId});
}
function detailSendAI(){
  var inp=$('#detailAIInput');if(!inp||!inp.value.trim()||_agentLoading)return;
  var text=inp.value.trim();
  var name=_detailName||'';
  var code=_detailCode||'';
  var fullText='关于股票 '+name+'('+code+')：'+text;
  inp.value='';
  _agentMsgs.push({role:'user',text:fullText});
  _agentLoading=true;
  switchTab('agent');
  vscode.postMessage({type:'agentChat',text:fullText,modelId:_activeModelId});
}
var _detailSearchResults=[];var _detailSearchIdx=-1;
var _detailSearchDeb=null;
function detailSearch(kw){
  if(_detailSearchDeb)clearTimeout(_detailSearchDeb);
  var rs=$('#detailSearchResults');
  if(!kw||!kw.trim()){if(rs)rs.classList.remove('show');_detailSearchResults=[];return}
  _detailSearchDeb=setTimeout(function(){
    vscode.postMessage({type:'stockSearch',kw:kw.trim()});
  },300);
}
function showDetailSearchResults(list){
  _detailSearchResults=list;_detailSearchIdx=-1;
  var rs=$('#detailSearchResults');if(!rs)return;
  if(!list||!list.length){rs.classList.remove('show');return}
  var html='';
  for(var i=0;i<Math.min(10,list.length);i++){
    var item=list[i];
    var code=esc(item.f12||item.code||'');
    var name=esc(item.f14||item.name||'');
    html+='<div class="detail-search-item" data-idx="'+i+'" onclick="detailSearchSelect('+i+')"><span class="ds-name">'+name+'</span><span class="ds-code">'+code+'</span></div>';
  }
  rs.innerHTML=html;rs.classList.add('show');
}
function detailSearchSelect(idx){
  var item=_detailSearchResults[idx];if(!item)return;
  var code=item.f12||item.code||'';
  var name=item.f14||item.name||'';
  var rs=$('#detailSearchResults');if(rs)rs.classList.remove('show');
  var inp=$('#detailSearchInput');if(inp)inp.value='';
  openStockDetail(code,name);
}
function detailSearchConfirm(){
  if(_detailSearchIdx>=0&&_detailSearchResults[_detailSearchIdx]){detailSearchSelect(_detailSearchIdx);return}
  if(_detailSearchResults.length>0)detailSearchSelect(0);
}
function renderSettings(data){
  var ct=$('#content');if(!ct)return;
  if(!data){ct.innerHTML='<div style="text-align:center;padding:40px;opacity:.5">加载中...</div>';return}
  var cfg=data.config||{};
  var aiModels=data.aiModels||[];
  var activeModelId=data.activeModelId||'';
  var html='<div class="settings-wrap">';
  html+='<div class="settings-section">';
  html+='<div class="settings-section-title">⚙ 常规设置</div>';
  var S=[
    {key:'interval',label:'轮询间隔(ms)',type:'number',def:5000,min:3000},
    {key:'pollOnlyDuringAStockHours',label:'仅A股交易时段轮询',type:'checkbox',def:true},
    {key:'riseColor',label:'涨的颜色',type:'color',def:'#ff4d4f'},
    {key:'fallColor',label:'跌的颜色',type:'color',def:'#23c343'},
    {key:'hideStatusBar',label:'隐藏状态栏',type:'checkbox',def:false},
    {key:'hideStatusBarIcon',label:'隐藏状态栏图标',type:'checkbox',def:false},
    {key:'opacity',label:'面板透明度',type:'range',def:1,min:0.1,max:1,step:0.1},
    {key:'voiceBroadcast',label:'自动语音播报',type:'checkbox',def:false},
  ];
  for(var i=0;i<S.length;i++){
    var s=S[i];var val=cfg[s.key]!==undefined?cfg[s.key]:s.def;
    html+='<div class="settings-row">';
    html+='<span class="settings-label">'+s.label+'</span>';
    if(s.type==='checkbox'){
      html+='<button class="settings-toggle'+(val?' on':'')+'" data-key="'+s.key+'" onclick="settingsToggle(this,\''+s.key+'\')"></button>';
    }else if(s.type==='color'){
      html+='<input type="color" class="settings-color" value="'+val+'" data-key="'+s.key+'" onchange="settingsChange(this.dataset.key,this.value)">';
    }else if(s.type==='range'){
      html+='<div class="settings-range-wrap"><input type="range" class="settings-range" min="'+s.min+'" max="'+s.max+'" step="'+s.step+'" value="'+val+'" data-key="'+s.key+'" oninput="this.nextElementSibling.textContent=this.value;settingsChange(this.dataset.key,Number(this.value))"><span class="settings-range-val">'+val+'</span></div>';
    }else{
      html+='<input type="number" class="settings-input" value="'+val+'" data-key="'+s.key+'"'+(s.min?' min="'+s.min+'"':'')+' onchange="settingsChange(this.dataset.key,Number(this.value))" style="width:90px;text-align:right">';
    }
    html+='</div>';
  }
  html+='</div>';
  html+='<div class="settings-section">';
  html+='<div class="settings-section-title">🎨 界面主题</div>';
  html+='<div class="settings-row">';
  html+='<span class="settings-label">主题风格</span>';
  var themeVal=cfg.theme||'classic';
  html+='<select class="settings-select" id="settingsTheme" onchange="settingsChangeTheme(this.value)">';
  html+='<option value="classic"'+(themeVal==='classic'?' selected':'')+'>经典主题</option>';
  html+='<option value="dark"'+(themeVal==='dark'?' selected':'')+'>黑色主题</option>';
  html+='<option value="light"'+(themeVal==='light'?' selected':'')+'>白色主题</option>';
  html+='<option value="system"'+(themeVal==='system'?' selected':'')+'>跟随系统</option>';
  html+='</select></div>';
  html+='</div>';
  html+='<div class="settings-section">';
  html+='<div class="settings-section-title">🔊 语音播报</div>';
  html+='<div class="settings-row">';
  html+='<span class="settings-label">语音模型</span>';
  html+='<div style="display:flex;gap:6px;align-items:center">';
  html+='<select class="settings-select" id="settingsVoicePreset" onchange="settingsChangeVoicePreset(this.value)" style="max-width:130px">';
  for(var pi=0;pi<VOICE_PRESETS.length;pi++){
    var ps=VOICE_PRESETS[pi];
    html+='<option value="'+esc(ps.id)+'"'+(ps.id===_selectedVoicePreset?' selected':'')+'>'+esc(ps.name)+'</option>';
  }
  html+='</select>';
  html+='<button class="settings-btn" onclick="settingsPreviewVoice()">试听</button>';
  html+='</div></div>';
  html+='<div class="settings-row">';
  html+='<span class="settings-label">系统语音引擎</span>';
  html+='<select class="settings-select" id="settingsVoiceModel" onchange="settingsChangeVoice(this.value)" style="max-width:200px">';
  html+='<option value="">跟随系统</option>';
  for(var vi=0;vi<_availableVoices.length;vi++){
    var v=_availableVoices[vi];
    var vlabel=v.name+(v.lang?' ('+v.lang+')':'');
    html+='<option value="'+esc(v.voiceURI)+'"'+(v.voiceURI===_selectedVoiceURI?' selected':'')+'>'+esc(vlabel)+'</option>';
  }
  html+='</select></div>';
  if(_availableVoices.length===0){
    html+='<div class="settings-hint" style="padding-top:4px">系统语音引擎列表为空时将使用浏览器默认引擎，语音模型仍可通过语速音调调节</div>';
  }
  html+='</div>';
  html+='<div class="settings-section">';
  html+='<div class="settings-section-title">🤖 AI 模型</div>';
  html+='<div class="settings-row">';
  html+='<span class="settings-label">当前模型</span>';
  html+='<select class="settings-select" id="settingsActiveModel" onchange="settingsChangeActiveModel(this.value)">';
  html+='<option value="">默认</option>';
  for(var i=0;i<aiModels.length;i++){
    var ml=aiModels[i];
    html+='<option value="'+esc(ml.id)+'"'+(ml.id===activeModelId?' selected':'')+'>'+esc(ml.name||ml.model||ml.id)+'</option>';
  }
  html+='</select></div>';
  html+='<div id="settingsModelList">';
  for(var i=0;i<aiModels.length;i++){
    var ml=aiModels[i];
    html+='<div class="settings-model-row">';
    html+='<span class="settings-model-name">'+esc(ml.name||ml.model||'')+' <span style="opacity:.4">'+esc(ml.provider||'')+'</span></span>';
    html+='<button class="settings-model-del" onclick="settingsDelModel(\''+esc(ml.id)+'\')">删除</button></div>';
  }
  html+='</div>';
  html+='<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">';
  html+='<button class="settings-add-btn" onclick="settingsAddModel()">+ 添加模型</button>';
  html+='</div></div>';
  html+='<div id="settingsModelForm" class="settings-form" style="display:none"></div>';
  html+='</div>';
  ct.innerHTML=html;
}
var _settingsDeb={};
var _settingsDirty=false;
function settingsToggle(btn,key){
  var on=btn.classList.toggle('on');
  settingsChange(key,on);
}
function settingsChange(key,val){
  if(_settingsData&&_settingsData.config){_settingsData.config[key]=val;}
  _settingsDirty=true;
  if(key==='opacity')document.documentElement.style.setProperty('--panel-opacity',val);
  if(key==='riseColor')document.documentElement.style.setProperty('--up',val);
  if(key==='fallColor')document.documentElement.style.setProperty('--down',val);
  var delay=(key==='opacity'||key==='interval')?300:0;
  if(_settingsDeb[key])clearTimeout(_settingsDeb[key]);
  _settingsDeb[key]=setTimeout(function(){
    vscode.postMessage({type:'setConfig',key:key,val:val});
    setTimeout(function(){_settingsDirty=false;},500);
  },delay);
}
function settingsChangeTheme(theme){
  applyTheme(theme);
  vscode.postMessage({type:'setConfig',key:'theme',val:theme});
}
function settingsChangeVoice(uri){
  _selectedVoiceURI=uri;
  try{var st=vscode.getState()||{};st.voiceURI=uri;vscode.setState(st);}catch(_){}
}
function settingsChangeVoicePreset(id){
  _selectedVoicePreset=id;
  var preset=getVoicePreset(id);
  var matched=matchVoiceForGender(preset.gender);
  if(matched){_selectedVoiceURI=matched;}else{_selectedVoiceURI='';}
  try{var st=vscode.getState()||{};st.voicePreset=id;st.voiceURI=_selectedVoiceURI;vscode.setState(st);}catch(_){}
  var voiceSel=document.getElementById('settingsVoiceModel');
  if(voiceSel)voiceSel.value=_selectedVoiceURI;
}
function settingsPreviewVoice(){
  var presetSel=document.getElementById('settingsVoicePreset');
  var pid=presetSel?presetSel.value:'default';
  var preset=getVoicePreset(pid);
  var voiceSel=document.getElementById('settingsVoiceModel');
  var manualURI=voiceSel?voiceSel.value:'';
  var uri=manualURI||matchVoiceForGender(preset.gender);
  var u=new SpeechSynthesisUtterance('你好，这是'+preset.name+'试听。当前股票行情播报功能已就绪。');
  u.lang='zh-CN';u.rate=preset.rate;u.pitch=preset.pitch;
  if(uri){
    for(var i=0;i<_availableVoices.length;i++){
      if(_availableVoices[i].voiceURI===uri){u.voice=_availableVoices[i];break;}
    }
  }
  if('speechSynthesis' in window){window.speechSynthesis.cancel();window.speechSynthesis.speak(u);}
}
function settingsChangeActiveModel(id){
  vscode.postMessage({type:'setActiveModel',id:id});
}
function settingsAddModel(){
  var f=$('#settingsModelForm');if(!f)return;
  f.style.display='block';
  f.innerHTML='<div style="font-size:12px;font-weight:600;margin-bottom:8px;color:#fff">添加模型</div>'
    +'<div class="settings-form-row"><input id="mf_name" placeholder="名称 (如 GPT-4)"></div>'
    +'<div class="settings-form-row"><input id="mf_provider" placeholder="提供商 (如 openai)"></div>'
    +'<div class="settings-form-row"><input id="mf_baseURL" placeholder="Base URL (如 https://api.openai.com/v1)"></div>'
    +'<div class="settings-form-row"><input id="mf_apiKey" placeholder="API Key" type="password"></div>'
    +'<div class="settings-form-row"><input id="mf_model" placeholder="模型ID (如 gpt-4o)"></div>'
    +'<div class="settings-form-row"><input id="mf_temperature" placeholder="Temperature (0-1, 默认0.7)" type="number" min="0" max="1" step="0.1" value="0.7"></div>'
    +'<div class="settings-form-btns">'
    +'<button class="settings-btn" onclick="settingsSaveModel()" style="flex:1">保存</button>'
    +'<button class="settings-btn-outline" onclick="document.getElementById(\'settingsModelForm\').style.display=\'none\'" style="flex:1">取消</button>'
    +'</div>';
}
function settingsSaveModel(){
  var n=$('#mf_name'),p=$('#mf_provider'),u=$('#mf_baseURL'),k=$('#mf_apiKey'),m=$('#mf_model'),t=$('#mf_temperature');
  if(!n||!n.value.trim())return;
  var model={id:'m_'+Date.now(),name:n.value.trim(),provider:p?p.value.trim():'',baseURL:u?u.value.trim():'',apiKey:k?k.value.trim():'',model:m?m.value.trim():'',temperature:t?Number(t.value):0.7,enabled:true};
  vscode.postMessage({type:'addModel',model:model});
  $('#settingsModelForm').style.display='none';
}
function settingsDelModel(id){
  vscode.postMessage({type:'delModel',id:id});
}
function resetContentStyle(){
  var ct=$('#content');
  if(ct&&ct.style.cssText)ct.style.cssText='';
}
function renderTabData(tab,data){
  if(tab!=='agent')resetContentStyle();
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
  else if(tab==='settings'){
    _settingsData=data;
    if(data){_agentModels=data.aiModels||[];_activeModelId=data.activeModelId||''}
    renderSettings(data);
  }
  else if(tab==='agent'){renderAgentTab()}
  else $('#content').innerHTML='<div class="loading">开发中...</div>'
}
function switchTab(tab){
  currentTab=tab;_lastNewsIds=[];_lastAlertIds=[];renderTabs();
  _inDetail=false;
  if(tab==='agent'){
    renderAgentTab();return;
  }
  resetContentStyle();
  if(tab==='settings'){
    $('#content').innerHTML='<div style="text-align:center;padding:40px;opacity:.5">加载中...</div>';
    vscode.postMessage({type:'switchTab',tab:'settings'});
    return;
  }
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
  }else if(tab==='alert'){
    _refreshTimer=setInterval(function(){if(!_inDetail)vscode.postMessage({type:'switchTab',tab:'alert'})},5000);
  }
}
$('#tabBar').addEventListener('click',function(e){var btn=e.target.closest('.tab-btn');if(btn)switchTab(btn.getAttribute('data-tab'))});
document.addEventListener('click',function(e){
  var item=e.target.closest('.news-item');
  if(item&&item.getAttribute('data-url')){
    vscode.postMessage({type:'openUrl',url:item.getAttribute('data-url')});
    return;
  }
  if(e.target.closest('.wl-del')||e.target.closest('.detail-actions')||e.target.closest('.detail-tab')||e.target.closest('.detail-sub-close'))return;
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
  var list=d&&d.data?d.data.list:(d&&d.list?d.list:[]);
  _lastAlertData=list||[];
  if(!list||!list.length){
    $('#content').innerHTML='<div class="loading">暂无异动 <button id="alertRefreshBtn" style="margin-left:8px;padding:2px 10px;border:1px solid var(--border);border-radius:4px;background:transparent;color:var(--fg);font-size:11px;cursor:pointer">↻ 刷新</button></div>';
    var rb=document.getElementById('alertRefreshBtn');
    if(rb)rb.addEventListener('click',function(){vscode.postMessage({type:'switchTab',tab:'alert'})});
    return;
  }
  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span class="section-title" style="margin:0">异动</span><button id="alertRefreshBtn" style="padding:3px 12px;border:1px solid var(--border);border-radius:4px;background:transparent;color:var(--fg);font-size:11px;cursor:pointer">↻ 刷新</button></div>';
  html+='<table><tr><th>时间</th><th>名称/代码</th><th>异动</th><th>信息</th></tr>';
  var newIds=[];
  for(var i=0;i<Math.min(60,list.length);i++){var x=list[i];var label=CHG_TYPES[x.t]||('类型'+x.t);var isUp=(x.t==4||x.t==8||x.t==32||x.t==128||x.t==8193||x.t==8194||x.t==8201||x.t==8207||x.t==8209||x.t==8211||x.t==8213||x.t==8215);var aid=x.tm+'_'+x.c+'_'+x.t;newIds.push(aid);html+='<tr class="stock-row" data-code="'+esc(x.c||'')+'" data-name="'+esc(x.n||'')+'"><td class="text-muted">'+fmtTime(x.tm)+'</td><td>'+esc(x.n||'')+'<div class="text-muted" style="font-size:10px">'+esc(x.c||'')+'</div></td><td><span class="tag '+(isUp?'tag-up':'tag-down')+'">'+esc(label)+'</span></td><td class="text-muted">'+decodeAlertInfo(x.t,x.i)+'</td></tr>'}
  html+='</table>';
  if(voiceOn&&currentTab==='alert'&&_lastAlertIds.length>0){
    var firstNew=newIds.indexOf(_lastAlertIds[0]);
    if(firstNew>0){for(var j=firstNew-1;j>=0;j--){var idx=newIds.indexOf(newIds[j]);if(idx>=0&&list[idx]){var x=list[idx];var lbl=CHG_TYPES[x.t]||'异动';speakText((x.n||'')+'，'+lbl+'，'+decodeAlertSpeech(x.t,x.i))}}}
  }
  _lastAlertIds=newIds;
  $('#content').innerHTML=html;
  var rb2=document.getElementById('alertRefreshBtn');
  if(rb2)rb2.addEventListener('click',function(){vscode.postMessage({type:'switchTab',tab:'alert'})});
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
var _statusBarCodes=[];
var _wlDragIdx=null;
function prefixCode(code){
  var c=String(code||'').replace(/^(sh|sz|bj)/,'');
  if(/^(60|68|90|11|13|50|56|51|58)/.test(c))return 'sh'+c;
  if(/^(00|30|20|12|15|16|18|159)/.test(c))return 'sz'+c;
  if(/^(43|83|87|92|88)/.test(c))return 'bj'+c;
  return 'sh'+c;
}
function renderWatchlist(d){
  var list=d&&d.indices?d.indices:(d&&d.data?d.data.diff:[]);
  _wlAlerts=d&&d.alerts?d.alerts:{};
  _statusBarCodes=(d&&d.statusBarCodes)||[];
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
      var inSb=_statusBarCodes.indexOf(prefixCode(x.f12))>=0;
      var sbTag=inSb?'<span class="wl-alert-tag" style="background:rgba(53,150,240,.18);color:#5cabff">📌 状态栏</span>':'';
      html+='<div class="wl-card '+flash+'" draggable="true" data-code="'+code+'" data-idx="'+i+'"><div class="wl-row"><div class="wl-name"><div class="nm">'+name+(alertHtml?'<span>'+alertHtml+'</span>':'')+'</div><div class="cd">'+code+' · 右键更多操作</div></div><div class="wl-price"><div class="pr '+(up?'text-up':'text-down')+'">'+price+'</div></div><div class="wl-chg"><span class="tag '+(up?'tag-up':'tag-down')+'">'+(up?'+':'')+rate.toFixed(2)+'%</span></div><div class="wl-acts"><button class="wl-code-act wl-sb-toggle" data-code="'+code+'" title="'+(inSb?'移出状态栏':'加入状态栏')+'">'+sbTag+'</button><button class="wl-code-act" data-code="'+code+'" data-dir="top" title="置顶">⤒ 置顶</button><button class="wl-code-act" data-code="'+code+'" data-dir="bottom" title="置底">⤓ 置底</button></div><button class="wl-del" data-code="'+code+'">删除</button></div></div>';
    }
  }
  $('#content').innerHTML=html;
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
      if(this.classList.contains('wl-sb-toggle')){
        vscode.postMessage({type:'toggleStatusBarStock',code:prefixCode(this.getAttribute('data-code'))});
        return;
      }
      vscode.postMessage({type:'moveWatch',code:this.getAttribute('data-code'),dir:this.getAttribute('data-dir')});
    });
  }
  var sbCards=document.querySelectorAll('.wl-card');
  for(var si=0;si<sbCards.length;si++){
    sbCards[si].addEventListener('contextmenu',function(e){
      e.preventDefault();e.stopPropagation();
      showWatchMenu(e,this.getAttribute('data-code'));
    });
  }
  setupWatchlistDrag();
}
function hideWatchMenu(){
  var m=document.getElementById('wlCtxMenu');
  if(m)m.remove();
}
function showWatchMenu(e,rawCode){
  hideWatchMenu();
  var code=prefixCode(rawCode);
  var inSb=_statusBarCodes.indexOf(code)>=0;
  var m=document.createElement('div');
  m.id='wlCtxMenu';
  m.style.position='fixed';
  m.style.zIndex='9999';
  m.style.minWidth='140px';
  m.style.background='#1b1f26';
  m.style.border='1px solid #2a2e36';
  m.style.borderRadius='6px';
  m.style.padding='4px';
  m.style.boxShadow='0 4px 16px rgba(0,0,0,.5)';
  m.style.fontSize='12px';
  var items=[
    {label:inSb?'移除状态栏显示':'加入状态栏显示',type:'toggleStatusBarStock'},
    {sep:true},
    {label:'置顶',type:'moveWatch',dir:'top'},
    {label:'置底',type:'moveWatch',dir:'bottom'},
    {label:'打开详情',type:'openDetail'},
    {sep:true},
    {label:'删除自选',type:'delWatch',danger:true}
  ];
  for(var i=0;i<items.length;i++){
    var it=items[i];
    if(it.sep){var s=document.createElement('div');s.style.borderTop='1px solid #2a2e36';s.style.margin='4px 2px';m.appendChild(s);continue;}
    var b=document.createElement('div');
    b.style.padding='6px 10px';
    b.style.borderRadius='4px';
    b.style.cursor='pointer';
    b.style.whiteSpace='nowrap';
    if(it.danger){b.style.color='#ff6b6b';}else{b.style.color='#ddd';}
    b.textContent=it.label;
    b.onmouseover=function(){this.style.background='#2a2f3a'};
    b.onmouseout=function(){this.style.background='transparent'};
    b.onclick=(function(itm,raw,pre){return function(){
      hideWatchMenu();
      if(itm.type==='openDetail'){
        for(var i=0;i<_wlData.length;i++){
          if(prefixCode(_wlData[i].code)===pre){
            renderStockDetail(_wlData[i]);
            return;
          }
        }
        return;
      }
      var msg={type:itm.type,code:itm.type==='toggleStatusBarStock'?pre:raw};
      if(itm.dir)msg.dir=itm.dir;
      vscode.postMessage(msg);
    };})(it,rawCode,code);
    m.appendChild(b);
  }
  document.body.appendChild(m);
  var x=e.clientX||0,y=e.clientY||0;
  var r=m.getBoundingClientRect();
  if(x+r.width>window.innerWidth)x=Math.max(0,window.innerWidth-r.width-8);
  if(y+r.height>window.innerHeight)y=Math.max(0,window.innerHeight-r.height-8);
  m.style.left=x+'px';m.style.top=y+'px';
  setTimeout(function(){
    document.addEventListener('click',hideWatchMenu,{once:true});
    document.addEventListener('contextmenu',hideWatchMenu,{once:true});
  },0);
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
  html+='<div class="detail-actions"><button class="btn-del" id="detailWatchBtn" data-in="0">加载中...</button><button class="btn-back" id="detailBackBtn">返回列表</button></div>';
  html+='<div class="detail-tabs" id="detailTabs">';
  html+='<button class="detail-tab active" data-dtab="news">资讯</button>';
  html+='<button class="detail-tab" data-dtab="notice">公告</button>';
  html+='<button class="detail-tab" data-dtab="finance">财务</button>';
  html+='<button class="detail-tab" data-dtab="profile">资料</button>';
  html+='</div>';
  html+='<div class="detail-panel" id="detailPanel"><div class="loading" style="padding:10px">加载中...</div></div>';
  html+='<div class="detail-ai">';
  html+='<div class="detail-ai-title">🤖 AI 快捷提问</div>';
  html+='<div class="detail-ai-quick">';
  html+='<button onclick="detailAskAI(\'analyze\')">📊 分析基本面</button>';
  html+='<button onclick="detailAskAI(\'trend\')">📈 解读走势</button>';
  html+='<button onclick="detailAskAI(\'news\')">📰 最新资讯</button>';
  html+='</div>';
  html+='<div class="detail-ai-input">';
  html+='<input id="detailAIInput" placeholder="问问AI关于'+name+'..." onkeydown="if(event.key===\'Enter\')detailSendAI()">';
  html+='<button onclick="detailSendAI()">发送</button>';
  html+='</div>';
  html+='</div>';
  html+='<div class="detail-search" id="detailSearchBox">';
  html+='<div class="detail-search-results" id="detailSearchResults"></div>';
  html+='<div class="detail-search-input">';
  html+='<input id="detailSearchInput" placeholder="搜索股票名称/代码..." oninput="detailSearch(this.value)" onkeydown="if(event.key===\'Enter\')detailSearchConfirm()">';
  html+='<button onclick="detailSearchConfirm()">→</button>';
  html+='</div>';
  html+='</div>';
  $('#content').innerHTML=html;
  _inDetail=true;
  _idView={s:0,e:240};
  var goBack=function(){_inDetail=false;if(_intradayTimer){clearInterval(_intradayTimer);_intradayTimer=null}if(_quoteTimer){clearInterval(_quoteTimer);_quoteTimer=null}vscode.postMessage({type:'switchTab',tab:currentTab==='detail'?'watchlist':currentTab})};
  var backBtn=document.getElementById('detailBack');
  if(backBtn)backBtn.addEventListener('click',goBack);
  var backBtn2=document.getElementById('detailBackBtn');
  if(backBtn2)backBtn2.addEventListener('click',goBack);
  var watchBtn=document.getElementById('detailWatchBtn');
  if(watchBtn)watchBtn.addEventListener('click',function(){
    var inW=this.getAttribute('data-in')==='1';
    if(inW){
      vscode.postMessage({type:'delWatch',code:prefixCode(s.code)});
      this.textContent='添加自选';
      this.setAttribute('data-in','0');
    }else{
      vscode.postMessage({type:'addWatch',code:prefixCode(s.code)});
      this.textContent='删除自选';
      this.setAttribute('data-in','1');
    }
  });
  vscode.postMessage({type:'isInWatch',code:prefixCode(s.code)});
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
    try{vscode.setState({tabCache:_tabCache});}catch(_){}
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
  }else if(msg.type==='agentResponse'){
    _agentLoading=false;
    _agentMsgs.push({role:'assistant',text:msg.text||'暂无回复'});
    if(currentTab==='agent')renderAgentTab();
  }else if(msg.type==='settingsData'){
    _settingsData=msg.data;
    if(msg.data){_agentModels=msg.data.aiModels||[];_activeModelId=msg.data.activeModelId||'';applySettingsColors(msg.data.config);if(!noAgentModel())_noModelWarned=false;}
    if(currentTab==='settings'&&!_settingsDirty)renderSettings(msg.data);
    if(currentTab==='agent')renderAgentTab();
  }else if(msg.type==='modelsUpdated'){
    _agentModels=msg.aiModels||[];
    _activeModelId=msg.activeModelId||'';
    if(!noAgentModel())_noModelWarned=false;
    if(currentTab==='settings'&&_settingsData){
      _settingsData.aiModels=_agentModels;
      _settingsData.activeModelId=_activeModelId;
      renderSettings(_settingsData);
    }
    if(currentTab==='agent')renderAgentTab();
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
  }else if(msg.type==='inWatchResult'&&msg.code){
    var wbtn=document.getElementById('detailWatchBtn');
    if(wbtn){
      if(msg.inWatch){
        wbtn.setAttribute('data-in','1');wbtn.textContent='删除自选';
      }else{
        wbtn.setAttribute('data-in','0');wbtn.textContent='添加自选';
      }
    }
  }else if(msg.type==='stockSearchResult'){
    showDetailSearchResults(msg.list||[]);
  }else if(msg.type==='setOpacity'){
    document.documentElement.style.setProperty('--panel-opacity',msg.opacity);
  }else if(msg.type==='setTheme'){
    applyTheme(msg.theme||'classic');
  }else if(msg.type==='setColors'){
    applySettingsColors(msg);
  }else if(msg.type==='setVoice'){
    voiceOn=!!msg.on;renderTabs();
  }else if(msg.type==='switchToTab'){
    switchTab(msg.tab);
  }else if(msg.type==='openDetail'&&msg.code){
    if(currentTab!=='watchlist'){
      currentTab='watchlist';renderTabs();
      if(_refreshTimer){clearInterval(_refreshTimer);_refreshTimer=null}
      _refreshTimer=setInterval(function(){if(!_inDetail)vscode.postMessage({type:'switchTab',tab:'watchlist'})},5000);
    }
    resetContentStyle();
    openStockDetail(msg.code,msg.name||'');
  }
});
