import { X } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useTranslation } from '@/i18n';

export function StopConfirmModal({ onConfirm }: { onConfirm: () => void }) {
  const { dispatch } = useAppContext();
  const { t } = useTranslation();

  const close = () => dispatch({ type: 'CLOSE_MODAL' });

  const handleConfirm = () => {
    onConfirm();
    close();
  };

  return (
    <div className="modal active" onClick={close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t('stop_generation') !== 'stop_generation' ? t('stop_generation') : 'Stop Generation?'}</h3>
          <button className="modal-close" onClick={close}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <p>{t('stop_confirm_message') !== 'stop_confirm_message'
            ? t('stop_confirm_message')
            : 'Are you sure you want to stop the current generation?'}</p>
        </div>
        <div className="modal-footer">
          <button className="modal-btn-cancel" onClick={close}>
            {t('cancel') !== 'cancel' ? t('cancel') : 'Cancel'}
          </button>
          <button className="modal-btn-save" onClick={handleConfirm}>
            {t('stop') !== 'stop' ? t('stop') : 'Stop'}
          </button>
        </div>
      </div>
    </div>
  );
}
