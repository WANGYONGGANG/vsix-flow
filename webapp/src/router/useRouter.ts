// ============================================
// 简单 Hash 路由（省依赖）
// useRouter() 返回当前 #hash 路由 + navigate + back
// 返回用自维护栈：关键点——返回导航「不再压栈」，避免垃圾条目累积导致返回错乱
// ============================================

import { useEffect, useState, useCallback } from 'react';

function readHash(): string {
  const h = window.location.hash || '#/';
  return h.startsWith('#') ? h.slice(1) : h;
}

// ===== 导航历史栈（sessionStorage 持久化）=====
const STACK_KEY = 'navStack';

function readStack(): string[] {
  try {
    const arr = JSON.parse(sessionStorage.getItem(STACK_KEY) || '[]');
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch { return []; }
}

function writeStack(stack: string[]) {
  try { sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(-50))); } catch { /* ignore */ }
}

export function useRouter() {
  const [path, setPath] = useState<string>(() => readHash());

  useEffect(() => {
    const onChange = () => setPath(readHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  // push=true：普通前进导航，把来源页压栈；push=false：返回导航，只弹栈不压栈
  const navigate = useCallback((to: string, push: boolean = true) => {
    const next = to.startsWith('/') ? to : `/${to}`;
    const cur = readHash();
    if (cur === next) return;
    if (push) {
      const stack = readStack();
      // 离开首页时附带当时的 tab，返回时可恢复
      const entry = cur === '/' || cur.startsWith('/?')
        ? '/?tab=' + (sessionStorage.getItem('homeTab') || 'market')
        : cur;
      stack.push(entry);
      writeStack(stack);
    }
    window.location.hash = '#' + next;
    window.scrollTo(0, 0);
  }, []);

  // 返回：弹栈取来源页；栈空回首页。用 push=false 避免把当前页再压回去
  const back = useCallback(() => {
    const stack = readStack();
    const cur = readHash();
    // 清理可能存在的与当前页重复的栈顶
    while (stack.length && stack[stack.length - 1] === cur) stack.pop();
    const from = stack.pop() || '/';
    writeStack(stack);
    navigate(from, false);
  }, [navigate]);

  return { path, navigate, back };
}
