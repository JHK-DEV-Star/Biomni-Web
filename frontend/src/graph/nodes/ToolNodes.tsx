// Tool nodes: CodeGen, PubMed, NCBI Gene, CRISPR, Protocol
import { registerNode } from '../node-registry';
import type { NodeComponentProps } from '../node-registry';
import { NodeHeader } from '../components/NodeHeader';
import { PortRow } from '../components/PortRow';
import { ProgressBar } from '../components/ProgressBar';

const TOOL_PORTS = [
  { name: 'in', dir: 'in' as const, type: 'any' as const },
  { name: 'out', dir: 'out' as const, type: 'any' as const },
];

function ToolNodeComponent({ node, onTitleChange }: NodeComponentProps) {
  return (
    <>
      <PortRow nodeId={node.id} ports={TOOL_PORTS} dir="in" />
      <NodeHeader title={node.title} nodeId={node.id} onTitleChange={onTitleChange} stepNum={node.stepNum} />
      {node.tool && <div className="ng-node-body">{node.tool}</div>}
      <ProgressBar />
      <PortRow nodeId={node.id} ports={TOOL_PORTS} dir="out" />
    </>
  );
}

registerNode('codegen', {
  label: 'Code Gen', category: 'Tool', allowRef: true, ports: TOOL_PORTS,
  defaultConfig: {
    title: 'Code Gen', tool: 'code_gen', status: 'pending',
    menuTag: { en: 'Code', ko: '코드' },
    description: { en: 'Generate Python or R code from natural language', ko: '자연어로 Python/R 코드 생성' },
  },
  component: ToolNodeComponent,
});

registerNode('pubmed', {
  label: 'PubMed Search', category: 'Tool', allowRef: true, ports: TOOL_PORTS,
  defaultConfig: {
    title: 'PubMed Search', tool: 'pubmed_search', status: 'pending',
    menuTag: { en: 'Papers', ko: '논문' },
    description: { en: 'Search PubMed for research papers', ko: 'PubMed 논문 검색' },
  },
  component: ToolNodeComponent,
});

registerNode('ncbi_gene', {
  label: 'NCBI Gene', category: 'Tool', allowRef: true, ports: TOOL_PORTS,
  defaultConfig: {
    title: 'NCBI Gene', tool: 'ncbi_gene', status: 'pending',
    menuTag: { en: 'Gene DB', ko: '유전자 DB' },
    description: { en: 'Query NCBI Gene database', ko: 'NCBI 유전자 데이터베이스 조회' },
  },
  component: ToolNodeComponent,
});

registerNode('crispr', {
  label: 'CRISPR Designer', category: 'Tool', allowRef: true, ports: TOOL_PORTS,
  defaultConfig: {
    title: 'CRISPR Designer', tool: 'crispr_designer', status: 'pending',
    menuTag: { en: 'Gene Editing', ko: '유전자 편집' },
    description: { en: 'Design CRISPR guide RNAs', ko: 'CRISPR 가이드 RNA 설계' },
  },
  component: ToolNodeComponent,
});

registerNode('protocol', {
  label: 'Protocol Builder', category: 'Tool', allowRef: true, ports: TOOL_PORTS,
  defaultConfig: {
    title: 'Protocol Builder', tool: 'protocol_builder', status: 'pending',
    menuTag: { en: 'Protocol', ko: '프로토콜' },
    description: { en: 'Build experimental protocols step by step', ko: '실험 프로토콜 단계별 구축' },
  },
  component: ToolNodeComponent,
});
