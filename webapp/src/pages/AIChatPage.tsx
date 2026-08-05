// ============================================
// AI 对话页：流式 SSE + 多模型切换 + 上下文注入（自选/行情/快讯）
// ============================================

import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../store/useSettings';
import { useRouter } from '../router/useRouter';
import { api } from '../api/client';
import { AIChatMessage } from '../../local-shared/types';
import { fmtYi, upSign, mapEmDiffToStockItem, escapeHtml } from '../../local-shared/utils';

const STORAGE_KEY = 'stockext.ai.history.v1';

function loadHistory(): { id: string; messages: AIChatMessage[]; title: string }[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveHistory(list: any[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* empty */ }
}

type Session = { id: string; messages: AIChatMessage[]; title: string };

export default function AIChatPage() {
  const { settings, activeAIModel, addWatch, getWatchCodes } = useSettings();
  const { navigate } = useRouter();
  const [sessions, setSessions] = useState<Session[]>(() => loadHistory());
  const [sid, setSid] = useState<string>(() => loadHistory()[0]?.id || newSid());
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [assistantDraft, setAssistantDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef('');

  useEffect(() => {
    if (!sessions.find((s) => s.id === sid)) {
      const s: Session = { id: sid, messages: [], title: '新对话' };
      setSessions((list) => [...list, s]);
    }
  }, [sid, sessions]);

  // 支持从 HomePage AI 快捷入口传来的初始 prompt（hash 形式 #/ai?prompt=xxx）
  const initPromptRef = useRef(false);
  useEffect(() => {
    if (initPromptRef.current) return;
    initPromptRef.current = true;
    try {
      const h = window.location.hash || '';
      const qs = h.includes('?') ? h.split('?')[1] : '';
      const p = new URLSearchParams(qs).get('prompt');
      if (p) setInput(decodeURIComponent(p));
    } catch { /* empty */ }
  }, []);

  useEffect(() => { saveHistory(sessions); }, [sessions]);

  useEffect(() => { scrollToBottom(); }, [sessions, assistantDraft, sid]);

  function scrollToBottom() {
    const el = scrollRef.current;
    if (el) setTimeout(() => { el.scrollTop = el.scrollHeight; }, 20);
  }

  const session: Session = sessions.find((s) => s.id === sid) || { id: sid, messages: [], title: '新对话' };

  function updateSessionMessages(messages: AIChatMessage[]) {
    const title = messages.find((m) => m.role === 'user')?.content.slice(0, 16) || '新对话';
    setSessions((list) => list.map((s) => s.id === sid ? { ...s, messages, title } : s));
  }

  async function send() {
    const content = input.trim();
    if (!content) return;
    if (!activeAIModel) { alert('请先在【我的】→【AI 模型管理】中添加并启用一个模型'); navigate('/settings'); return; }
    setInput(''); setAssistantDraft(''); draftRef.current = '';
    const msgs: AIChatMessage[] = [...session.messages, { role: 'user', content }];
    updateSessionMessages(msgs);
    setSending(true);
    try {
      const full = await api.chatStream({
        baseURL: activeAIModel.baseURL,
        apiKey: activeAIModel.apiKey,
        model: activeAIModel.model,
        temperature: activeAIModel.temperature ?? 0.7,
        messages: [
          { role: 'system', content: '你是 StockAI，一个 A 股行情分析助手。回答简洁，不要提供具体投资建议，使用中文。' },
          ...msgs,
        ],
        onToken: (delta) => {
          draftRef.current += delta;
          setAssistantDraft(draftRef.current);
        },
      });
      const finalMsgs = [...msgs, { role: 'assistant' as const, content: full || draftRef.current || '(无响应)' }];
      updateSessionMessages(finalMsgs);
    } catch (e: any) {
      const finalMsgs = [...msgs, { role: 'assistant' as const, content: `❌ 请求失败：${e?.message || String(e)}` }];
      updateSessionMessages(finalMsgs);
    } finally {
      setSending(false);
      setAssistantDraft('');
      draftRef.current = '';
    }
  }

  function newChat() {
    const id = newSid();
    setSid(id);
  }

  // ========= 快捷 Chips：注入自选/行情/快讯 给 AI =========
  async function chipInjectWatchlist() {
    const codes = getWatchCodes();
    if (!codes.length) { setInput('我的自选股有哪些？'); return; }
    const r = await api.quote(codes);
    const diff = r?.data?.diff || [];
    const lines = diff.map((d: any) => {
      const s = mapEmDiffToStockItem(d);
      return `- ${s.name}(${s.code})：${s.price} ${upSign(s.changeRate)}${s.changeRate.toFixed(2)}%`;
    }).join('\n');
    setInput(
      `这是我当前的自选股行情（${new Date().toLocaleTimeString('zh-CN', { hour12: false })}）：\n${lines}\n\n请给出点评与近期关注点。`
    );
    setTimeout(scrollToBottom, 0);
  }

  async function chipInjectFlashnews() {
    const r = await api.emNews(1, 10);
    const list = r?.data?.list || [];
    const lines = list.slice(0, 10).map((n: any, i: number) => `${i + 1}. [${n.showtime || n.time || ''}] ${n.title || ''}`).join('\n');
    setInput(`最近 10 条市场快讯：\n${lines}\n\n请提炼关键信息，帮我解读今日市场情绪。`);
  }

  async function chipInjectSectors() {
    const [hy, gn] = await Promise.all([api.sinaBkzj(0), api.sinaBkzj(1)]);
    const list = [
      ...((hy?.data?.list || []).slice(0, 3)),
      ...((gn?.data?.list || []).slice(0, 3)),
    ].sort((a: any, b: any) => Number(b.netamount) - Number(a.netamount));
    const lines = list.slice(0, 6).map((x: any) =>
      `- ${x.name}：净流入 ${fmtYi(x.netamount)}，领涨 ${x.ts_name || ''} ${upSign(Number(x.ts_changeratio) * 100)}${(Number(x.ts_changeratio) * 100).toFixed(2)}%`
    ).join('\n');
    setInput(`今日板块资金流入 TOP：\n${lines}\n\n解读一下盘面主线。`);
  }

  return (
    <div className="page">
      {/* 顶部会话切换（简单横向 chip） */}
      <div className="ai-tools-row" style={{ borderTop: 0, borderBottom: '1px solid var(--border)' }}>
        <button className="ai-chip" onClick={newChat}>🆕 新对话</button>
        {sessions.slice(-6).reverse().map((s) => (
          <button key={s.id} className={'ai-chip'} style={{ opacity: s.id === sid ? 1 : .65, fontWeight: s.id === sid ? 700 : 400 }}
            onClick={() => setSid(s.id)}>
            {escapeHtml(s.title).slice(0, 10) || '新对话'}
          </button>
        ))}
        {sessions.length > 7 && (
          <button className="ai-chip" onClick={() => {
            if (confirm('清空所有 AI 对话记录？')) {
              setSessions([]); newChat();
            }
          }}>🧹 清空</button>
        )}
      </div>

      {/* 当前模型指示 */}
      <div className="chat-hint">
        {activeAIModel
          ? <>当前模型：<b className="text-accent">{activeAIModel.name || activeAIModel.provider}</b> · {activeAIModel.model}</>
          : <span className="text-up">⚠ 尚未配置 AI 模型，点击 我的 → AI 模型管理 添加</span>
        }
      </div>

      <div className="chat-container" ref={scrollRef}>
        {session.messages.length === 0 && (
          <div className="msg system">
            你好！我是 StockAI。你可以直接提问，或者点下方的快捷工具注入上下文。
          </div>
        )}
        {session.messages.map((m, i) => (
          <div key={i} className={'msg ' + m.role}>{m.content}</div>
        ))}
        {sending && assistantDraft && (
          <div className="msg assistant">{assistantDraft}<span style={{ opacity: .5 }}>▋</span></div>
        )}
      </div>

      {/* AI 快捷 Chips */}
      <div className="ai-tools-row">
        <button className="ai-chip" onClick={chipInjectWatchlist}>📊 自选点评</button>
        <button className="ai-chip" onClick={chipInjectFlashnews}>⚡ 快讯解读</button>
        <button className="ai-chip" onClick={chipInjectSectors}>🔥 板块热点</button>
        <button className="ai-chip" onClick={() => navigate('/watchlist_link_via_homepage' as any)} style={{ display: 'none' }} />
      </div>

      {/* 输入栏 */}
      <div className="chat-inputbar">
        <textarea
          value={input}
          placeholder={sending ? '生成中…' : '问点什么，回车发送，Shift+Enter 换行'}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !sending) { e.preventDefault(); send(); }
          }}
          disabled={sending}
          rows={1}
        />
        <button className="send-btn" onClick={send} disabled={sending || !input.trim() || !activeAIModel}>
          ↑
        </button>
      </div>
    </div>
  );
}

function newSid(): string { return 's_' + Math.random().toString(36).slice(2, 10); }
