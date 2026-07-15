import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { SectorMeta } from '@/types';

interface Props {
  sectors: SectorMeta[];
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
}

export default function SectorManager({ sectors, onAdd, onRemove }: Props) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = input.trim();
    if (!name) return;
    onAdd(name);
    setInput('');
  };

  return (
    <div className="border-b border-fund-border px-4 py-3 bg-fund-card">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 mb-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="新增板块名称"
          className="flex-1 rounded border border-fund-border bg-fund-bg px-3 py-1.5 text-sm outline-none focus:border-fund-up"
        />
        <button
          type="submit"
          className="flex items-center gap-1 rounded bg-fund-up px-3 py-1.5 text-sm text-white"
        >
          <Plus size={14} /> 添加
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {sectors.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1 rounded-full border border-fund-border px-2 py-1 text-xs"
            style={{ borderColor: s.color, color: s.color }}
          >
            {s.name}
            <button
              onClick={() => onRemove(s.id)}
              className="rounded-full p-0.5 hover:bg-fund-border/20"
              title="删除"
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}