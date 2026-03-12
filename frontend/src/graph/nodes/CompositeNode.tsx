import { registerNode } from '../node-registry';
import type { NodeComponentProps } from '../node-registry';
import { NodeHeader } from '../components/NodeHeader';
import { PortRow } from '../components/PortRow';
import { ProgressBar } from '../components/ProgressBar';

const PORTS = [
  { name: 'image', dir: 'in' as const, type: 'image' as const, label: 'Image' },
  { name: 'prompt', dir: 'in' as const, type: 'string' as const, label: 'Prompt' },
  { name: 'out', dir: 'out' as const, type: 'any' as const },
];

function CompositeNodeComponent({ node, onTitleChange }: NodeComponentProps) {
  return (
    <>
      <PortRow nodeId={node.id} ports={PORTS} dir="in" />
      <NodeHeader title={node.title} nodeId={node.id} onTitleChange={onTitleChange} stepNum={node.stepNum} />
      {node.tool && <div className="ng-node-body">{node.tool}</div>}
      <ProgressBar />
      <PortRow nodeId={node.id} ports={PORTS} dir="out" />
    </>
  );
}

registerNode('composite', {
  label: 'Composite', category: 'General', allowRef: true, ports: PORTS,
  defaultConfig: {
    title: 'Composite', tool: 'view_image', status: 'pending',
    menuTag: { en: 'Vision', ko: '비전' },
    description: { en: 'Multimodal node for image + text processing', ko: '이미지 + 텍스트 멀티모달 처리' },
  },
  component: CompositeNodeComponent,
});
