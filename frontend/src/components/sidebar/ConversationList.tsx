import { ConversationItem } from './ConversationItem';
import { useTranslation } from '@/i18n';
import type { ConversationSummary } from '@/types';

interface Props {
  conversations: ConversationSummary[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  collapsed: boolean;
}

export function ConversationList({
  conversations,
  currentId,
  onSelect,
  onDelete,
  collapsed,
}: Props) {
  const { t } = useTranslation();

  if (conversations.length === 0) {
    return (
      <div className="conversation-list-empty">
        {!collapsed && <p>{t('empty.no_conversations')}</p>}
      </div>
    );
  }

  return (
    <div className="conversation-list">
      {!collapsed && <div className="conversations-label">{t('label.conversations')}</div>}
      {conversations.map((conv) => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          isActive={conv.id === currentId}
          onSelect={() => onSelect(conv.id)}
          onDelete={() => onDelete(conv.id)}
          collapsed={collapsed}
        />
      ))}
    </div>
  );
}
