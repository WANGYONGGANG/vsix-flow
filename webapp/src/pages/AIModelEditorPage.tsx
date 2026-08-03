// ============================================
// AI 模型编辑 / 新增
// ============================================

import { useMemo, useState } from 'react';
import { useSettings } from '../store/useSettings';
import { useRouter } from '../router/useRouter';
import { AIModelConfig } from '../../local-shared/types';
import { uid } from '../../local-shared/utils';

const PRESETS: { name: string; provider: string; baseURL: string; model: string }[] = [
  { name: 'OpenAI GPT', provider: 'OpenAI', baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { name: 'DeepSeek', provider: '深度求索', baseURL: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { name: '智谱 AI', provider: '智谱', baseURL: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  { name: '火山方舟 / 豆包', provider: '字节', baseURL: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-pro-32k' },
  { name: '硅基流动', provider: '硅基流动', baseURL: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3' },
  { name: 'Ollama (本地)', provider: 'Ollama', baseURL: 'http://127.0.0.1:11434/v1', model: 'qwen2.5:7b' },
];

export default function AIModelEditorPage({ modelId }: { modelId: string | null }) {
  const { navigate } = useRouter();
  const { settings, saveAIModel, deleteAIModel } = useSettings();
  const existing = useMemo<AIModelConfig | undefined>(
    () => settings.aiModels.find((m) => m.id === modelId) || undefined,
    [settings.aiModels, modelId]
  );

  const [name, setName] = useState(existing?.name || '');
  const [provider, setProvider] = useState(existing?.provider || '');
  const [baseURL, setBaseURL] = useState(existing?.baseURL || '');
  const [apiKey, setApiKey] = useState(existing?.apiKey || '');
  const [model, setModel] = useState(existing?.model || '');
  const [temperature, setTemperature] = useState<number>(existing?.temperature ?? 0.7);
  const [msg, setMsg] = useState('');

  const id = existing?.id || uid();

  const save = () => {
    if (!name.trim() || !baseURL.trim() || !apiKey.trim() || !model.trim()) {
      setMsg('❌ 请填写完整：显示名 / API 兼容地址 / API Key / 模型名');
      setTimeout(() => setMsg(''), 2500);
      return;
    }
    saveAIModel({
      id,
      name: name.trim(),
      provider: provider.trim(),
      baseURL: baseURL.trim().replace(/\/$/, ''),
      apiKey: apiKey.trim(),
      model: model.trim(),
      temperature,
      enabled: true,
    });
    setMsg('✅ 已保存');
    setTimeout(() => navigate('/settings'), 600);
  };

  const test = async () => {
    setMsg('测试连接中…');
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseURL, apiKey, model,
          messages: [{ role: 'user', content: '你好，回复一个字' }],
          stream: false, temperature: 0.1,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error('HTTP ' + res.status + ' ' + text.slice(0, 80));
      }
      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content || JSON.stringify(json).slice(0, 50);
      setMsg('✅ 连接成功：' + String(content || '空'));
    } catch (e: any) { setMsg('❌ 失败：' + (e?.message || String(e))); }
    setTimeout(() => setMsg(''), 4000);
  };

  const applyPreset = (p: typeof PRESETS[number]) => {
    setName(p.name); setProvider(p.provider); setBaseURL(p.baseURL); setModel(p.model);
  };

  return (
    <div className="page">
      <div className="content-scroll">
        <button className="back-btn" onClick={() => navigate('/settings')}>← 返回设置</button>

        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>
            {existing ? '编辑 AI 模型' : '新增 AI 模型'}
          </div>

          <div style={{ fontSize: 12, opacity: .6, marginBottom: 10 }}>快速选择：</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {PRESETS.map((p, i) => (
              <button key={i} className="ai-chip" onClick={() => applyPreset(p)}>{p.name}</button>
            ))}
          </div>

          <Field label="显示名" hint="给自己看的，比如：我的 GPT-4o">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="我的 AI" />
          </Field>
          <Field label="供应商" hint="比如 OpenAI / DeepSeek / 智谱 / 其他">
            <input type="text" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="OpenAI" />
          </Field>
          <Field label="API 兼容地址" hint="必须是 /v1 结尾，不要带最后的斜杠">
            <input type="text" value={baseURL} onChange={(e) => setBaseURL(e.target.value)}
              placeholder="https://api.openai.com/v1" />
          </Field>
          <Field label="API Key" hint="只存在你的浏览器本地，不会上传任何服务器（Vercel 只做一次透传）">
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..." autoComplete="off" />
          </Field>
          <Field label="模型名" hint="比如 gpt-4o、deepseek-chat、glm-4、qwen-plus 等">
            <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4o-mini" />
          </Field>
          <Field label={`Temperature (${temperature})`} hint="0=确定，1=放飞">
            <input type="range" min={0} max={1.5} step={0.1} value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }} />
          </Field>

          {msg && <div style={{ padding: '10px 0', color: 'var(--accent)', fontSize: 13 }}>{msg}</div>}

          <button className="primary-btn" onClick={save}>💾 保存模型</button>
          <button className="ghost-btn" onClick={test}>🔌 测试连接（发送一句「你好」）</button>
          {existing && (
            <button className="danger-btn" onClick={() => {
              if (confirm('确定删除此模型？')) { deleteAIModel(existing.id); navigate('/settings'); }
            }}>🗑 删除此模型</button>
          )}
        </div>

        <div className="card" style={{ marginTop: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>💡 兼容协议说明</div>
          <div style={{ fontSize: 12, lineHeight: 1.8, opacity: .8 }}>
            只要目标服务兼容 <code>POST {(baseURL || '<baseURL>').replace(/</g, '&lt;').replace(/>/g, '&gt;')}/chat/completions</code>（OpenAI v1 格式）即可。<br/>
            服务端（Vercel）<b>不会</b>保存你的 key；请求体里携带 baseURL + key，Serverless 函数一次性透传。<br/>
            推荐：DeepSeek/智谱/豆包 API 都原生兼容；本地 Ollama 也能连（通过 /api/ai/chat 代发，免 CORS）
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: '#ddd', marginBottom: 5, display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        {hint && <span style={{ fontSize: 11, opacity: .55, fontWeight: 400 }}>{hint}</span>}
      </div>
      {children}
      <style>{`
        .settings-field input, .settings-field textarea { width: 100%; padding: 10px 12px; border-radius: 8px; background: var(--bg); border: 1px solid var(--border); color: #eee; font-size: 14px; outline: none }
        .settings-field input:focus { border-color: var(--accent) }
      `}</style>
      <div className="settings-field">
        {/* 实际子元素通过 React.Children 自动应用 - 直接包裹 */}
        <div style={{ display: 'contents' }} />
      </div>
    </div>
  );
}
