// ============================================
// AI 对话页：流式 SSE + 多模型切换 + 上下文注入（自选/行情/快讯）
// ============================================

import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../store/useSettings';
import { useRouter } from '../router/useRouter';
import { api } from '../api/client';
import { AIChatMessage } from '../../local-shared/types';
import { escapeHtml } from '../../local-shared/utils';

const STORAGE_KEY = 'stockext.ai.history.v1';

function loadHistory(): { id: string; messages: AIChatMessage[]; title: string }[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as Session[];
    // 清理空会话（无消息的），只保留有内容的
    return raw.filter((s) => s.messages && s.messages.length > 0);
  } catch { return []; }
}
function saveHistory(list: any[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* empty */ }
}

type Session = { id: string; messages: AIChatMessage[]; title: string };

export default function AIChatPage() {
  const { settings, activeAIModel } = useSettings();
  const { navigate } = useRouter();
  const [sessions, setSessions] = useState<Session[]>(() => loadHistory());
  const [sid, setSid] = useState<string>(() => {
    const hist = loadHistory();
    return hist[0]?.id || newSid();
  });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [assistantDraft, setAssistantDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef('');

  // 不再自动创建空会话 — 只有发消息时才创建
  const session = sessions.find((s) => s.id === sid);
  const currentMessages = session?.messages || [];

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

  function updateSessionMessages(messages: AIChatMessage[]) {
    const title = messages.find((m) => m.role === 'user')?.content.slice(0, 16) || '新对话';
    setSessions((list) => {
      // 如果会话不存在，创建新会话
      if (!list.find((s) => s.id === sid)) {
        return [...list, { id: sid, messages, title }];
      }
      return list.map((s) => s.id === sid ? { ...s, messages, title } : s);
    });
  }

  async function send() {
    const content = input.trim();
    if (!content) return;
    if (!activeAIModel) { alert('请先在【我的】→【AI 模型管理】中添加并启用一个模型'); navigate('/settings'); return; }
    setInput(''); setAssistantDraft(''); draftRef.current = '';
    const msgs: AIChatMessage[] = [...currentMessages, { role: 'user', content }];
    updateSessionMessages(msgs);
    setSending(true);
    try {
      // 截断历史消息到最大轮数（每轮 = user+assistant = 2 条）
      const maxTurns = settings.maxVisibleTurns ?? 30;
      const maxMsgs = maxTurns * 2;
      const truncated = msgs.length > maxMsgs ? msgs.slice(-maxMsgs) : msgs;
      const full = await api.chatStream({
        baseURL: activeAIModel.baseURL,
        apiKey: activeAIModel.apiKey,
        model: activeAIModel.model,
        temperature: activeAIModel.temperature ?? 0.7,
        messages: [
          { role: 'system', content: '你是 StockAI，一个 A 股行情分析助手。回答简洁，不要提供具体投资建议，使用中文。' },
          ...truncated,
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

  // ========= 快捷 Chips：预设问题直接填入输入框 =========
  function fillPrompt(text: string) {
    setInput(text);
    setTimeout(scrollToBottom, 0);
  }

  const [drawerOpen, setDrawerOpen] = useState(false);
  const currentTitle = session?.title || '新对话';

  return (
    <div className="page ai-page">
      {/* AI 顶栏：菜单 + 当前标题 + 新建 */}
      <div className="ai-topbar">
        <button className="ai-tb-btn" onClick={() => setDrawerOpen(true)} title="历史会话" aria-label="历史会话">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <div className="ai-tb-title" title={currentTitle}>{escapeHtml(currentTitle)}</div>
        <button className="ai-tb-btn" onClick={newChat} title="新对话" aria-label="新对话">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* 模型指示条 */}
      <div className="chat-hint">
        {activeAIModel
          ? <><span className="dot-online" /> {activeAIModel.name || activeAIModel.provider} · {activeAIModel.model}</>
          : <span className="text-up">⚠ 尚未配置 AI 模型，点击 我的 → AI 模型管理 添加</span>
        }
      </div>

      <div className="chat-container" ref={scrollRef}>
        {currentMessages.length === 0 && (
          <div className="ai-welcome">
            <div className="ai-welcome-logo">✨</div>
            <div className="ai-welcome-title">你好，我是 StockAI</div>
            <div className="ai-welcome-sub">A 股行情分析助手，可解答选股、概念、走势等问题</div>
            <div className="ai-welcome-tips">
              <div className="ai-tip" onClick={() => fillPrompt('结合当前市场环境，给我一份稳健的选股策略和重点关注方向。')}>🎯 选股策略</div>
              <div className="ai-tip" onClick={() => fillPrompt('用通俗的语言解释 A 股常用术语：换手率、市盈率、主力资金、龙虎榜。')}>📚 概念科普</div>
              <div className="ai-tip" onClick={() => fillPrompt('根据今日盘面特征，预判明日大盘走势和需要关注的关键信号。')}>🔮 明日预判</div>
              <div className="ai-tip" onClick={() => fillPrompt('如何判断我的持仓是否健康？给出诊断维度和优化建议。')}>💼 持仓诊断</div>
            </div>
          </div>
        )}
        {currentMessages.map((m, i) => (
          <div key={i} className={'msg ' + m.role}>{m.content}</div>
        ))}
        {sending && assistantDraft && (
          <div className="msg assistant">{assistantDraft}<span style={{ opacity: .5 }}>▋</span></div>
        )}
      </div>

      {/* AI 快捷 Chips */}
      <div className="ai-tools-row">
        <button className="ai-chip" onClick={() => fillPrompt('结合当前市场环境，给我一份稳健的选股策略和重点关注方向。')}>🎯 选股策略</button>
        <button className="ai-chip" onClick={() => fillPrompt('用通俗的语言解释 A 股常用术语：换手率、市盈率、主力资金、龙虎榜。')}>📚 概念科普</button>
        <button className="ai-chip" onClick={() => fillPrompt('根据今日盘面特征，预判明日大盘走势和需要关注的关键信号。')}>🔮 明日预判</button>
        <button className="ai-chip" onClick={() => fillPrompt('如何判断我的持仓是否健康？给出诊断维度和优化建议。')}>💼 持仓诊断</button>
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

      {/* 历史会话抽屉 */}
      {drawerOpen && (
        <div className="ai-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="ai-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="ai-drawer-head">
              <b>历史会话</b>
              <div className="ai-drawer-actions">
                <button className="ai-drawer-act" onClick={newChat}>+ 新建</button>
                {sessions.length > 0 && (
                  <button className="ai-drawer-act danger" onClick={() => {
                    if (confirm('清空所有 AI 对话记录？')) { setSessions([]); newChat(); setDrawerOpen(false); }
                  }}>清空</button>
                )}
                <button className="ai-drawer-act" onClick={() => setDrawerOpen(false)}>✕</button>
              </div>
            </div>
            <div className="ai-drawer-body">
              {sessions.length === 0 && (
                <div className="ai-drawer-empty">暂无历史会话<br />点击「+ 新建」开始对话</div>
              )}
              {[...sessions].reverse().map((s) => (
                <button
                  key={s.id}
                  className={'ai-session-item' + (s.id === sid ? ' active' : '')}
                  onClick={() => { setSid(s.id); setDrawerOpen(false); }}
                >
                  <div className="ai-si-title">{escapeHtml(s.title).slice(0, 24) || '新对话'}</div>
                  <div className="ai-si-meta">{s.messages?.length || 0} 条消息</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function newSid(): string { return 's_' + Math.random().toString(36).slice(2, 10); }
