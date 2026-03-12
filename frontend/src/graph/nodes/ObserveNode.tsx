import { registerNode } from '../node-registry';
import type { NodeComponentProps } from '../node-registry';
import { NodeHeader } from '../components/NodeHeader';
import { PortRow } from '../components/PortRow';
import { ProgressBar } from '../components/ProgressBar';

const PORTS = [{ name: 'in', dir: 'in' as const, type: 'any' as const }];

function ObserveNodeComponent({ node, onTitleChange }: NodeComponentProps) {
  return (
    <>
      <PortRow nodeId={node.id} ports={PORTS} dir="in" />
      <NodeHeader title={node.title} nodeId={node.id} onTitleChange={onTitleChange} />
      {node.resultText && (
        <div className="ng-node-body" style={{ maxHeight: 120, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
          {node.resultText}
        </div>
      )}
      <ProgressBar />
    </>
  );
}

registerNode('observe', {
  label: 'Observe', category: 'General', result: true, ports: PORTS,
  defaultConfig: {
    title: 'Observe', status: 'pending',
    menuTag: { en: 'Observer', ko: '관찰' },
    description: { en: 'Display output text (terminal node, no output port)', ko: '출력 텍스트 표시 (터미널 노드)' },
  },
  component: ObserveNodeComponent,
});
