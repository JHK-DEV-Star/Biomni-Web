import { useState } from 'react';
import { X } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useTranslation } from '@/i18n';
import { renameConversation } from '@/api/conversations';

interface Props {
  convId: string;
  currentTitle?: string;
}

export function RenameModal({ convId, currentTitle = '' }: Props) {
  const { dispatch } = useAppContext();
  const { t } = useTranslation();
  const [title, setTitle] = useState(currentTitle);

  const close = () => dispatch({ type: 'CLOSE_MODAL' });

  const handleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      await renameConversation(convId, trimmed);
      dispatch({ type: 'BUMP_CONVERSATIONS' });
      close();
    } catch {
      // silent
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') close();
  };

  return (
    <div className="modal active" onClick={close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t('rename') !== 'rename' ? t('rename') : 'Rename Conversation'}</h3>
          <button className="modal-close" onClick={close}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <input
            className="modal-input"
            type="text"
            placeholder={t('enter_new_name') !== 'enter_new_name' ? t('enter_new_name') : 'Enter new name'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={close}>
            {t('cancel') !== 'cancel' ? t('cancel') : 'Cancel'}
          </button>
          <button className="modal-btn modal-btn-save" onClick={handleSubmit} disabled={!title.trim()}>
            {t('save') !== 'save' ? t('save') : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
