// ============================================
// 全局设置 + 自选/AI 模型配置 Hook (localStorage 持久化)
// 使用 useSyncExternalStore 实现跨组件共享状态
// ============================================

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { DEFAULT_SETTINGS } from '../../local-shared/constants';
import { AppSettings, AIModelConfig, WatchEntry, FormulaConfig } from '../../local-shared/types';
import { normalizeCode, uid } from '../../local-shared/utils';

const STORAGE_KEY = 'stockext.settings.v1';

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return deepClone(DEFAULT_SETTINGS);
    const parsed = JSON.parse(raw);
    return { ...deepClone(DEFAULT_SETTINGS), ...parsed };
  } catch {
    return deepClone(DEFAULT_SETTINGS);
  }
}

function deepClone<T>(o: T): T { return JSON.parse(JSON.stringify(o)); }

// ======== 外部单例 store ========
let _state: AppSettings = loadSettings();
const _listeners = new Set<() => void>();

function _notify() { _listeners.forEach((l) => l()); }

function _setState(next: AppSettings) {
  _state = next;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* empty */ }
  _notify();
}

function _subscribe(cb: () => void): () => void {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}

function _getSnapshot(): AppSettings { return _state; }

// 主题应用副作用——在模块层维护，避免每个组件重复执行
let _lastThemeKey = '';
function _applyThemeEffect(settings: AppSettings) {
  const root = document.documentElement;
  root.style.setProperty('--up', settings.riseColor);
  root.style.setProperty('--down', settings.fallColor);
  const resolved = settings.theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : settings.theme;
  root.setAttribute('data-theme', resolved);
  if (resolved === 'light') root.classList.add('theme-light'); else root.classList.remove('theme-light');
}

// 在模块加载时立即应用主题
_applyThemeEffect(_state);

// 监听系统主题变化
if (typeof window !== 'undefined' && window.matchMedia) {
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  mq.addEventListener('change', () => {
    if (_state.theme === 'system') _applyThemeEffect(_state);
  });
}

// 跟踪主题变化并触发 DOM 更新
let _prevTheme = JSON.stringify({ rise: _state.riseColor, fall: _state.fallColor, theme: _state.theme });

export function useSettings() {
  const settings = useSyncExternalStore(_subscribe, _getSnapshot);

  // 主题副作用：仅在相关字段变化时执行
  const themeKey = JSON.stringify({ rise: settings.riseColor, fall: settings.fallColor, theme: settings.theme });
  if (themeKey !== _prevTheme) {
    _prevTheme = themeKey;
    _applyThemeEffect(settings);
  }

  const save = useCallback((next: AppSettings) => {
    _setState(next);
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    _setState({ ..._state, ...patch });
  }, []);

  // ======== 自选 ========
  const addWatch = useCallback((raw: string | WatchEntry) => {
    const codeStr: string = typeof raw === 'string' ? raw : (raw?.code || '');
    const name: string | undefined = typeof raw === 'string' ? undefined : raw?.name;
    const code = normalizeCode(codeStr);
    const s = _state;
    const groups = s.stockPortfolio.groups.length
      ? s.stockPortfolio.groups
      : [{ name: '默认分组', codes: [] as string[] }];
    if (groups[0].codes.includes(code)) return;
    groups[0].codes.push(code);
    const oldWatch: WatchEntry[] = Array.isArray(s.watchlist) ? s.watchlist.slice() : [];
    if (name && !oldWatch.find((w) => w.code === code)) oldWatch.push({ code, name });
    _setState({ ...s, stockPortfolio: { ...s.stockPortfolio, groups }, watchlist: oldWatch });
  }, []);

  const delWatch = useCallback((rawCode: string) => {
    const code = normalizeCode(rawCode);
    const s = _state;
    const groups = (s.stockPortfolio.groups || []).map((g) => ({
      ...g, codes: g.codes.filter((c) => c !== code),
    }));
    _setState({ ...s, stockPortfolio: { ...s.stockPortfolio, groups } });
  }, []);

  const moveWatch = useCallback((rawCode: string, dir: 'up' | 'down' | 'top' | 'bottom') => {
    const code = normalizeCode(rawCode);
    const s = _state;
    const groups = s.stockPortfolio.groups.length
      ? s.stockPortfolio.groups
      : [{ name: '默认分组', codes: [] as string[] }];
    const g = groups[0];
    const codes = [...(g.codes || [])];
    const i = codes.indexOf(code);
    if (i < 0) return;
    codes.splice(i, 1);
    if (dir === 'top') codes.unshift(code);
    else if (dir === 'bottom') codes.push(code);
    else if (dir === 'up') codes.splice(Math.max(0, i - 1), 0, code);
    else codes.splice(Math.min(codes.length, i + 1), 0, code);
    groups[0] = { ...g, codes };
    _setState({ ...s, stockPortfolio: { ...s.stockPortfolio, groups } });
  }, []);

  const reorderWatch = useCallback((codes: string[]) => {
    const s = _state;
    const groups = s.stockPortfolio.groups.length
      ? s.stockPortfolio.groups
      : [{ name: '默认分组', codes: [] as string[] }];
    groups[0] = { ...(groups[0] || { name: '默认分组' }), codes: codes.map(normalizeCode) };
    _setState({ ...s, stockPortfolio: { ...s.stockPortfolio, groups } });
  }, []);

  const getWatchCodes = useCallback((): string[] => {
    return (_state.stockPortfolio.groups || []).flatMap((g) => g.codes || []);
  }, []);

  // ======== AI 模型 ========
  const saveAIModel = useCallback((m: AIModelConfig) => {
    const s = _state;
    const exists = s.aiModels.find((x) => x.id === m.id);
    let list: AIModelConfig[];
    if (exists) {
      list = s.aiModels.map((x) => x.id === m.id ? { ...x, ...m } : x);
    } else {
      list = [...s.aiModels, { ...m, id: m.id || uid() }];
    }
    const activeId = s.activeAIModelId ?? (list.length ? list[0].id : null);
    _setState({ ...s, aiModels: list, activeAIModelId: activeId });
  }, []);

  const deleteAIModel = useCallback((id: string) => {
    const s = _state;
    const list = s.aiModels.filter((x) => x.id !== id);
    const activeId = s.activeAIModelId === id ? (list[0]?.id ?? null) : s.activeAIModelId;
    _setState({ ...s, aiModels: list, activeAIModelId: activeId });
  }, []);

  const setActiveAIModel = useCallback((id: string | null) => {
    _setState({ ..._state, activeAIModelId: id });
  }, []);

  const activeAIModel: AIModelConfig | null =
    settings.aiModels.find((m) => m.id === settings.activeAIModelId) ?? settings.aiModels[0] ?? null;

  // 兼容 watchlist 字段：优先使用 stockPortfolio.groups 的 codes；name 从 settings.watchlist 或 fallback 里拿
  const watchlist = useMemo<WatchEntry[]>(() => {
    const byCode = new Map<string, WatchEntry>();
    for (const w of Array.isArray(settings.watchlist) ? settings.watchlist : []) {
      if (w && w.code) byCode.set(normalizeCode(w.code), { code: normalizeCode(w.code), name: w.name });
    }
    const out: WatchEntry[] = [];
    for (const g of settings.stockPortfolio.groups || []) {
      for (const raw of g.codes || []) {
        const code = normalizeCode(raw);
        if (out.find((x) => x.code === code)) continue;
        out.push(byCode.get(code) || { code });
      }
    }
    return out;
  }, [settings]);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `stockext-settings-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importJSON = async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const merged = { ...deepClone(DEFAULT_SETTINGS), ...parsed };
      _setState(merged);
      return true;
    } catch { return false; }
  };

  // ======== 公式指标 ========
  const formulas = useMemo(() => settings.formulas || [], [settings.formulas]);
  
  const updateFormulas = useCallback((newFormulas: FormulaConfig[]) => {
    _setState({ ..._state, formulas: newFormulas });
  }, []);

  return {
    settings, update, save,
    addWatch, delWatch, moveWatch, reorderWatch, getWatchCodes,
    saveAIModel, deleteAIModel, setActiveAIModel, activeAIModel,
    formulas, updateFormulas,
    exportJSON, importJSON,
    watchlist,
  };
}
