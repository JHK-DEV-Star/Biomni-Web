import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface Props {
  label: string;
  content: string;
  variant?: 'think' | 'tool-calls' | 'tool-results';
  isStreaming?: boolean;
}

/**
 * Collapsible block for special tokens ([THINK], etc.).
 * Think variant: minimal gray design with ▶/▼ triangle.
 *  - Streaming: collapsed, shows last line rolling below toggle
 *  - Complete: collapsed, shows 80-char italic preview
 *  - Expanded: full content with line-by-line <p> rendering
 */
export function SpecialTokenBlock({ label, content, variant = 'think', isStreaming = false }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Think variant: minimal gray design
  if (variant === 'think') {
    const preview = content.replace(/\n/g, ' ').slice(0, 80);
    const lastLine = content.split('\n').filter(l => l.trim()).pop() || '';

    return (
      <div className="cot-container">
        <button
          className={`cot-toggle ${expanded ? 'expanded' : ''}`}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="cot-arrow">{expanded ? '\u25BC' : '\u25B6'}</span>
          <span className="cot-label">Thinking</span>
        </button>
        {expanded ? (
          <div className="cot-content">
            {content.split('\n').map((line, i) => (
              <p key={i} className="cot-line">{line || '\u00A0'}</p>
            ))}
          </div>
        ) : (
          <div className="cot-preview">
            {isStreaming ? lastLine : preview}
          </div>
        )}
      </div>
    );
  }

  // Other variants: existing special-* design
  return (
    <div className={`special-token-container ${variant}-container`}>
      <button
        className={`special-toggle ${expanded ? 'expanded' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <ChevronRight size={14} className="special-arrow" />
        <span>{label}</span>
      </button>
      {expanded && (
        <div className="special-content">
          <pre>{content}</pre>
        </div>
      )}
    </div>
  );
}
