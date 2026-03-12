import { registerNode } from '../node-registry';
import type { NodeComponentProps } from '../node-registry';
import { PortRow } from '../components/PortRow';

const PORTS = [{ name: 'out', dir: 'out' as const, type: 'color' as const, label: 'Color' }];

function rgbaToHex(rgba: number[]): string {
  const r = Math.round(rgba[0] ?? 255).toString(16).padStart(2, '0');
  const g = Math.round(rgba[1] ?? 255).toString(16).padStart(2, '0');
  const b = Math.round(rgba[2] ?? 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function hexToRgba(hex: string, alpha: number): number[] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b, alpha];
}

function ColorNodeComponent({ node, onPortValueChange }: NodeComponentProps) {
  const val = (node.portValues?.out as number[]) ?? [255, 255, 255, 1.0];
  const hex = rgbaToHex(val);
  return (
    <>
      <div className="ng-node-header"><span className="ng-node-title">{node.title}</span></div>
      <div className="ng-input-node-body" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="color" value={hex} className="ng-interactive" style={{ width: 32, height: 24, border: 'none', padding: 0, cursor: 'pointer' }}
          onChange={e => onPortValueChange?.(node.id, 'out', hexToRgba(e.target.value, val[3] ?? 1))}
          onMouseDown={e => e.stopPropagation()} />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{hex}</span>
      </div>
      <PortRow nodeId={node.id} ports={PORTS} dir="out" />
    </>
  );
}

registerNode('color_value', {
  label: 'Color', category: 'Input', dataOnly: true, ports: PORTS,
  defaultConfig: {
    title: 'Color', status: 'completed', portValues: { out: [255, 255, 255, 1.0] },
    menuTag: { en: 'Color', ko: '색상' },
    description: { en: 'RGBA color input with color picker', ko: 'RGBA 색상 입력' },
  },
  component: ColorNodeComponent,
});
