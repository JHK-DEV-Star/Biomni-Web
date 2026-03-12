// ============================================
// Shared Node Header Component
// ============================================

interface NodeHeaderProps {
  stepNum?: string;
  title: string;
  nodeId: string;
  onTitleChange?: (nodeId: string, newTitle: string) => void;
}

export function NodeHeader({ stepNum, title, nodeId, onTitleChange }: NodeHeaderProps) {
  return (
    <div
      className="ng-node-header"
      onDoubleClick={(e) => {
        if (!onTitleChange) return;
        e.stopPropagation();
        const span = e.currentTarget.querySelector('.ng-node-title') as HTMLElement;
        if (!span) return;

        const input = document.createElement('input');
        input.className = 'ng-title-edit';
        input.value = title;
        input.style.width = '100%';

        const commit = () => {
          const newTitle = input.value.trim() || title;
          onTitleChange(nodeId, newTitle);
          if (input.parentNode) {
            input.parentNode.replaceChild(span, input);
          }
        };

        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
          if (ev.key === 'Escape') {
            input.value = title;
            input.blur();
          }
        });

        span.parentNode!.replaceChild(input, span);
        input.focus();
        input.select();
      }}
    >
      {stepNum && <span className="ng-node-num">{stepNum}</span>}
      <span className="ng-node-title">{title}</span>
    </div>
  );
}
