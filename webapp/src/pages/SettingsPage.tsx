// ============================================
// 我的：交易 + 设置
// ============================================

import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../store/useSettings';
import { useRouter } from '../router/useRouter';
import TradePanel from '../components/TradePanel';

const THEME_OPTIONS: { value: string; name: string; icon: string }[] = [
  { value: 'classic', name: '经典', icon: '🎨' },
  { value: 'dark', name: '暗色', icon: '🌙' },
  { value: 'light', name: '亮色', icon: '☀️' },
  { value: 'system', name: '跟随系统', icon: '🖥️' },
];

const VOICE_OPTIONS: { value: string; name: string; desc: string }[] = [
  { value: 'system', name: '跟随系统', desc: '使用系统默认语音' },
  { value: 'zh-CN-XiaoxiaoNeural', name: '晓晓', desc: '女 · 温婉' },
  { value: 'zh-CN-XiaoyiNeural', name: '晓伊', desc: '女 · 温柔' },
  { value: 'zh-CN-XiaochenNeural', name: '晓辰', desc: '女 · 清新' },
  { value: 'zh-CN-XiaohanNeural', name: '晓涵', desc: '女 · 知性' },
  { value: 'zh-CN-XiaomengNeural', name: '晓梦', desc: '女 · 梦幻' },
  { value: 'zh-CN-XiaomoNeural', name: '晓墨', desc: '女 · 沉稳' },
  { value: 'zh-CN-XiaoshuangNeural', name: '晓双', desc: '女 · 儿童' },
  { value: 'zh-CN-YunjianNeural', name: '云健', desc: '男 · 浑厚' },
  { value: 'zh-CN-YunxiNeural', name: '云希', desc: '男 · 年轻' },
  { value: 'zh-CN-YunyangNeural', name: '云扬', desc: '男 · 新闻' },
  { value: 'zh-CN-YunfengNeural', name: '云枫', desc: '男 · 成熟' },
];

export default function SettingsPage() {
  const s = useSettings();
  const { settings, update,
    deleteAIModel, setActiveAIModel, activeAIModel,
    exportJSON, importJSON } = s;
  const { navigate } = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [voicePickerOpen, setVoicePickerOpen] = useState(false);
  const [tab, setTab] = useState<'trade' | 'settings'>('trade');

  useEffect(() => {
    const opacity = (settings as any).opacity ?? 1;
    document.documentElement.style.setProperty('--panel-opacity', String(opacity));
    document.body.style.opacity = String(opacity);
    const app = document.getElementById('app');
    if (app) app.style.opacity = String(opacity);
  }, [(settings as any).opacity]);

  const handleImport = async (f: File) => {
    const ok = await importJSON(f);
    setMsg(ok ? '✅ 导入成功' : '❌ 导入失败（文件格式不正确）');
    setTimeout(() => setMsg(''), 2000);
  };

  return (
    <div className="page">
      <div className="home-main-tabs">
        <button className={'hmt-btn' + (tab === 'trade' ? ' active' : '')} onClick={() => setTab('trade')}>交易</button>
        <button className={'hmt-btn' + (tab === 'settings' ? ' active' : '')} onClick={() => setTab('settings')}>设置</button>
      </div>

      {tab === 'trade' && <TradePanel />}

      {tab === 'settings' && (
        <div className="content-scroll" style={{ padding: 0 }}>
          <div style={{ fontSize: 12, letterSpacing: .5, textTransform: 'uppercase', opacity: .55, padding: '16px 16px 6px' }}>界面</div>

          <div className="form-item">
            <div className="lbl">主题</div>
            <div className="val">
              <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                {THEME_OPTIONS.map((t) => (
                  <button key={t.value} className={'pill' + (settings.theme === t.value ? ' on' : '')} onClick={() => update({ theme: t.value as any })}>{t.icon} {t.name}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="form-item">
            <div className="lbl">上涨颜色</div>
            <div className="val">
              <div className="flex items-center gap-2">
                <input type="color" value={settings.riseColor}
                  onChange={(e) => update({ riseColor: e.target.value })}
                  style={{ width: 42, height: 32, border: 0, borderRadius: 6, background: 'transparent' }} />
                <span style={{ color: settings.riseColor, fontWeight: 600 }}>+2.35%</span>
              </div>
            </div>
          </div>
          <div className="form-item">
            <div className="lbl">下跌颜色</div>
            <div className="val">
              <div className="flex items-center gap-2">
                <input type="color" value={settings.fallColor}
                  onChange={(e) => update({ fallColor: e.target.value })}
                  style={{ width: 42, height: 32, border: 0, borderRadius: 6, background: 'transparent' }} />
                <span style={{ color: settings.fallColor, fontWeight: 600 }}>-1.85%</span>
              </div>
            </div>
          </div>
          <div className="form-item">
            <div className="lbl">轮询间隔(秒)</div>
            <div className="val">
              <input type="number" min={3} max={60}
                value={Math.round(settings.pollIntervalMs / 1000)}
                onChange={(e) => update({ pollIntervalMs: Math.max(3000, Number(e.target.value || 5) * 1000) })} />
            </div>
          </div>
          <div className="form-item">
            <div className="lbl">只在 A 股时段轮询</div>
            <div className="val flex jcsb items-center">
              <div className={'switch' + (settings.pollOnlyDuringAStockHours ? ' on' : '')}
                onClick={() => update({ pollOnlyDuringAStockHours: !settings.pollOnlyDuringAStockHours })} />
            </div>
          </div>
          <div className="form-item">
            <div className="lbl">语音播报</div>
            <div className="val flex jcsb items-center">
              <div className={'switch' + (settings.voiceBroadcast ? ' on' : '')}
                onClick={() => update({ voiceBroadcast: !settings.voiceBroadcast })} />
            </div>
          </div>
          <div className="form-item">
            <div className="lbl">语音音色</div>
            <div className="val flex items-center gap-2">
              <button className="ghost-btn" style={{ width: 'auto', margin: 0, padding: '8px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => setVoicePickerOpen(true)}>
                <span>{(VOICE_OPTIONS.find((v) => v.value === (settings.voicePreset ?? 'system')) || VOICE_OPTIONS[0]).name}</span>
                <span style={{ fontSize: 10, opacity: .5 }}>▾</span>
              </button>
              <button className="ghost-btn" style={{ width: 'auto', margin: 0, padding: '6px 14px', fontSize: 12 }}
                onClick={() => {
                  try {
                    const u = new SpeechSynthesisUtterance('这是语音播报试听示例，当前A股市场行情播报中。');
                    u.lang = 'zh-CN'; u.rate = 1.05;
                    const preset = settings.voicePreset;
                    if (preset && preset !== 'system') {
                      const voices = window.speechSynthesis.getVoices();
                      const v = voices.find((x) => x.name?.includes(preset.replace('Neural', '')));
                      if (v) u.voice = v;
                    }
                    window.speechSynthesis.cancel();
                    window.speechSynthesis.speak(u);
                  } catch { }
                }}>试听</button>
            </div>
          </div>
          <div className="form-item">
            <div className="lbl">面板透明度</div>
            <div className="val">
              <div className="flex items-center gap-2">
                <input type="range" min={0.1} max={1} step={0.1}
                  value={(settings as any).opacity ?? 1}
                  onChange={(e) => update({ opacity: Number(e.target.value) } as any)}
                  style={{ flex: 1 }} />
                <span style={{ fontSize: 13, opacity: .7, minWidth: 36, textAlign: 'right' }}>{((settings as any).opacity ?? 1).toFixed(1)}</span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12, letterSpacing: .5, textTransform: 'uppercase', opacity: .55, padding: '16px 16px 6px' }}>AI 模型</div>
          <div className="form-item" style={{ flexDirection: 'column', alignItems: 'stretch', display: 'block' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ fontSize: 13, color: '#ddd' }}>已配置 {settings.aiModels.length} 个模型</div>
              <button className="ghost-btn" style={{ margin: 0, width: 'auto', padding: '6px 14px' }}
                onClick={() => navigate('/settings/model')}>＋ 新增模型</button>
            </div>
          </div>

          {settings.aiModels.length === 0 && (
            <div className="card" style={{ margin: '0 14px 14px' }}>
              <div style={{ fontSize: 13, opacity: .7, lineHeight: 1.6 }}>
                还没有 AI 模型。<br />
                点击右上角「＋ 新增模型」，填入兼容 OpenAI 协议的任意服务。
              </div>
            </div>
          )}

          <div style={{ padding: '0 14px 14px' }}>
            {settings.aiModels.map((m) => (
              <div key={m.id} className={'model-card' + (activeAIModel?.id === m.id ? ' active' : '')}>
                <div className="mc-hdr">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="mc-name">{escape(m.name || m.provider || m.id)}</div>
                    <div className="mc-meta">供应商：{escape(m.provider || '-')} · 模型：{escape(m.model)}</div>
                    <div className="mc-meta" style={{ marginTop: 2, wordBreak: 'break-all' }}>API：{escape(m.baseURL)}</div>
                  </div>
                  <div className={'switch' + (activeAIModel?.id === m.id ? ' on' : '')}
                    onClick={() => setActiveAIModel(activeAIModel?.id === m.id ? null : m.id)} />
                </div>
                <div className="mc-actions">
                  <button className="use" onClick={() => setActiveAIModel(m.id)}>{activeAIModel?.id === m.id ? '✓ 正在使用' : '使用此模型'}</button>
                  <button className="edit" onClick={() => navigate(`/settings/model/${m.id}`)}>编辑</button>
                  <button className="del" onClick={() => { if (confirm(`删除模型「${m.name || m.provider}」？`)) deleteAIModel(m.id); }}>删除</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, letterSpacing: .5, textTransform: 'uppercase', opacity: .55, padding: '4px 16px 6px' }}>数据</div>
          <div className="form-item" style={{ flexDirection: 'column', alignItems: 'stretch', display: 'block' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="ghost-btn" style={{ flex: 1, margin: 0 }} onClick={exportJSON}>导出配置</button>
              <button className="ghost-btn" style={{ flex: 1, margin: 0 }} onClick={() => fileRef.current?.click()}>导入配置</button>
              <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); }} />
            </div>
            {msg && <div style={{ marginTop: 8, fontSize: 13 }}>{msg}</div>}
          </div>

          {voicePickerOpen && (
            <div className="overlay" onClick={() => setVoicePickerOpen(false)}>
              <div className="dialog" onClick={(e) => e.stopPropagation()}>
                <div className="dialog-head"><b>选择音色</b><button className="icon-btn" onClick={() => setVoicePickerOpen(false)}>✕</button></div>
                <div className="dialog-body">
                  {VOICE_OPTIONS.map((v) => (
                    <div key={v.value} className="search-row" onClick={() => { update({ voicePreset: v.value }); setVoicePickerOpen(false); }}>
                      <div><b>{v.name}</b><div style={{ fontSize: 12, opacity: .7, marginTop: 2 }}>{v.desc}</div></div>
                      {settings.voicePreset === v.value && <span style={{ color: 'var(--accent)' }}>✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
