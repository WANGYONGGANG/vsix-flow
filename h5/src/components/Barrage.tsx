import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchBarrageData } from '@/lib/socialData';

interface BarrageItem {
  id: number;
  text: string;
  top: number;
  speed: number;
  color: string;
  source: string;
}

let nextId = 0;

export default function Barrage() {
  const [items, setItems] = useState<BarrageItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSpawnRef = useRef(0);
  const animRef = useRef<number>();
  const itemsRef = useRef<BarrageItem[]>([]);
  const entriesRef = useRef<{ text: string; source: string; user: string }[]>([]);
  const entriesIdxRef = useRef(0);

  // 加载东财快讯作为弹幕数据
  const loadEntries = useCallback(async () => {
    try {
      entriesRef.current = await fetchBarrageData('', '', undefined);
      entriesIdxRef.current = 0;
    } catch {
      entriesRef.current = [];
    }
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // 定时刷新
  useEffect(() => {
    const id = setInterval(loadEntries, 120000);
    return () => clearInterval(id);
  }, [loadEntries]);

  // 生成弹幕
  const spawn = useCallback(() => {
    const entries = entriesRef.current;
    if (!entries.length) return;
    const entry = entries[entriesIdxRef.current % entries.length];
    entriesIdxRef.current++;

    const container = containerRef.current;
    if (!container) return;
    const h = container.clientHeight;

    const item: BarrageItem = {
      id: nextId++,
      text: entry.user ? `${entry.user}: ${entry.text}` : entry.text,
      top: Math.random() * Math.max(h - 30, 10),
      speed: 1.5 + Math.random() * 2,
      color: '#f0b90b',
      source: entry.source,
    };
    itemsRef.current = [...itemsRef.current, item];
    setItems([...itemsRef.current]);
  }, []);

  // 动画循环 — 自动滚动，不需要回放
  useEffect(() => {
    const step = () => {
      const now = performance.now();
      if (now - lastSpawnRef.current > 2000 + Math.random() * 2000) {
        spawn();
        lastSpawnRef.current = now;
      }
      setItems([...itemsRef.current]);
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [spawn]);

  // 清理离开屏幕的弹幕
  useEffect(() => {
    const interval = setInterval(() => {
      itemsRef.current = itemsRef.current.filter(item => {
        const el = document.getElementById(`barrage-${item.id}`);
        if (!el) return false;
        return el.getBoundingClientRect().right > -100;
      });
      setItems([...itemsRef.current]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {items.map(item => (
        <BarrageLine key={item.id} item={item} containerWidth={containerRef.current?.clientWidth || 800} />
      ))}
    </div>
  );
}

function BarrageLine({ item, containerWidth }: { item: BarrageItem; containerWidth: number }) {
  const [x, setX] = useState(containerWidth + 20);

  useEffect(() => {
    let raf: number;
    const step = () => {
      setX(prev => prev - item.speed);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [item.speed]);

  if (x < -500) return null;

  return (
    <div
      id={`barrage-${item.id}`}
      className="absolute whitespace-nowrap text-sm font-medium"
      style={{
        left: x,
        top: item.top,
        color: item.color,
        textShadow: '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)',
        willChange: 'transform',
      }}
    >
      <span className="text-[10px] mr-1 opacity-60">[{item.source}]</span>
      {item.text}
    </div>
  );
}