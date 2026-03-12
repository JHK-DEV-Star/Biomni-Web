// Math operation nodes: Add, Subtract, Multiply, Divide, Power, Sqrt, Log
import { registerNode } from '../node-registry';
import type { NodeComponentProps } from '../node-registry';
import { NodeHeader } from '../components/NodeHeader';
import { PortRow } from '../components/PortRow';
import type { PortDef } from '../types';

// Shared binary math node component
function BinaryMathNode({ node, onTitleChange, ports, labels }: NodeComponentProps & { ports: PortDef[]; labels?: [string, string] }) {
  return (
    <>
      <PortRow nodeId={node.id} ports={ports} dir="in" />
      <NodeHeader title={node.title} nodeId={node.id} onTitleChange={onTitleChange} />
      {labels && (
        <div className="ng-node-body" style={{ display: 'flex', gap: 8, fontSize: 10, opacity: 0.6 }}>
          <span>{labels[0]}</span><span>{labels[1]}</span>
        </div>
      )}
      <PortRow nodeId={node.id} ports={ports} dir="out" />
    </>
  );
}

function UnaryMathNode({ node, onTitleChange, ports }: NodeComponentProps & { ports: PortDef[] }) {
  return (
    <>
      <PortRow nodeId={node.id} ports={ports} dir="in" />
      <NodeHeader title={node.title} nodeId={node.id} onTitleChange={onTitleChange} />
      <PortRow nodeId={node.id} ports={ports} dir="out" />
    </>
  );
}

// --- Add ---
const ADD_PORTS: PortDef[] = [
  { name: 'a', dir: 'in', type: 'any', label: 'A' },
  { name: 'b', dir: 'in', type: 'any', label: 'B' },
  { name: 'out', dir: 'out', type: 'any' },
];
registerNode('math_add', {
  label: 'Add', category: 'Math', ports: ADD_PORTS,
  defaultConfig: {
    title: 'Add', portValues: { a: 0, b: 0 },
    menuTag: { en: 'Math', ko: '수학' },
    description: { en: 'Add two values (supports string concat)', ko: '두 값 더하기 (문자열 연결 포함)' },
  },
  resolveOutputType: (inputs) => {
    if (inputs.a === 'string' || inputs.b === 'string') return { out: 'string' };
    if (inputs.a === 'matrix' || inputs.b === 'matrix') return { out: 'matrix' };
    if (inputs.a === 'vector4' || inputs.b === 'vector4') return { out: 'vector4' };
    if (inputs.a === 'vector3' || inputs.b === 'vector3') return { out: 'vector3' };
    if (inputs.a === 'vector2' || inputs.b === 'vector2') return { out: 'vector2' };
    if (inputs.a === 'double' || inputs.b === 'double') return { out: 'double' };
    if (inputs.a === 'float' || inputs.b === 'float') return { out: 'float' };
    if (inputs.a === 'int' && inputs.b === 'int') return { out: 'int' };
    return { out: 'float' };
  },
  component: (p: NodeComponentProps) => <BinaryMathNode {...p} ports={ADD_PORTS} />,
});

// --- Subtract ---
const SUB_PORTS: PortDef[] = [
  { name: 'a', dir: 'in', type: 'any', label: 'A' },
  { name: 'b', dir: 'in', type: 'any', label: 'B' },
  { name: 'out', dir: 'out', type: 'any' },
];
registerNode('math_subtract', {
  label: 'Subtract', category: 'Math', ports: SUB_PORTS,
  defaultConfig: {
    title: 'Subtract', portValues: { a: 0, b: 0 },
    menuTag: { en: 'Math', ko: '수학' },
    description: { en: 'Subtract B from A', ko: 'A에서 B 빼기' },
  },
  component: (p: NodeComponentProps) => <BinaryMathNode {...p} ports={SUB_PORTS} />,
});

// --- Multiply ---
const MUL_PORTS: PortDef[] = [
  { name: 'a', dir: 'in', type: 'any', label: 'A' },
  { name: 'b', dir: 'in', type: 'any', label: 'B' },
  { name: 'out', dir: 'out', type: 'any' },
];
registerNode('math_multiply', {
  label: 'Multiply', category: 'Math', ports: MUL_PORTS,
  defaultConfig: {
    title: 'Multiply', portValues: { a: 1, b: 1 },
    menuTag: { en: 'Math', ko: '수학' },
    description: { en: 'Multiply two values', ko: '두 값 곱하기' },
  },
  component: (p: NodeComponentProps) => <BinaryMathNode {...p} ports={MUL_PORTS} />,
});

// --- Divide ---
const DIV_PORTS: PortDef[] = [
  { name: 'a', dir: 'in', type: 'any', label: 'A' },
  { name: 'b', dir: 'in', type: 'any', label: 'B' },
  { name: 'out', dir: 'out', type: 'any' },
];
registerNode('math_divide', {
  label: 'Divide', category: 'Math', ports: DIV_PORTS,
  defaultConfig: {
    title: 'Divide', portValues: { a: 1, b: 1 },
    menuTag: { en: 'Math', ko: '수학' },
    description: { en: 'Divide A by B', ko: 'A를 B로 나누기' },
  },
  component: (p: NodeComponentProps) => <BinaryMathNode {...p} ports={DIV_PORTS} />,
});

// --- Power ---
const POW_PORTS: PortDef[] = [
  { name: 'base', dir: 'in', type: 'any', label: 'Base' },
  { name: 'exp', dir: 'in', type: 'any', label: 'Exp' },
  { name: 'out', dir: 'out', type: 'any' },
];
registerNode('math_power', {
  label: 'Power', category: 'Math', ports: POW_PORTS,
  defaultConfig: {
    title: 'Power', portValues: { base: 2, exp: 2 },
    menuTag: { en: 'Math', ko: '수학' },
    description: { en: 'Raise base to exponent', ko: '거듭제곱' },
  },
  component: (p: NodeComponentProps) => <BinaryMathNode {...p} ports={POW_PORTS} labels={['Base', 'Exp']} />,
});

// --- Sqrt ---
const SQRT_PORTS: PortDef[] = [
  { name: 'value', dir: 'in', type: 'any', label: 'Value' },
  { name: 'out', dir: 'out', type: 'any' },
];
registerNode('math_sqrt', {
  label: 'Sqrt', category: 'Math', ports: SQRT_PORTS,
  defaultConfig: {
    title: 'Sqrt', portValues: { value: 4 },
    menuTag: { en: 'Math', ko: '수학' },
    description: { en: 'Square root', ko: '제곱근' },
  },
  component: (p: NodeComponentProps) => <UnaryMathNode {...p} ports={SQRT_PORTS} />,
});

// --- Log ---
const LOG_PORTS: PortDef[] = [
  { name: 'value', dir: 'in', type: 'any', label: 'Value' },
  { name: 'base', dir: 'in', type: 'any', label: 'Base' },
  { name: 'out', dir: 'out', type: 'any' },
];
registerNode('math_log', {
  label: 'Log', category: 'Math', ports: LOG_PORTS,
  defaultConfig: {
    title: 'Log', portValues: { value: 1, base: 2.718 },
    menuTag: { en: 'Math', ko: '수학' },
    description: { en: 'Logarithm with custom base', ko: '로그 (커스텀 밑)' },
  },
  component: (p: NodeComponentProps) => <BinaryMathNode {...p} ports={LOG_PORTS} labels={['Value', 'Base']} />,
});
