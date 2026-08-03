// ============================================
// 全局设置 + 自选/AI 模型配置 Hook (localStorage 持久化)
// ============================================

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_SETTINGS } from '../../local-shared/constants';
import { AppSettings, AIModelConfig } from '../../local-shared/types';
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
  }, [settings.riseColor, settings.fallColor]);

  const save = useCallback((next: AppSettings) => {
    setSettingsState(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* empty */ }
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    save({ ...settings, ...patch });
  }, [settings, save]);

  // ======== 自选 ========
  const addWatch = useCallback((rawCode: string) => {
    const code = normalizeCode(rawCode);
    const groups = settings.stockPortfolio.groups.length
      ? settings.stockPortfolio.groups
      : [{ name: '默认分组', codes: [] as string[] }];
    if (groups[0].codes.includes(code)) return;
    groups[0].codes.push(code);
    update({ stockPortfolio: { ...settings.stockPortfolio, groups } });
  }, [settings, update]);

  const delWatch = useCallback((rawCode: string) => {
    const code = normalizeCode(rawCode);
    const groups = (settings.stockPortfolio.groups || []).map((g) => ({
      ...g, codes: g.codes.filter((c) => c !== code),
    }));
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

  return {
    settings, update, save,
    addWatch, delWatch, getWatchCodes,
    saveAIModel, deleteAIModel, setActiveAIModel, activeAIModel,
    exportJSON, importJSON,
  };
}
