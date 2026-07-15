import { Sun, Moon, Monitor, File } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export default function ThemeToggle() {
  const { theme, setTheme, isEditorMode } = useTheme();

  const themes: Array<{ value: 'light' | 'dark' | 'vscode-bg' | 'editor-bg'; icon: React.ReactNode; label: string }> = [
    { value: 'light', icon: <Sun size={14} />, label: '亮色' },
    { value: 'dark', icon: <Moon size={14} />, label: '暗色' },
    { value: 'vscode-bg', icon: <Monitor size={14} />, label: 'VS Code' },
    { value: 'editor-bg', icon: <File size={14} />, label: '编辑器' },
  ];

  const filteredThemes = isEditorMode 
    ? themes.filter(t => t.value === 'editor-bg' || t.value === 'dark')
    : themes;

  const nextTheme = () => {
    const idx = filteredThemes.findIndex((t) => t.value === theme);
    setTheme(filteredThemes[(idx + 1) % filteredThemes.length].value);
  };

  const current = themes.find((t) => t.value === theme);

  return (
    <button
      onClick={nextTheme}
      className="flex items-center gap-1.5 rounded px-2 py-1.5 text-xs hover:bg-fund-card transition-colors"
      title={`当前：${current?.label}，点击切换`}
    >
      {current?.icon}
      <span>{current?.label}</span>
    </button>
  );
}