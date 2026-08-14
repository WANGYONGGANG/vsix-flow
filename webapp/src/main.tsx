import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';

// 注册 PWA Service Worker（自动更新）
registerSW({ immediate: true });

// PWA 安装提示
let deferredPrompt: any = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // 延迟显示安装提示，避免干扰用户
  setTimeout(() => {
    if (deferredPrompt && !window.matchMedia('(display-mode: standalone)').matches) {
      const installBtn = document.createElement('button');
      installBtn.textContent = '添加到桌面';
      installBtn.style.cssText = 'position:fixed;bottom:80px;right:20px;z-index:9999;padding:12px 20px;background:#ff4d4f;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;box-shadow:0 4px 12px rgba(255,77,79,.3);cursor:pointer';
      installBtn.onclick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          installBtn.remove();
        }
        deferredPrompt = null;
      };
      document.body.appendChild(installBtn);
    }
  }, 3000);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
