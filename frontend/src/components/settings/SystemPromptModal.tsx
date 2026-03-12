import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useTranslation } from '@/i18n';
import { getSystemPrompt, getDefaultSystemPrompt, setSystemPrompt } from '@/api/settings';

export function SystemPromptModal() {
  const { dispatch } = useAppContext();
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    getSystemPrompt(controller.signal)
      .then((res) => {
        clearTimeout(timeoutId);
        setPrompt(res.prompt);
      })
      .catch(() => {
        clearTimeout(timeoutId);
      });
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const close = () => dispatch({ type: 'CLOSE_MODAL' });

  const handleSave = async () => {
    try {
      await setSystemPrompt(prompt);
      close();
    } catch {
      // silent
    }
  };

  const handleReset = async () => {
    try {
      const res = await getDefaultSystemPrompt();
      setPrompt(res.prompt);
    } catch {
      // silent
    }
  };

  return (
    <div className="modal active" onClick={close}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t('label.system_prompt')}</h3>
          <button className="modal-close" onClick={close}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <p className="system-prompt-hint">{t('hint.system_prompt')}</p>
          <textarea
            className="modal-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={12}
          />
        </div>
        <div className="modal-footer">
          <button className="modal-btn modal-btn-cancel" onClick={handleReset}>
            {t('label.reset_default')}
          </button>
          <div style={{ flex: 1 }} />
          <button className="modal-btn modal-btn-cancel" onClick={close}>
            {t('label.cancel')}
          </button>
          <button className="modal-btn modal-btn-save" onClick={handleSave}>
            {t('label.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
