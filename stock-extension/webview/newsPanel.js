const vscode = acquireVsCodeApi();
function esc(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
function fmtTime(t) { return String(t).slice(5, 16); }
function render(items) {
  var el = document.getElementById('newsList');
  if (!items || !items.length) { el.innerHTML = '<div class="loading">暂无新闻</div>'; return; }
  var html = items.slice(0, 100).map(function (n, idx) {
    return '<div class="news-item" data-url="' + esc(n.url || '') + '"><div class="time">' + fmtTime(n.time) + '</div><div class="title">' + esc(n.title) + '</div></div>';
  }).join('');
  el.innerHTML = html;
  var rows = el.querySelectorAll('.news-item');
  for (var i = 0; i < rows.length; i++) {
    (function (row) {
      row.addEventListener('click', function () { vscode.postMessage({ type: 'openUrl', url: row.getAttribute('data-url') }); });
    })(rows[i]);
  }
}
window.addEventListener('message', function (e) {
  var msg = e.data;
  if (msg.type === 'news') render(msg.items);
  else if (msg.type === 'setOpacity') document.documentElement.style.setProperty('--panel-opacity', msg.opacity);
});
var refreshBtn = document.getElementById('refreshBtn');
if (refreshBtn) refreshBtn.addEventListener('click', function () { vscode.postMessage({ type: 'refresh' }); });
vscode.postMessage({ type: 'ready' });
