export function getStockCenterHtml(cspSource: string, scriptUri: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https:; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'unsafe-inline';">
<title>StockCenter</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0c10;--fg:#b8bfc6;--up:#ff4d4f;--down:#23c343;--card:#12151a;--border:#1f2124;--accent:#e8b339;--panel-opacity:1}
html,body{background:var(--bg);color:var(--fg);font:13px/1.5 -apple-system,sans-serif;height:100vh;overflow:hidden;opacity:var(--panel-opacity,1)}
body{display:flex;flex-direction:column}
.tab-bar{display:flex;gap:2px;padding:6px 8px;border-bottom:1px solid var(--border);flex-shrink:0;overflow-x:auto}
.tab-btn{padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px;border:none;background:transparent;color:var(--fg);opacity:.6;white-space:nowrap;flex-shrink:0}
.tab-btn.active{background:var(--up);color:#fff;opacity:1}
.content{flex:1;min-height:0;overflow-y:auto;padding:10px}
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
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
.detail-ai{margin-top:10px;background:var(--card);border-radius:8px;padding:10px}
.detail-ai-title{font-size:11px;opacity:.6;margin-bottom:6px;display:flex;align-items:center;gap:4px}
.detail-ai-quick{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px}
.detail-ai-quick button{background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:3px 10px;font-size:10px;color:var(--fg);cursor:pointer;white-space:nowrap}
.detail-ai-quick button:hover{border-color:var(--accent);color:var(--accent)}
.detail-ai-input{display:flex;gap:6px}
.detail-ai-input input{flex:1;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:6px 10px;color:var(--fg);font-size:12px;outline:none}
.detail-ai-input input:focus{border-color:var(--accent)}
.detail-ai-input button{background:var(--accent);color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;font-size:12px;white-space:nowrap}
.settings-wrap{padding:12px 14px;max-width:none;width:100%}
.settings-section{background:var(--card);border-radius:10px;padding:14px 16px;margin-bottom:14px;border:1px solid var(--border)}
.settings-section-title{font-size:13px;font-weight:600;color:#fff;margin-bottom:10px;display:flex;align-items:center;gap:6px;padding-bottom:8px;border-bottom:1px solid var(--border)}
.settings-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0}
.settings-row+.settings-row{border-top:1px solid var(--border)}
.settings-label{font-size:12px;color:var(--fg);opacity:.9}
.settings-hint{font-size:10px;opacity:.4;margin-top:2px}
.settings-input{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:5px 10px;color:var(--fg);font-size:12px;outline:none;transition:border-color .2s}
.settings-input:focus{border-color:var(--accent)}
.settings-select{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:5px 10px;color:var(--fg);font-size:12px;outline:none;cursor:pointer;transition:border-color .2s;max-width:200px}
.settings-select:focus,.settings-select:hover{border-color:var(--accent)}
.settings-btn{background:var(--accent);color:#fff;border:none;border-radius:6px;padding:5px 14px;cursor:pointer;font-size:12px;white-space:nowrap;transition:opacity .2s}
.settings-btn:hover{opacity:.85}
.settings-btn-outline{background:transparent;border:1px solid var(--border);border-radius:6px;padding:5px 14px;color:var(--fg);cursor:pointer;font-size:12px;transition:border-color .2s}
.settings-btn-outline:hover{border-color:var(--accent);color:var(--accent)}
.settings-toggle{position:relative;width:36px;height:20px;background:var(--border);border-radius:10px;cursor:pointer;transition:background .2s;border:none}
.settings-toggle.on{background:var(--accent)}
.settings-toggle::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .2s}
.settings-toggle.on::after{transform:translateX(16px)}
.settings-color{width:36px;height:24px;border:1px solid var(--border);border-radius:6px;cursor:pointer;background:none;padding:0}
.settings-range-wrap{display:flex;align-items:center;gap:8px}
.settings-range{width:120px;cursor:pointer}
.settings-range-val{font-size:11px;min-width:28px;text-align:right;opacity:.7}
.settings-model-row{display:flex;align-items:center;gap:8px;padding:7px 0;font-size:12px}
.settings-model-row+.settings-model-row{border-top:1px solid var(--border)}
.settings-model-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.settings-model-del{background:none;border:none;color:var(--accent);cursor:pointer;font-size:11px;padding:2px 8px}
.settings-add-btn{background:transparent;border:1px dashed var(--border);border-radius:6px;padding:6px;cursor:pointer;font-size:12px;width:100%;color:var(--fg);transition:border-color .2s}
.settings-add-btn:hover{border-color:var(--accent);color:var(--accent)}
.settings-form{background:var(--bg);border-radius:8px;padding:12px;margin-top:8px;border:1px solid var(--border)}
.settings-form-row{margin-bottom:6px}
.settings-form input{width:100%;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:6px 10px;color:var(--fg);font-size:12px;outline:none}
.settings-form input:focus{border-color:var(--accent)}
.settings-form-btns{display:flex;gap:8px;margin-top:8px}
.detail-search{position:fixed;bottom:12px;right:12px;width:240px;z-index:50}
.detail-search-input{display:flex;gap:4px}
.detail-search-input input{flex:1;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:6px 10px;color:var(--fg);font-size:12px;outline:none}
.detail-search-input input:focus{border-color:var(--accent)}
.detail-search-input button{background:var(--accent);color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:12px}
.detail-search-results{position:absolute;bottom:100%;left:0;right:0;background:#1b1f26;border:1px solid var(--border);border-radius:6px;max-height:200px;overflow-y:auto;margin-bottom:4px;display:none}
.detail-search-results.show{display:block}
.detail-search-item{padding:6px 10px;cursor:pointer;border-bottom:1px solid var(--border);font-size:12px;display:flex;justify-content:space-between;align-items:center}
.detail-search-item:last-child{border-bottom:none}
.detail-search-item:hover{background:#2a2f3a}
.detail-search-item .ds-name{color:#ddd}
.detail-search-item .ds-code{font-size:10px;opacity:.5}
</style>
</head>
<body>
<div class="tab-bar" id="tabBar"></div>
<div class="content" id="content"><div class="loading">加载中...</div></div>
<script src="${scriptUri}"></script>
</body>
</html>`;
}
