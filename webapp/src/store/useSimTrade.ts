// ============================================
// 模拟交易 Hook：基于 useSettings 持久化
// ============================================

import { useCallback } from 'react';
import { useSettings } from './useSettings';
import { SimHolding, SimOrder } from '../../local-shared/types';
import { uid } from '../../local-shared/utils';

export function useSimTrade() {
  const { settings, update } = useSettings();

  const balance = settings.simBalance ?? 100000;
  const holdings: SimHolding[] = settings.simHoldings || [];
  const orders: SimOrder[] = settings.simOrders || [];

  const setTrade = useCallback((patch: Partial<{ simBalance: number; simHoldings: SimHolding[]; simOrders: SimOrder[] }>) => {
    update(patch);
  }, [update]);

  const placeOrder = useCallback((type: 'buy' | 'sell', code: string, name: string, price: number, amount: number): boolean => {
    const p = Math.max(0, Number(price) || 0);
    const a = Math.max(0, Math.floor(Number(amount) || 0));
    if (p <= 0 || a <= 0) return false;
    const total = p * a;
    const now = new Date().toISOString();

    if (type === 'buy') {
      if (balance < total) return false;
      const order: SimOrder = { id: uid(), type, code, name, price: p, amount: a, status: 'pending', time: now };
      setTrade({ simBalance: balance - total, simOrders: [...orders, order] });
      return true;
    }

    // sell
    const holding = holdings.find((h) => h.code === code);
    if (!holding || holding.amount < a) return false;
    const nextHoldings = holdings.map((h) =>
      h.code === code ? { ...h, amount: h.amount - a } : h
    ).filter((h) => h.amount > 0);
    const order: SimOrder = { id: uid(), type, code, name, price: p, amount: a, status: 'pending', time: now };
    setTrade({ simHoldings: nextHoldings, simOrders: [...orders, order] });
    return true;
  }, [balance, holdings, orders, setTrade]);

  const cancelOrder = useCallback((id: string): boolean => {
    const order = orders.find((o) => o.id === id);
    if (!order || order.status !== 'pending') return false;
    const total = order.price * order.amount;

    if (order.type === 'buy') {
      setTrade({ simBalance: balance + total, simOrders: orders.map((o) => o.id === id ? { ...o, status: 'cancelled' as const } : o) });
    } else {
      const existing = holdings.find((h) => h.code === order.code);
      const nextHoldings: SimHolding[] = existing
        ? holdings.map((h) => h.code === order.code ? { ...h, amount: h.amount + order.amount } : h)
        : [...holdings, { code: order.code, name: order.name, amount: order.amount, cost: order.price }];
      setTrade({ simHoldings: nextHoldings, simOrders: orders.map((o) => o.id === id ? { ...o, status: 'cancelled' as const } : o) });
    }
    return true;
  }, [balance, holdings, orders, setTrade]);

  const fillOrder = useCallback((id: string): boolean => {
    const order = orders.find((o) => o.id === id);
    if (!order || order.status !== 'pending') return false;
    const total = order.price * order.amount;

    if (order.type === 'buy') {
      const existing = holdings.find((h) => h.code === order.code);
      const nextHoldings: SimHolding[] = existing
        ? holdings.map((h) => {
            if (h.code !== order.code) return h;
            const newAmount = h.amount + order.amount;
            const newCost = (h.cost * h.amount + total) / newAmount;
            return { ...h, amount: newAmount, cost: newCost };
          })
        : [...holdings, { code: order.code, name: order.name, amount: order.amount, cost: order.price }];
      setTrade({ simHoldings: nextHoldings, simOrders: orders.map((o) => o.id === id ? { ...o, status: 'filled' as const } : o) });
    } else {
      setTrade({ simBalance: balance + total, simOrders: orders.map((o) => o.id === id ? { ...o, status: 'filled' as const } : o) });
    }
    return true;
  }, [balance, holdings, orders, setTrade]);

  const clearSimData = useCallback(() => {
    setTrade({ simBalance: 100000, simHoldings: [], simOrders: [] });
  }, [setTrade]);

  return {
    balance,
    holdings,
    orders,
    placeOrder,
    cancelOrder,
    fillOrder,
    clearSimData,
  };
}
