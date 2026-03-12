import { registerNode } from '../node-registry';
import type { NodeComponentProps } from '../node-registry';
import { NodeHeader } from '../components/NodeHeader';
import { PortRow } from '../components/PortRow';
import { ProgressBar } from '../components/ProgressBar';

const PORTS = [
  { name: 'in', dir: 'in' as const, type: 'table' as const },
  { name: 'out', dir: 'out' as const, type: 'table' as const },
];

function TableNodeComponent({ node, onTitleChange }: NodeComponentProps) {
  return (
    <>
      <PortRow nodeId={node.id} ports={PORTS} dir="in" />
      <NodeHeader title={node.title} nodeId={node.id} onTitleChange={onTitleChange} />
      {node.resultText && (
        <div className="ng-node-body" style={{ maxHeight: 150, overflowY: 'auto', fontSize: 10 }}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{node.resultText}</pre>
        </div>
      )}
      <ProgressBar />
      <PortRow nodeId={node.id} ports={PORTS} dir="out" />
    </>
  );
}

registerNode('table', {
  label: 'Table', category: 'General', result: true, ports: PORTS,
  defaultConfig: {
    title: 'Table', status: 'pending',
    menuTag: { en: 'Table', ko: '테이블' },
    description: { en: 'Display tabular data', ko: '테이블 데이터 표시' },
  },
  component: TableNodeComponent,
});
