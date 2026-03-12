import { registerNode } from '../node-registry';
import type { NodeComponentProps } from '../node-registry';
import { NodeHeader } from '../components/NodeHeader';
import { PortRow } from '../components/PortRow';

const PORTS = [{ name: 'in', dir: 'in' as const, type: 'any' as const }];

function SaveNodeComponent({ node, onTitleChange, onPortValueChange }: NodeComponentProps) {
  const path = (node.portValues?.path as string) ?? './output';
  const name = (node.portValues?.name as string) ?? 'result_{date}_{time-short}';
  return (
    <>
      <PortRow nodeId={node.id} ports={PORTS} dir="in" />
      <NodeHeader title={node.title} nodeId={node.id} onTitleChange={onTitleChange} />
      <div className="ng-input-node-body" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 9, color: 'var(--text-muted)' }}>Path</label>
        <input className="ng-input-node-field ng-interactive" value={path}
          onChange={e => onPortValueChange?.(node.id, 'path', e.target.value)}
          onMouseDown={e => e.stopPropagation()} />
        <label style={{ fontSize: 9, color: 'var(--text-muted)' }}>Filename</label>
        <input className="ng-input-node-field ng-interactive" value={name}
          onChange={e => onPortValueChange?.(node.id, 'name', e.target.value)}
          onMouseDown={e => e.stopPropagation()} />
      </div>
    </>
  );
}

registerNode('save', {
  label: 'Save', category: 'General', result: true, ports: PORTS,
  defaultConfig: {
    title: 'Save', status: 'pending',
    portValues: { path: './output', name: 'result_{date}_{time-short}' },
    menuTag: { en: 'File', ko: '파일' },
    description: { en: 'Save output to file with template naming', ko: '템플릿 이름으로 파일 저장' },
  },
  component: SaveNodeComponent,
});
