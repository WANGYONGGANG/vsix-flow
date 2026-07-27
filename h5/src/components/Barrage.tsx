import { useEffect, useRef, useState, useCallback } from 'react';
import { createBarrageGenerator } from '@/lib/socialData';
import type { FundData } from '@/types';

interface BarrageItem {
  id: number;
  text: string;
  top: number;
  speed: number;
  color: string;
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

    // 计算日内最高/最低总资金流
    let dayHigh = -Infinity;
    let dayLow = Infinity;
    for (const p of data.intraday) {
      const total = data.sectors.reduce((sum, s) => sum + (p.sectors[s.name] ?? 0), 0);
      dayHigh = Math.max(dayHigh, total);
      dayLow = Math.min(dayLow, total);
    }

    const sectors = data.sectors.map(s => ({
      name: s.name,
      value: point.sectors[s.name] ?? 0,
    }));

    const totalFlow = sectors.reduce((sum, s) => sum + s.value, 0);

    genRef.current.update({
      sectors,
      totalFlow,
      currentTime: point.time,
      dayHigh: dayHigh === -Infinity ? 0 : dayHigh,
      dayLow: dayLow === Infinity ? 0 : dayLow,
    });
  }, [data, currentIndex]);

  // 生成弹幕
  const spawn = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const h = container.clientHeight;

    const entry = genRef.current.generate();

    const item: BarrageItem = {
      id: nextId++,
      text: entry.text,
      top: Math.random() * Math.max(h - 30, 10),
      speed: 1.2 + Math.random() * 1.8,
      color: entry.color,
      user: entry.user,
    };
    itemsRef.current = [...itemsRef.current, item];
    setItems([...itemsRef.current]);
  }, []);

  // 动画循环
  useEffect(() => {
    const step = () => {
      const now = performance.now();
      if (now - lastSpawnRef.current > 1200 + Math.random() * 1800) {
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
      className="absolute whitespace-nowrap text-sm font-medium px-2 py-0.5 rounded-full"
      style={{
        left: x,
        top: item.top,
        color: item.color,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(2px)',
        textShadow: '0 0 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.8)',
        willChange: 'transform',
      }}
    >
      <span className="text-[10px] mr-1 opacity-60">{item.user}</span>
      {item.text}
    </div>
  );
}
