import { registerNode } from '../node-registry';
import type { NodeComponentProps } from '../node-registry';
import { PortRow } from '../components/PortRow';

const PORTS = [{ name: 'out', dir: 'out' as const, type: 'boolean' as const, label: 'Value' }];

function BooleanNodeComponent({ node, onPortValueChange }: NodeComponentProps) {
  const val = (node.portValues?.out as boolean) ?? false;
  return (
    <>
      <div className="ng-node-header"><span className="ng-node-title">{node.title}</span></div>
      <div className="ng-input-node-body" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" className="ng-interactive" checked={val}
          onChange={e => onPortValueChange?.(node.id, 'out', e.target.checked)}
          onMouseDown={e => e.stopPropagation()} />
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{val ? 'true' : 'false'}</span>
      </div>
      <PortRow nodeId={node.id} ports={PORTS} dir="out" />
    </>
  );
}

registerNode('boolean_value', {
  label: 'Boolean', category: 'Input', dataOnly: true, ports: PORTS,
  defaultConfig: {
    title: 'Boolean', status: 'completed', portValues: { out: false },
    menuTag: { en: 'Toggle', ko: '토글' },
    description: { en: 'Boolean true/false input', ko: '참/거짓 입력' },
  },
  component: BooleanNodeComponent,
});
