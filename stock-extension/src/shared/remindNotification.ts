import * as vscode from 'vscode';
import { fetchStockQuotes } from '../service/eastmoney';
import { pushWebhook } from './webhookPush';
import { formatPrice } from './utils';

interface RemindRule {
  price?: { operator: 'gt' | 'lt'; value: number };
  percent?: { operator: 'gt' | 'lt'; value: number };
}

interface RemindConfig {
  [code: string]: RemindRule;
}

const triggered = new Set<string>();

export async function checkReminders() {
  const config = vscode.workspace.getConfiguration('stock-ext');
  const remindSwitch = config.get<number>('stockRemindSwitch') || 0;
  if (!remindSwitch) return;

  const reminds = config.get<RemindConfig>('stocksRemind') || {};
  const codes = Object.keys(reminds);
  if (!codes.length) return;

  const quotes = await fetchStockQuotes(codes);
  for (const q of quotes) {
    if (!q.price || !q.changeRate) continue;
    const rule = reminds[q.code];
    if (!rule) continue;

    let triggeredRules: string[] = [];

    if (rule.price) {
      const hit = rule.price.operator === 'gt'
        ? q.price > rule.price.value
        : q.price < rule.price.value;
      if (hit) triggeredRules.push(`价格${rule.price.operator === 'gt' ? '高于' : '低于'} ${formatPrice(rule.price.value)}`);
    }

    if (rule.percent) {
      const hit = rule.percent.operator === 'gt'
        ? q.changeRate > rule.percent.value
        : q.changeRate < rule.percent.value;
      if (hit) triggeredRules.push(`涨幅${rule.percent.operator === 'gt' ? '超过' : '低于'} ${rule.percent.value}%`);
    }

    if (triggeredRules.length) {
      const key = `${q.code}-${Date.now()}`;
      if (!triggered.has(key)) {
        triggered.add(key);
        const title = `${q.name} 预警`;
        const msg = `现价: ${formatPrice(q.price)}\n触发条件: ${triggeredRules.join(', ')}`;
        vscode.window.showWarningMessage(`${title}: ${msg}`);
        pushWebhook(title, msg);
        setTimeout(() => triggered.delete(key), 300000);
      }
    }
  }
}

export function resetReminderTriggers() {
  triggered.clear();
}
