// ============================================
// String (Prompt) Input Node Type
// ============================================

import { registerNode } from '../node-registry';
import type { NodeComponentProps } from '../node-registry';
import { PortRow } from '../components/PortRow';
import { useRef, useEffect, useCallback } from 'react';

const PORTS = [
  { name: 'out', dir: 'out' as const, type: 'string' as const },
];

function StringNodeComponent({ node, onPortValueChange }: NodeComponentProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const val = (node.portValues?.out as string) ?? '';

  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }, []);

  useEffect(() => {
    autoResize();
  }, [val, autoResize]);

  return (
    <>
      <div className="ng-node-header">
        <span className="ng-node-title">{node.title}</span>
      </div>
      <div className="ng-input-node-body">
        <textarea
          ref={textareaRef}
          className="ng-input-node-field ng-port-default ng-interactive"
          rows={1}
          placeholder="Enter text..."
          value={val}
          onChange={(e) => {
            onPortValueChange?.(node.id, 'out', e.target.value);
            autoResize();
          }}
          onMouseDown={(e) => e.stopPropagation()}
        />
      </div>
      <PortRow nodeId={node.id} ports={PORTS} dir="out" />
    </>
  );
}

registerNode('string', {
  label: 'String',
  category: 'Input',
  dataOnly: true,
  ports: PORTS,
  defaultConfig: {
    title: 'String',
    status: 'completed',
    portValues: { out: '' },
    menuTag: { en: 'Text', ko: '텍스트', ja: 'テキスト', zh: '文本' },
    description: {
      en: 'Text string input value for passing text data',
      ko: '텍스트 문자열 입력값',
    },
  },
  component: StringNodeComponent,
});
