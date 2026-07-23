import { useEffect, useRef, useState, useCallback } from 'react';
import { createBarrageGenerator } from '@/lib/socialData';
import type { FundData } from '@/types';

interface BarrageItem {
  id: number;
  text: string;
  top: number;
  speed: number;
  color: string;
  source: string;
  user: string;
}

interface Props {
  data: FundData | null;
  currentIndex: number;
}

let nextId = 0;

export default function Barrage({ data, currentIndex }: Props) {
  const [items, setItems] = useState<BarrageItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSpawnRef = useRef(0);
  const animRef = useRef<number>();
  const itemsRef = useRef<BarrageItem[]>([]);
  const genRef = useRef(createBarrageGenerator());

  // 更新弹幕生成器的数据
  useEffect(() => {
    if (!data) return;
    const point = data.intraday[currentIndex];
    if (!point) return;

    const sectors = data.sectors.map(s => ({
      name: s.name,
      value: point.sectors[s.name] ?? 0,
    }));

    // 大盘涨跌用净流入近似
    const totalFlow = sectors.reduce((sum, s) => sum + s.value, 0);
    genRef.current.update(sectors, totalFlow);
  }, [data, currentIndex]);

  // 生成弹幕
  const spawn = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const h = container.clientHeight;

    const entry = genRef.current.generate();
    const isUp = entry.text.includes('流入') || entry.text.includes('涨') || entry.text.includes('红') || entry.text.includes('加仓') || entry.text.includes('抢筹');

    const item: BarrageItem = {
      id: nextId++,
      text: entry.text,
      top: Math.random() * Math.max(h - 30, 10),
      speed: 1.2 + Math.random() * 1.8,
      color: isUp ? '#ef4444' : '#22c55e',
      source: entry.source,
      user: entry.user,
    };
    itemsRef.current = [...itemsRef.current, item];
    setItems([...itemsRef.current]);
  }, []);

  // 动画循环
  useEffect(() => {
    const step = () => {
      const now = performance.now();
      if (now - lastSpawnRef.current > 1500 + Math.random() * 2000) {
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
      <span className="text-[10px] mr-1 opacity-70">{item.user}</span>
      {item.text}
    </div>
  );
}