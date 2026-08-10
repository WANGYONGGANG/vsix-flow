// ============================================
// 模拟交易面板
// ============================================

import { useState } from 'react';
import { useSimTrade } from '../store/useSimTrade';
import { fmtYi } from '../../local-shared/utils';

const SIM_FEATURES = [
  { id: 'buy', icon: '🔴', label: '模拟买入' },
  { id: 'sell', icon: '🔵', label: '模拟卖出' },
  { id: 'cancel', icon: '❌', label: '撤单' },
  { id: 'holdings', icon: '📂', label: '持仓' },
  { id: 'filled', icon: '✅', label: '成交' },
  { id: 'reset', icon: '🔄', label: '重置' },
  { id: 'rule', icon: '📜', label: '规则' },
  { id: 'rank', icon: '📊', label: '排行' },
  { id: 'analysis', icon: '📈', label: '账户分析' },
  { id: 'more', icon: '⋮', label: '更多' },
];

const RULES = [
  '1. 初始模拟资金 10 万元，重置后恢复。',
  '2. 买入时冻结资金，卖出时冻结持仓。',
  '3. 委托可手动撤单或手动成交。',
  '4. 成交后买入进入持仓，卖出增加资金。',
  '5. 数据仅保存在本地浏览器，换设备不同步。',
];

export default function TradePanel() {
  const { balance, holdings, orders, placeOrder, cancelOrder, fillOrder, clearSimData } = useSimTrade();
  const [modal, setModal] = useState<{ open: boolean; type: 'buy' | 'sell' } | null>(null);
  const [panel, setPanel] = useState<'orders' | 'holdings' | 'filled' | 'analysis' | 'rule' | null>(null);
  const [code, setCode] = useState('sh000001');
  const [name, setName] = useState('上证指数');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('100');
  const [toast, setToast] = useState('');

  const marketValue = holdings.reduce((sum, h) => sum + h.amount * h.cost, 0);
  const totalAsset = balance + marketValue;

  function submit() {
    const p = Number(price);
    const a = Number(amount);
    if (!p || !a) { setToast('请输入价格和数量'); setTimeout(() => setToast(''), 1500); return; }
    const ok = placeOrder(modal?.type || 'buy', code, name, p, a);
    setToast(ok ? '模拟委托已提交' : '委托失败：资金或持仓不足');
    setTimeout(() => setToast(''), 2000);
    if (ok) setModal(null);
  }

  function onFeature(id: string) {
    if (id === 'buy') { setModal({ open: true, type: 'buy' }); setPrice(''); }
    else if (id === 'sell') { setModal({ open: true, type: 'sell' }); setPrice(''); }
    else if (id === 'cancel') setPanel('orders');
    else if (id === 'holdings') setPanel('holdings');
    else if (id === 'filled') setPanel('filled');
    else if (id === 'analysis') setPanel('analysis');
    else if (id === 'rule') setPanel('rule');
    else if (id === 'reset') { if (confirm('确定重置模拟账户？')) { clearSimData(); setToast('已重置'); setTimeout(() => setToast(''), 1500); } }
    else setToast('功能占位');
  }

  const filledOrders = orders.filter((o) => o.status === 'filled');
  const pendingOrders = orders.filter((o) => o.status === 'pending');

  return (
    <div className="trade-page content-scroll">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>模拟交易</div>
        <div style={{ fontSize: 12, color: 'var(--fg-dim)' }}>本地账户 · 虚拟资金</div>
      </div>

      <div className="market-summary-grid" style={{ padding: '10px 14px', background: 'var(--card)', marginBottom: 8 }}>
        <div className="market-summary-item">
          <div className="lbl">总资产</div>
          <div className="val text-up">{fmtYi(totalAsset)}</div>
        </div>
        <div className="market-summary-item">
          <div className="lbl">可用资金</div>
          <div className="val">{fmtYi(balance)}</div>
        </div>
        <div className="market-summary-item">
          <div className="lbl">持仓市值</div>
          <div className="val">{fmtYi(marketValue)}</div>
        </div>
      </div>

      <div className="trade-main-btns">
        <button onClick={() => onFeature('buy')}><span className="big" style={{ color: 'var(--up)' }}>买</span>模拟买入</button>
        <button onClick={() => onFeature('sell')}><span className="big" style={{ color: '#4a6cf7' }}>卖</span>模拟卖出</button>
        <button onClick={() => onFeature('cancel')}><span className="big" style={{ color: '#4a90e2' }}>撤</span>撤单</button>
        <button onClick={() => onFeature('analysis')}><span className="big" style={{ color: '#9b59b6' }}>析</span>账户分析</button>
      </div>

      <div className="trade-feature-grid">
        {SIM_FEATURES.map((f) => (
          <button key={f.id} className="item" onClick={() => onFeature(f.id)}>
            <span className="ic">{f.icon}</span>
            <span>{f.label}</span>
          </button>
        ))}
      </div>

      <div className="trade-cards-grid">
        <button className="trade-card" style={{ textAlign: 'left' }} onClick={() => onFeature('holdings')}>
          <div className="tit">📂 持仓概览</div>
          <div className="sub">{holdings.length} 只持仓 · 市值 {fmtYi(marketValue)}</div>
        </button>
        <button className="trade-card" style={{ textAlign: 'left' }} onClick={() => onFeature('orders')}>
          <div className="tit">📋 当日委托</div>
          <div className="sub">{pendingOrders.length} 笔委托中 · {filledOrders.length} 笔已成交</div>
        </button>
      </div>

      <div className="trade-section-title">我的持仓</div>
      {holdings.map((h) => (
        <div key={h.code} className="order-row">
          <div>
            <div style={{ fontWeight: 600 }}>{h.name}</div>
            <div className="text-muted" style={{ fontSize: 11 }}>{h.code} · 成本 {h.cost.toFixed(2)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div>{h.amount} 股</div>
            <div className="text-muted" style={{ fontSize: 11 }}>市值 {fmtYi(h.amount * h.cost)}</div>
          </div>
        </div>
      ))}
      {!holdings.length && <div className="loading">暂无持仓</div>}

      <div className="trade-section-title">当日委托</div>
      {orders.slice().reverse().map((o) => (
        <div key={o.id} className="order-row">
          <div>
            <span className={'tag ' + (o.type === 'buy' ? 'tag-buy' : 'tag-sell')}>
              {o.type === 'buy' ? '买' : '卖'}
            </span>
            <span style={{ marginLeft: 6, fontWeight: 600 }}>{o.name}</span>
            <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
              {o.code} · {o.price.toFixed(2)} × {o.amount} · {o.status === 'pending' ? '委托中' : o.status === 'filled' ? '已成' : '已撤'}
            </div>
          </div>
          <div className="acts">
            {o.status === 'pending' && (
              <>
                <button onClick={() => { cancelOrder(o.id); setToast('已撤单'); }}>撤单</button>
                <button onClick={() => { fillOrder(o.id); setToast('已模拟成交'); }}>成交</button>
              </>
            )}
          </div>
        </div>
      ))}
      {!orders.length && <div className="loading">暂无委托</div>}

      {modal?.open && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: modal.type === 'buy' ? 'var(--up)' : '#4a6cf7' }}>
              模拟{modal.type === 'buy' ? '买入' : '卖出'}
            </div>
            <div className="field"><label>代码</label><input value={code} onChange={(e) => setCode(e.target.value)} /></div>
            <div className="field"><label>名称</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="field"><label>价格</label><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            <div className="field"><label>数量</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div className="actions">
              <button className="ghost" onClick={() => setModal(null)}>取消</button>
              <button className="primary" onClick={submit}>确认{modal.type === 'buy' ? '买入' : '卖出'}</button>
            </div>
          </div>
        </div>
      )}

      {panel === 'orders' && (
        <div className="modal-overlay" onClick={() => setPanel(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>当日委托</div>
            {orders.slice().reverse().map((o) => (
              <div key={o.id} className="order-row">
                <div>
                  <span className={'tag ' + (o.type === 'buy' ? 'tag-buy' : 'tag-sell')}>{o.type === 'buy' ? '买' : '卖'}</span>
                  <span style={{ marginLeft: 6, fontWeight: 600 }}>{o.name}</span>
                  <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>{o.code} · {o.price.toFixed(2)}×{o.amount} · {o.status === 'pending' ? '委托中' : o.status === 'filled' ? '已成' : '已撤'}</div>
                </div>
                {o.status === 'pending' && (
                  <div className="acts">
                    <button onClick={() => { cancelOrder(o.id); setToast('已撤单'); }}>撤单</button>
                    <button onClick={() => { fillOrder(o.id); setToast('已模拟成交'); }}>成交</button>
                  </div>
                )}
              </div>
            ))}
            {!orders.length && <div className="loading">暂无委托</div>}
            <div className="actions" style={{ marginTop: 12 }}>
              <button className="ghost" onClick={() => setPanel(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {panel === 'holdings' && (
        <div className="modal-overlay" onClick={() => setPanel(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>持仓明细</div>
            {holdings.map((h) => (
              <div key={h.code} className="order-row">
                <div><div style={{ fontWeight: 600 }}>{h.name}</div><div className="text-muted" style={{ fontSize: 11 }}>{h.code} · 成本 {h.cost.toFixed(2)}</div></div>
                <div style={{ textAlign: 'right' }}><div>{h.amount} 股</div><div className="text-muted" style={{ fontSize: 11 }}>{fmtYi(h.amount * h.cost)}</div></div>
              </div>
            ))}
            {!holdings.length && <div className="loading">暂无持仓</div>}
            <div className="actions" style={{ marginTop: 12 }}>
              <button className="ghost" onClick={() => setPanel(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {panel === 'filled' && (
        <div className="modal-overlay" onClick={() => setPanel(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>历史成交</div>
            {filledOrders.slice().reverse().map((o) => (
              <div key={o.id} className="order-row">
                <span className={'tag ' + (o.type === 'buy' ? 'tag-buy' : 'tag-sell')}>{o.type === 'buy' ? '买' : '卖'}</span>
                <span>{o.name} {o.price.toFixed(2)}×{o.amount}</span>
                <span className="text-muted">{new Date(o.time).toLocaleString()}</span>
              </div>
            ))}
            {!filledOrders.length && <div className="loading">暂无成交</div>}
            <div className="actions" style={{ marginTop: 12 }}>
              <button className="ghost" onClick={() => setPanel(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {panel === 'analysis' && (
        <div className="modal-overlay" onClick={() => setPanel(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>模拟账户分析</div>
            <div className="market-summary-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="market-summary-item"><div className="lbl">总资产</div><div className="val text-up">{fmtYi(totalAsset)}</div></div>
              <div className="market-summary-item"><div className="lbl">可用资金</div><div className="val">{fmtYi(balance)}</div></div>
              <div className="market-summary-item"><div className="lbl">持仓市值</div><div className="val">{fmtYi(marketValue)}</div></div>
              <div className="market-summary-item"><div className="lbl">持仓数量</div><div className="val">{holdings.length} 只</div></div>
              <div className="market-summary-item"><div className="lbl">当日委托</div><div className="val">{orders.length} 笔</div></div>
              <div className="market-summary-item"><div className="lbl">已成交</div><div className="val">{filledOrders.length} 笔</div></div>
            </div>
            <div className="actions" style={{ marginTop: 12 }}>
              <button className="ghost" onClick={() => setPanel(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {panel === 'rule' && (
        <div className="modal-overlay" onClick={() => setPanel(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>模拟交易规则</div>
            {RULES.map((r, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6, marginBottom: 8 }}>{r}</div>
            ))}
            <div className="actions" style={{ marginTop: 12 }}>
              <button className="ghost" onClick={() => setPanel(null)}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,.8)', color: '#fff', padding: '10px 18px', borderRadius: 6, zIndex: 300, fontSize: 13 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
