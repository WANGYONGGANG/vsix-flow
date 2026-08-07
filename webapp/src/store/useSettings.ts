// ============================================
// 全局设置 + 自选/AI 模型配置 Hook (localStorage 持久化)
// ============================================

import { useCallback, useEffect, useMemo, useState } from 'react';
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

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(() => loadSettings());

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--up', settings.riseColor);
    root.style.setProperty('--down', settings.fallColor);

    // 计算实际生效的主题（system → 跟随 prefers-color-scheme）
    const resolved = settings.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : settings.theme;
    root.setAttribute('data-theme', resolved);
    if (resolved === 'light') root.classList.add('theme-light'); else root.classList.remove('theme-light');
  }, [settings.riseColor, settings.fallColor, settings.theme]);

  // 监听系统主题变化（仅 theme === 'system' 时生效）
  useEffect(() => {
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => {
      const root = document.documentElement;
      const resolved = mq.matches ? 'light' : 'dark';
      root.setAttribute('data-theme', resolved);
      if (resolved === 'light') root.classList.add('theme-light'); else root.classList.remove('theme-light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings.theme]);

  const save = useCallback((next: AppSettings) => {
    setSettingsState(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* empty */ }
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    save({ ...settings, ...patch });
  }, [settings, save]);

  // ======== 自选 ========
  const addWatch = useCallback((raw: string | WatchEntry) => {
    const codeStr: string = typeof raw === 'string' ? raw : (raw?.code || '');
    const name: string | undefined = typeof raw === 'string' ? undefined : raw?.name;
    const code = normalizeCode(codeStr);
    const groups = settings.stockPortfolio.groups.length
      ? settings.stockPortfolio.groups
      : [{ name: '默认分组', codes: [] as string[] }];
    if (groups[0].codes.includes(code)) return;
    groups[0].codes.push(code);
    const oldWatch: WatchEntry[] = Array.isArray(settings.watchlist) ? settings.watchlist.slice() : [];
    if (name && !oldWatch.find((w) => w.code === code)) oldWatch.push({ code, name });
    update({ stockPortfolio: { ...settings.stockPortfolio, groups }, watchlist: oldWatch });
  }, [settings, update]);

  const delWatch = useCallback((rawCode: string) => {
    const code = normalizeCode(rawCode);
    const groups = (settings.stockPortfolio.groups || []).map((g) => ({
      ...g, codes: g.codes.filter((c) => c !== code),
    }));
    update({ stockPortfolio: { ...settings.stockPortfolio, groups } });
  }, [settings, update]);

  const moveWatch = useCallback((rawCode: string, dir: 'up' | 'down' | 'top' | 'bottom') => {
    const code = normalizeCode(rawCode);
    const groups = settings.stockPortfolio.groups.length
      ? settings.stockPortfolio.groups
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
    update({ stockPortfolio: { ...settings.stockPortfolio, groups } });
  }, [settings, update]);

  const reorderWatch = useCallback((codes: string[]) => {
    const groups = settings.stockPortfolio.groups.length
      ? settings.stockPortfolio.groups
      : [{ name: '默认分组', codes: [] as string[] }];
    groups[0] = { ...(groups[0] || { name: '默认分组' }), codes: codes.map(normalizeCode) };
    update({ stockPortfolio: { ...settings.stockPortfolio, groups } });
  }, [settings, update]);

  const getWatchCodes = useCallback((): string[] => {
    return (settings.stockPortfolio.groups || []).flatMap((g) => g.codes || []);
  }, [settings]);

  // ======== AI 模型 ========
  const saveAIModel = useCallback((m: AIModelConfig) => {
    const exists = settings.aiModels.find((x) => x.id === m.id);
    let list: AIModelConfig[];
    if (exists) {
      list = settings.aiModels.map((x) => x.id === m.id ? { ...x, ...m } : x);
    } else {
      list = [...settings.aiModels, { ...m, id: m.id || uid() }];
    }
    const activeId = settings.activeAIModelId ?? (list.length ? list[0].id : null);
    update({ aiModels: list, activeAIModelId: activeId });
  }, [settings, update]);

  const deleteAIModel = useCallback((id: string) => {
    const list = settings.aiModels.filter((x) => x.id !== id);
    const activeId = settings.activeAIModelId === id ? (list[0]?.id ?? null) : settings.activeAIModelId;
    update({ aiModels: list, activeAIModelId: activeId });
  }, [settings, update]);

  const setActiveAIModel = useCallback((id: string | null) => {
    update({ activeAIModelId: id });
  }, [update]);

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
      save(merged);
      return true;
    } catch { return false; }
  };

  // ======== 公式指标 ========
  const formulas = useMemo(() => settings.formulas || [], [settings.formulas]);
  
  const updateFormulas = useCallback((newFormulas: FormulaConfig[]) => {
    update({ formulas: newFormulas });
  }, [update]);

  return {
    settings, update, save,
    addWatch, delWatch, moveWatch, reorderWatch, getWatchCodes,
    saveAIModel, deleteAIModel, setActiveAIModel, activeAIModel,
    formulas, updateFormulas,
    exportJSON, importJSON,
    watchlist,
  };
}
