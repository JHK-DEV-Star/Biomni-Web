// ============================================
// Analyze Plan Node Type
// ============================================

import { registerNode } from '../node-registry';
import type { NodeComponentProps } from '../node-registry';
import { NodeHeader } from '../components/NodeHeader';
import { PortRow } from '../components/PortRow';
import { ProgressBar } from '../components/ProgressBar';

const PORTS = [
  { name: 'in', dir: 'in' as const, type: 'any' as const },
  { name: 'out', dir: 'out' as const, type: 'any' as const },
];

function AnalyzeNodeComponent({ node, onTitleChange }: NodeComponentProps) {
  return (
    <>
      <PortRow nodeId={node.id} ports={PORTS} dir="in" />
      <NodeHeader
        stepNum={node.stepNum}
        title={node.title}
        nodeId={node.id}
        onTitleChange={onTitleChange}
      />
      <div className="ng-node-body">{node.tool || node.description || '\u00A0'}</div>
      <ProgressBar />
      <PortRow nodeId={node.id} ports={PORTS} dir="out" />
    </>
  );
}

registerNode('analyze', {
  label: 'Analyze Plan',
  category: 'Tool',
  allowRef: true,
  ports: PORTS,
  defaultConfig: {
    title: 'Analyze Plan',
    tool: 'analyze_plan',
    status: 'pending',
    stepNum: '',
    menuTag: { en: 'Analysis', ko: '분석', ja: '分析', zh: '分析' },
    description: {
      en: 'Analyze execution plan results and generate insights',
      ko: '실행 계획 결과를 분석하고 인사이트 생성',
    },
  },
  component: AnalyzeNodeComponent,
});
