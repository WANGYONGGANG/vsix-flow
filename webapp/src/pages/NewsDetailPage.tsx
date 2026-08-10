// ============================================
// 资讯详情
// ============================================

import { useMemo } from 'react';
import { useRouter } from '../router/useRouter';
import { escapeHtml } from '../../local-shared/utils';

export default function NewsDetailPage() {
  const { path, back } = useRouter();
  const query = useMemo(() => new URLSearchParams(path.split('?')[1] || ''), [path]);
  const title = query.get('title') || '资讯详情';
  const content = query.get('content') || '';
  const source = query.get('source') || '';
  const time = query.get('time') || '';

  return (
    <div className="content-scroll" style={{ padding: 16 }}>
      <h1 style={{ fontSize: 18, lineHeight: 1.5, margin: '0 0 12px' }}>{escapeHtml(title)}</h1>
      <div className="text-muted" style={{ fontSize: 12, marginBottom: 16 }}>
        {source && <span style={{ color: '#4a90e2', marginRight: 10 }}>{escapeHtml(source)}</span>}
        {escapeHtml(time)}
      </div>
      <div style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--fg-2)', whiteSpace: 'pre-wrap' }}>
        {escapeHtml(content) || '暂无正文'}
      </div>
      <button className="ghost-btn" style={{ margin: '24px 0 0', width: 'auto', padding: '8px 18px' }} onClick={() => back()}>返回</button>
    </div>
  );
}
