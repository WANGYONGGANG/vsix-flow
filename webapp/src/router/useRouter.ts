// ============================================
// 简单 Hash 路由（省依赖）
// useRouter() 返回当前 #hash 路由 + navigate
// ============================================

import { useEffect, useState, useCallback } from 'react';

function readHash(): string {
  const h = window.location.hash || '#/';
  return h.startsWith('#') ? h.slice(1) : h;
}

export function useRouter() {
  const [path, setPath] = useState<string>(() => readHash());

  useEffect(() => {
    const onChange = () => setPath(readHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((to: string) => {
    const next = to.startsWith('/') ? to : `/${to}`;
    const cur = readHash();
    // 进入详情页时记录来源，供详情页返回使用
    if (to.startsWith('/stock/') && !cur.startsWith('/stock/')) {
      try { sessionStorage.setItem('stockDetailFrom', cur); } catch { /* ignore */ }
    }
    if (readHash() === next) return;
    window.location.hash = '#' + next;
    window.scrollTo(0, 0);
  }, []);

  return { path, navigate };
}
