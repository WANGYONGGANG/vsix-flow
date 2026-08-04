// ============================================
// 设置页：UI 偏好 / AI 模型管理 / 数据导入导出 / 关于
// ============================================

import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../store/useSettings';
import { useRouter } from '../router/useRouter';

export default function SettingsPage() {
  const s = useSettings();
  const { settings, update, addWatch, delWatch, getWatchCodes,
    saveAIModel, deleteAIModel, setActiveAIModel, activeAIModel,
    exportJSON, importJSON } = s;
  const { navigate } = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

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

  const totalCodes = getWatchCodes().length;

  return (
    <div className="page">
      <div className="content-scroll" style={{ padding: 0 }}>
        {/* UI 偏好 */}
        <div style={{ fontSize: 12, letterSpacing: .5, textTransform: 'uppercase', opacity: .55, padding: '16px 16px 6px' }}>界面</div>

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
        <div className="form-item">
          <div className="lbl">隐藏状态栏</div>
          <div className="val flex jcsb items-center">
            <div className={'switch' + ((settings as any).hideStatusBar ? ' on' : '')}
              onClick={() => update({ hideStatusBar: !(settings as any).hideStatusBar } as any)} />
          </div>
        </div>
        <div className="form-item">
          <div className="lbl">隐藏状态栏图标</div>
          <div className="val flex jcsb items-center">
            <div className={'switch' + ((settings as any).hideStatusBarIcon ? ' on' : '')}
              onClick={() => update({ hideStatusBarIcon: !(settings as any).hideStatusBarIcon } as any)} />
          </div>
        </div>

        {/* AI 模型管理 */}
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
              还没有 AI 模型。<br/>
              点击右上角「＋ 新增模型」，填入兼容 OpenAI 协议的任意服务：<br/>
              • 官方 OpenAI (api.openai.com<br/>
              • 第三方：DeepSeek / 智谱 / 豆包 / DeepSeek / 本地 Ollama 等等。
            </div>
          </div>
        )}

        <div style={{ padding: '0 14px 14px' }}>
          {settings.aiModels.map((m) => (
            <div key={m.id} className={'model-card' + (activeAIModel?.id === m.id ? ' active' : '')}>
              <div className="mc-hdr">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mc-name">{escape(m.name || m.provider || m.id)}</div>
                  <div className="mc-meta">
                    供应商：{escape(m.provider || '-')} &nbsp;·&nbsp; 模型：{escape(m.model)}
                  </div>
                  <div className="mc-meta" style={{ marginTop: 2, wordBreak: 'break-all' }}>
                    API：{escape(m.baseURL)}
                  </div>
                </div>
                <div className={'switch' + (activeAIModel?.id === m.id ? ' on' : '')}
                  onClick={() => setActiveAIModel(activeAIModel?.id === m.id ? null : m.id)} />
              </div>
              <div className="mc-actions">
                <button className="use"
                  onClick={() => setActiveAIModel(m.id)}>
                  {activeAIModel?.id === m.id ? '✓ 正在使用' : '使用此模型'}
                </button>
                <button className="edit" onClick={() => navigate(`/settings/model/${m.id}`)}>编辑</button>
                <button className="del" onClick={() => {
                  if (confirm(`删除模型「${m.name || m.provider}」？`)) deleteAIModel(m.id);
                }}>删除</button>
              </div>
            </div>
          ))}
        </div>

      {/* 自选管理 */}
      <div style={{ fontSize: 12, letterSpacing: .5, textTransform: 'uppercase', opacity: .55, padding: '4px 16px 6px' }}>自选股 (共 {totalCodes} 只)</div>

      <div style={{ padding: '0 14px 14px' }}>
        <AddWatchInline onAdd={(c) => { addWatch(c); }} />
        {getWatchCodes().length > 0 && (
          <div className="card" style={{ marginTop: 10, padding: 0, overflow: 'hidden' }}>
            {getWatchCodes().map((c) => (
              <div key={c} className="flex items-center jcsb" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 13, color: '#ddd' }}>{c.toUpperCase()}</div>
              </div>
              <button className="wl-del" onClick={() => delWatch(c)}>删除</button>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* 导入导出 */}
      <div style={{ fontSize: 12, letterSpacing: .5, textTransform: 'uppercase', opacity: .55, padding: '4px 16px 6px' }}>数据</div>

      <div style={{ padding: '0 14px 24px' }}>
        <button className="ghost-btn" onClick={exportJSON}>⬇ 导出配置 / 自选 / AI模型 为 JSON</button>
        <button className="ghost-btn" onClick={() => fileRef.current?.click()}>⬆ 从 JSON 导入</button>
        <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ''; }} />
        <button className="danger-btn" onClick={() => {
          if (confirm('⚠ 确定清空所有本地配置（自选/AI 模型/偏好）？此操作不可撤销！')) {
            localStorage.clear(); location.reload();
          }
        }}>🗑 清空本地数据</button>
        {msg && <div style={{ textAlign: 'center', padding: 12, color: 'var(--accent)', fontSize: 13 }}>{msg}</div>}
      </div>

      {/* 关于 */}
      <div style={{ padding: '4px 14px calc(40px + var(--safe-bottom))', textAlign: 'center', fontSize: 12, opacity: .5, lineHeight: 1.7 }}>
        StockExt · WebApp v1.0<br />
        数据由东方财富/新浪/腾讯公开接口提供 · 仅供学习，不构成投资建议<br/>
      </div>
    </div>
  </div>
  );
}

function AddWatchInline({ onAdd }: { onAdd: (c: string) => void }) {
  const [v, setV] = useState('');
  const add = () => {
    const c = String(v || '').trim().toLowerCase();
    if (!c) return;
    let code = c;
    if (!/^(sh|sz|bj)\d+/.test(c)) {
      if (/^(60|68|90|11|13|50|56|51|58)/.test(c)) code = 'sh' + c;
      else if (/^(00|30|20|12|15|16|18|159)/.test(c)) code = 'sz' + c;
      else if (/^(43|83|87|92|88|8)/.test(c)) code = 'bj' + c;
      else code = 'sh' + c;
    }
    onAdd(code); setV('');
  };
  return (
    <div className="flex gap-2" style={{ marginTop: 6 }}>
      <input type="text" value={v} onChange={(e) => setV(e.target.value)} placeholder="输入代码 600519 / sh600519"
        onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
        style={{ flex: 1, padding: '10px 12px', borderRadius: 8, background: 'var(--card)', border: '1px solid var(--border)', color: '#eee', fontSize: 14, outline: 'none' }} />
      <button className="primary-btn" style={{ width: 'auto', padding: '0 16px', marginTop: 0 }} onClick={add}>添加</button>
    </div>
  );
}

function escape(s: string) {
  return String(s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] || c));
}
