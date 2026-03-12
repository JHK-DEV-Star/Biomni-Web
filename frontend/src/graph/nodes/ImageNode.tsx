import { registerNode } from '../node-registry';
import type { NodeComponentProps } from '../node-registry';
import { PortRow } from '../components/PortRow';
import { useState } from 'react';

const PORTS = [{ name: 'out', dir: 'out' as const, type: 'image' as const }];

function ImageNodeComponent({ node, onPortValueChange }: NodeComponentProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const val = node.portValues?.out as { name?: string } | null;
  return (
    <>
      <div className="ng-node-header"><span className="ng-node-title">{node.title}</span></div>
      <div className="ng-input-node-body">
        <input type="file" className="ng-interactive"
          accept=".png,.jpg,.jpeg,.gif,.webp,.bmp,.svg"
          style={{ fontSize: 10, width: '100%' }}
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) {
              onPortValueChange?.(node.id, 'out', { name: file.name, size: file.size });
              const reader = new FileReader();
              reader.onload = () => setPreview(reader.result as string);
              reader.readAsDataURL(file);
            }
          }}
          onMouseDown={e => e.stopPropagation()} />
        {preview && (
          <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 100, objectFit: 'contain', borderRadius: 4, marginTop: 4 }} />
        )}
        {!preview && val?.name && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{val.name}</div>
        )}
      </div>
      <PortRow nodeId={node.id} ports={PORTS} dir="out" />
    </>
  );
}

registerNode('image', {
  label: 'Image', category: 'Data', dataOnly: true, ports: PORTS,
  defaultConfig: {
    title: 'Image', status: 'completed', portValues: { out: null },
    menuTag: { en: 'Image', ko: '이미지' },
    description: { en: 'Load image file with preview', ko: '이미지 파일 로드 (미리보기)' },
  },
  component: ImageNodeComponent,
});
