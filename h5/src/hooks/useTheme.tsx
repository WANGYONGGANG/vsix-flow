import { useState, useEffect, createContext, useContext } from 'react';

type Theme = 'light' | 'dark' | 'vscode-bg' | 'editor-bg';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  isEditorMode: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
  isEditorMode: false,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const isEditorMode = typeof window !== 'undefined' && (window as any).FUND_FLOW_EDITOR_MODE;
  
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      if ((window as any).FUND_FLOW_VSCODE) {
        if (isEditorMode) return 'editor-bg';
        return (window as any).FUND_FLOW_THEME || 'light';
      }
      return (localStorage.getItem('theme') as Theme) || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'vscode-bg', 'editor-bg');
    root.classList.add(theme);
    
    if (typeof window !== 'undefined') {
      if (isEditorMode) {
        document.body.classList.add('editor-mode');
      } else {
        document.body.classList.remove('editor-mode');
      }
    }
    
    if (typeof window !== 'undefined' && !(window as any).FUND_FLOW_VSCODE) {
      localStorage.setItem('theme', theme);
    }
  }, [theme, isEditorMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!(window as any).FUND_FLOW_VSCODE) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'theme') {
        setThemeState(e.data.theme);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isEditorMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);