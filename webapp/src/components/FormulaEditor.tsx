// ============================================
// 公式编辑器组件 - 管理通达信公式指标
// ============================================

import { useState, useCallback } from 'react';
import { Formula, PRESET_FORMULAS, validateFormula } from '../lib/FormulaEngine';

interface FormulaEditorProps {
  formulas: Formula[];
  onChange: (formulas: Formula[]) => void;
  onClose: () => void;
}

export default function FormulaEditor({ formulas, onChange, onClose }: FormulaEditorProps) {
  const [editId, setEditId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'main' | 'sub'>('sub');
  const [error, setError] = useState('');
  const [lineColors, setLineColors] = useState<string[]>(['#36a2eb', '#e8b393', '#cc65fe', '#23c343', '#ff4d4f']);

  const handleSave = useCallback(() => {
    if (!name.trim() || !code.trim()) {
      setError('名称和公式不能为空');
      return;
    }
    
    const validation = validateFormula(code);
    if (!validation.valid) {
      setError(`公式语法错误: ${validation.error}`);
      return;
    }
    
    // 提取输出变量
    const lines = extractOutputLines(code, lineColors);
    
    if (editId) {
      const updated = formulas.map(f =>
        f.id === editId ? { ...f, name, code, type, lines } : f
      );
      onChange(updated);
    } else {
      const newFormula: Formula = {
        id: 'custom_' + Date.now(),
        name,
        code,
        type,
        lines,
        enabled: true,
      };
      onChange([...formulas, newFormula]);
    }
    
    resetForm();
  }, [editId, name, code, type, lineColors, formulas, onChange]);

  function extractOutputLines(code: string, colors: string[]): { label: string; color: string }[] {
    const lines: { label: string; color: string }[] = [];
    const statements = code.split(/[;\n]+/).filter(s => s.trim());
    
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      // 匹配 VAR:=EXPR 或 VAR:EXPR（输出变量）
      const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*:=\s*(.+)$/i) ||
                    trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*:\s*(.+)$/i);
      if (match) {
        // 检查是否是输出（不是赋值）
        if (trimmed.includes(':') && !trimmed.includes(':=')) {
          lines.push({
            label: match[1].toUpperCase(),
            color: colors[lines.length % colors.length],
          });
        } else if (lines.length === 0) {
          // 第一个赋值也作为输出
          lines.push({
            label: match[1].toUpperCase(),
            color: colors[0],
          });
        }
      }
    }
    
    // 至少一个输出
    if (lines.length === 0) {
      lines.push({ label: 'RESULT', color: colors[0] });
    }
    
    return lines;
  }

  function resetForm() {
    setEditId(null);
    setShowAdd(false);
    setName('');
    setCode('');
    setType('sub');
    setError('');
  }

  function handleEdit(f: Formula) {
    setEditId(f.id);
    setName(f.name);
    setCode(f.code);
    setType(f.type);
    setLineColors(f.lines.map(l => l.color));
    setShowAdd(true);
    setError('');
  }

  function handleDelete(id: string) {
    onChange(formulas.filter(f => f.id !== id));
  }

  function handleToggle(id: string) {
    onChange(formulas.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  }

  function handleAddPreset(preset: Formula) {
    const exists = formulas.find(f => f.id === preset.id);
    if (!exists) {
      onChange([...formulas, { ...preset, enabled: true }]);
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <span style={styles.title}>公式指标管理</span>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>
        
        <div style={styles.body}>
          {!showAdd ? (
            <>
              <div style={styles.section}>
                <div style={styles.sectionTitle}>我的公式</div>
                {formulas.length === 0 && (
                  <div style={styles.empty}>暂无自定义公式</div>
                )}
                {formulas.map(f => (
                  <div key={f.id} style={styles.formulaItem}>
                    <div style={styles.formulaInfo}>
                      <span
                        style={{
                          ...styles.enableDot,
                          backgroundColor: f.enabled ? '#23c343' : '#666',
                        }}
                        onClick={() => handleToggle(f.id)}
                      />
                      <span style={styles.formulaName}>{f.name}</span>
                      <span style={styles.formulaType}>{f.type === 'main' ? '主图' : '副图'}</span>
                    </div>
                    <div style={styles.formulaActions}>
                      <button onClick={() => handleEdit(f)} style={styles.actionBtn}>编辑</button>
                      <button onClick={() => handleDelete(f.id)} style={{ ...styles.actionBtn, color: '#ff4d4f' }}>删除</button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={styles.section}>
                <div style={styles.sectionTitle}>预设指标</div>
                {PRESET_FORMULAS.map(p => {
                  const added = formulas.some(f => f.id === p.id);
                  return (
                    <div key={p.id} style={styles.formulaItem}>
                      <div style={styles.formulaInfo}>
                        <span style={styles.formulaName}>{p.name}</span>
                        <span style={styles.formulaType}>{p.type === 'main' ? '主图' : '副图'}</span>
                      </div>
                      <button
                        onClick={() => handleAddPreset(p)}
                        disabled={added}
                        style={{
                          ...styles.actionBtn,
                          opacity: added ? 0.4 : 1,
                        }}
                      >
                        {added ? '已添加' : '添加'}
                      </button>
                    </div>
                  );
                })}
              </div>
              
              <button onClick={() => { resetForm(); setShowAdd(true); }} style={styles.addBtn}>
                + 新建公式
              </button>
            </>
          ) : (
            <div style={styles.editor}>
              <div style={styles.field}>
                <label style={styles.label}>公式名称</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="如：自定义MACD"
                  style={styles.input}
                />
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>图表类型</label>
                <div style={styles.radioGroup}>
                  <label style={styles.radio}>
                    <input
                      type="radio"
                      value="main"
                      checked={type === 'main'}
                      onChange={() => setType('main')}
                    />
                    <span>主图叠加</span>
                  </label>
                  <label style={styles.radio}>
                    <input
                      type="radio"
                      value="sub"
                      checked={type === 'sub'}
                      onChange={() => setType('sub')}
                    />
                    <span>副图指标</span>
                  </label>
                </div>
              </div>
              
              <div style={styles.field}>
                <label style={styles.label}>公式代码</label>
                <textarea
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder={`MID:=MA(CLOSE,20);\nUPPER:=MID+2*STD(CLOSE,20);\nLOWER:=MID-2*STD(CLOSE,20);`}
                  style={styles.textarea}
                  rows={10}
                />
                {error && <div style={styles.error}>{error}</div>}
                <div style={styles.help}>
                  <div style={styles.helpTitle}>支持的函数：</div>
                  <div style={styles.helpContent}>
                    MA, EMA, SMA, DMA, HHV, LLV, SUM, STD, VARP, SLOPE, AVEDEV,
                    IF, IFF, CROSS, CROSSDOWN, ABS, MAX, MIN, REF,
                    COUNT, EVERY, EXIST, HHVBARS, LLVBARS, BARSLAST
                  </div>
                  <div style={styles.helpTitle}>内置变量：</div>
                  <div style={styles.helpContent}>
                    CLOSE(C), OPEN(O), HIGH(H), LOW(L), VOL(V), AMOUNT
                  </div>
                </div>
              </div>
              
              <div style={styles.btnGroup}>
                <button onClick={handleSave} style={styles.saveBtn}>保存</button>
                <button onClick={resetForm} style={styles.cancelBtn}>取消</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#1a1d24',
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #2a2d34',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #2a2d34',
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#999',
    fontSize: 24,
    cursor: 'pointer',
  },
  body: {
    padding: 16,
    overflowY: 'auto',
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#999',
    marginBottom: 10,
    fontWeight: 500,
  },
  empty: {
    fontSize: 12,
    color: '#666',
    padding: '12px 0',
  },
  formulaItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    backgroundColor: '#22252c',
    borderRadius: 8,
    marginBottom: 8,
  },
  formulaInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  enableDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    cursor: 'pointer',
  },
  formulaName: {
    fontSize: 14,
    color: '#fff',
  },
  formulaType: {
    fontSize: 11,
    color: '#666',
    backgroundColor: '#2a2d34',
    padding: '2px 6px',
    borderRadius: 4,
  },
  formulaActions: {
    display: 'flex',
    gap: 8,
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    color: '#36a2eb',
    fontSize: 12,
    cursor: 'pointer',
  },
  addBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#22252c',
    border: '1px dashed #3a3d44',
    borderRadius: 8,
    color: '#999',
    fontSize: 14,
    cursor: 'pointer',
  },
  editor: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: '#999',
  },
  input: {
    padding: '10px 12px',
    backgroundColor: '#22252c',
    border: '1px solid #3a3d44',
    borderRadius: 6,
    color: '#fff',
    fontSize: 14,
    outline: 'none',
  },
  textarea: {
    padding: '10px 12px',
    backgroundColor: '#22252c',
    border: '1px solid #3a3d44',
    borderRadius: 6,
    color: '#fff',
    fontSize: 13,
    fontFamily: 'monospace',
    resize: 'vertical',
    outline: 'none',
    lineHeight: 1.5,
  },
  radioGroup: {
    display: 'flex',
    gap: 20,
  },
  radio: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: '#ccc',
    cursor: 'pointer',
  },
  error: {
    fontSize: 12,
    color: '#ff4d4f',
    marginTop: 4,
  },
  help: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#1a1d24',
    borderRadius: 6,
    fontSize: 11,
  },
  helpTitle: {
    color: '#999',
    marginTop: 6,
    marginBottom: 2,
  },
  helpContent: {
    color: '#666',
    lineHeight: 1.5,
  },
  btnGroup: {
    display: 'flex',
    gap: 12,
  },
  saveBtn: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#36a2eb',
    border: 'none',
    borderRadius: 6,
    color: '#fff',
    fontSize: 14,
    cursor: 'pointer',
  },
  cancelBtn: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#2a2d34',
    border: 'none',
    borderRadius: 6,
    color: '#999',
    fontSize: 14,
    cursor: 'pointer',
  },
};
