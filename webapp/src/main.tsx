import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';

// 注册 PWA Service Worker（自动更新）
registerSW({ immediate: true });

// PWA 安装提示
let deferredPrompt: any = null;
let installButton: HTMLButtonElement | null = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // 如果已经在 standalone 模式，不显示
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  
  // 延迟显示安装提示，避免干扰用户
  setTimeout(() => {
    if (deferredPrompt && !installButton) {
      installButton = document.createElement('button');
      installButton.textContent = '添加到桌面';
      installButton.style.cssText = 'position:fixed;bottom:80px;right:20px;z-index:9999;padding:12px 20px;background:#ff4d4f;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;box-shadow:0 4px 12px rgba(255,77,79,.3);cursor:pointer';
      installButton.onclick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          installButton?.remove();
          installButton = null;
        }
        deferredPrompt = null;
      };
      document.body.appendChild(installButton);
    }
  }, 3000);
});

// 监听 appinstalled 事件，清理按钮
window.addEventListener('appinstalled', () => {
  if (installButton) {
    installButton.remove();
    installButton = null;
  }
  deferredPrompt = null;
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
