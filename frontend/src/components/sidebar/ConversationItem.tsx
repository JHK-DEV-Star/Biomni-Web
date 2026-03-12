import { MessageSquare, Trash2 } from 'lucide-react';
import type { ConversationSummary } from '@/types';

interface Props {
  conversation: ConversationSummary;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  collapsed: boolean;
}

function formatConversationDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
  });
}

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
  collapsed,
}: Props) {
  return (
    <div
      className={`conversation-item ${isActive ? 'active' : ''}`}
      onClick={onSelect}
      title={conversation.title}
    >
      <MessageSquare size={14} className="conversation-icon" />
      {!collapsed && (
        <>
          <div className="conversation-info">
            <span className="conversation-title">{conversation.title}</span>
            <span className="conversation-date">
              {formatConversationDate(conversation.updated_at || conversation.created_at)}
            </span>
          </div>
          <button
            className="conversation-delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </>
      )}
    </div>
  );
}
