import { registerNode } from '../node-registry';
import type { NodeComponentProps } from '../node-registry';
import { PortRow } from '../components/PortRow';

const PORTS = [{ name: 'out', dir: 'out' as const, type: 'data' as const }];

function DataNodeComponent({ node, onPortValueChange }: NodeComponentProps) {
  const val = node.portValues?.out as { name?: string; size?: number } | null;
  return (
    <>
      <div className="ng-node-header"><span className="ng-node-title">{node.title}</span></div>
      <div className="ng-input-node-body">
        <input type="file" className="ng-interactive"
          accept=".csv,.xml,.json,.txt,.pdf,.doc,.docx,.xlsx,.xls"
          style={{ fontSize: 10, width: '100%' }}
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) onPortValueChange?.(node.id, 'out', { name: file.name, size: file.size });
          }}
          onMouseDown={e => e.stopPropagation()} />
        {val?.name && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            {val.name} {val.size ? `(${(val.size / 1024).toFixed(1)}KB)` : ''}
          </div>
        )}
      </div>
      <PortRow nodeId={node.id} ports={PORTS} dir="out" />
    </>
  );
}

registerNode('data', {
  label: 'Data', category: 'Data', dataOnly: true, ports: PORTS,
  defaultConfig: {
    title: 'Data', status: 'completed', portValues: { out: null },
    menuTag: { en: 'Data', ko: '데이터' },
    description: { en: 'Load data file (CSV, JSON, PDF, etc.)', ko: '데이터 파일 로드' },
  },
  component: DataNodeComponent,
});
