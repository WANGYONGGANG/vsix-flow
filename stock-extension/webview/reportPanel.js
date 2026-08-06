const vscode = acquireVsCodeApi();
var loadingEl = document.getElementById('loading');
var reportRoot = document.getElementById('reportRoot');
var lastHtml = '';
window.addEventListener('message', function (e) {
  var msg = e.data;
  if (msg.type === 'report') {
    lastHtml = msg.html || '';
    if (loadingEl) loadingEl.style.display = 'none';
    if (reportRoot) reportRoot.innerHTML = msg.html;
  } else if (msg.type === 'setOpacity') {
    document.documentElement.style.setProperty('--panel-opacity', msg.opacity);
  } else if (msg.type === 'refresh') {
    if (loadingEl) loadingEl.style.display = '';
    if (reportRoot) reportRoot.innerHTML = '';
    vscode.postMessage({ type: 'refresh' });
  }
});
var refreshBtn = document.getElementById('refreshBtn');
if (refreshBtn) refreshBtn.addEventListener('click', function () { vscode.postMessage({ type: 'refresh' }); });
var openBrowserBtn = document.getElementById('openBrowserBtn');
if (openBrowserBtn) openBrowserBtn.addEventListener('click', function () {
  if (lastHtml) vscode.postMessage({ type: 'openInBrowser', html: lastHtml });
});
if (reportRoot) reportRoot.addEventListener('click', function (e) {
  var t = e.target;
  while (t && t !== reportRoot && t.nodeType === 1) {
    if (t.tagName === 'A' && t.hasAttribute('data-em')) {
      e.preventDefault();
      var href = t.getAttribute('href');
      if (href) vscode.postMessage({ type: 'openUrl', url: href });
      return;
    }
    t = t.parentNode;
  }
});
vscode.postMessage({ type: 'ready' });
