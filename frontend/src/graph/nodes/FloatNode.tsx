import { registerNode } from '../node-registry';
import type { NodeComponentProps } from '../node-registry';
import { PortRow } from '../components/PortRow';

const PORTS = [{ name: 'out', dir: 'out' as const, type: 'float' as const }];

function FloatNodeComponent({ node, onPortValueChange }: NodeComponentProps) {
  const val = (node.portValues?.out as number) ?? 0;
  return (
    <>
      <div className="ng-node-header"><span className="ng-node-title">{node.title}</span></div>
      <div className="ng-input-node-body">
        <input type="number" step="any" className="ng-input-node-field ng-interactive"
          value={val} onChange={e => onPortValueChange?.(node.id, 'out', parseFloat(e.target.value) || 0)}
          onMouseDown={e => e.stopPropagation()} />
      </div>
      <PortRow nodeId={node.id} ports={PORTS} dir="out" />
    </>
  );
}

registerNode('float', {
  label: 'Float', category: 'Input', dataOnly: true, ports: PORTS,
  defaultConfig: {
    title: 'Float', status: 'completed', portValues: { out: 0.0 },
    menuTag: { en: 'Number', ko: '숫자' },
    description: { en: 'Floating point number input', ko: '실수 입력값' },
  },
  component: FloatNodeComponent,
});
