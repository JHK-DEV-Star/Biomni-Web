import { registerNode } from '../node-registry';
import type { NodeComponentProps } from '../node-registry';
import { NodeHeader } from '../components/NodeHeader';
import { PortRow } from '../components/PortRow';
import { ProgressBar } from '../components/ProgressBar';

const PORTS = [
  { name: 'in', dir: 'in' as const, type: 'any' as const },
  { name: 'out', dir: 'out' as const, type: 'any' as const },
];

function VisualizeNodeComponent({ node, onTitleChange }: NodeComponentProps) {
  const isImage = node.resultText && (node.resultText.startsWith('data:') || node.resultText.startsWith('http'));
  return (
    <>
      <PortRow nodeId={node.id} ports={PORTS} dir="in" />
      <NodeHeader title={node.title} nodeId={node.id} onTitleChange={onTitleChange} />
      {node.resultText && (
        <div className="ng-node-body" style={{ maxHeight: 160, overflowY: 'auto' }}>
          {isImage ? (
            <img src={node.resultText} alt="result" style={{ width: '100%', borderRadius: 4 }} />
          ) : (
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 10 }}>{node.resultText}</pre>
          )}
        </div>
      )}
      <ProgressBar />
      <PortRow nodeId={node.id} ports={PORTS} dir="out" />
    </>
  );
}

registerNode('visualize', {
  label: 'Visualize', category: 'General', result: true, ports: PORTS,
  defaultConfig: {
    title: 'Visualize', status: 'pending',
    menuTag: { en: 'Chart', ko: '차트' },
    description: { en: 'Display chart or image results inline', ko: '차트/이미지 결과 인라인 표시' },
  },
  component: VisualizeNodeComponent,
});
