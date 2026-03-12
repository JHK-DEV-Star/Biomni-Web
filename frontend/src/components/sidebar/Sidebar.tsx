import { PanelLeftClose, PanelLeft, Plus } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useConversations } from '@/hooks/useConversations';
import { useTranslation } from '@/i18n';
import { ConversationList } from './ConversationList';

/* Inline SVG icons matching inference_ui */
const RenameIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const SystemPromptIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

export function Sidebar() {
  const { state, dispatch } = useAppContext();
  const { t } = useTranslation();
  const {
    conversations,
    createNew,
    switchTo,
    deleteFn,
    currentConversationId,
  } = useConversations();

  const collapsed = !state.sidebarOpen;

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button
          className="sidebar-toggle"
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          title={t('tooltip.toggle_sidebar')}
        >
          {collapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
        </button>
        {!collapsed && (
          <button className="btn-new-chat" onClick={createNew} title={t('label.new_chat')}>
            <Plus size={18} />
            <span>{t('label.new_chat')}</span>
          </button>
        )}
        {collapsed && (
          <button className="btn-new-chat icon-only" onClick={createNew} title={t('label.new_chat')}>
            <Plus size={18} />
          </button>
        )}
      </div>

      <div className="sidebar-content">
        <ConversationList
          conversations={conversations}
          currentId={currentConversationId}
          onSelect={switchTo}
          onDelete={deleteFn}
          collapsed={collapsed}
        />
      </div>

      <div className="sidebar-footer">
        {!collapsed ? (
          <>
            <button
              className="sidebar-footer-btn"
              onClick={() => {
                if (!currentConversationId) return;
                const conv = conversations.find(c => c.id === currentConversationId);
                dispatch({
                  type: 'OPEN_MODAL',
                  payload: { kind: 'rename', convId: currentConversationId, currentTitle: conv?.title || '' },
                });
              }}
              title={t('label.rename')}
            >
              <RenameIcon />
              <span>{t('label.rename')}</span>
            </button>
            <button
              className="sidebar-footer-btn"
              onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { kind: 'system-prompt' } })}
              title={t('label.system_prompt')}
            >
              <SystemPromptIcon />
              <span>{t('label.system_prompt')}</span>
            </button>
            <button
              className="sidebar-footer-btn"
              onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { kind: 'settings' } })}
              title={t('label.settings')}
            >
              <SettingsIcon />
              <span>{t('label.settings')}</span>
            </button>
          </>
        ) : (
          <>
            <button
              className="sidebar-footer-btn icon-only"
              onClick={() => {
                if (!currentConversationId) return;
                const conv = conversations.find(c => c.id === currentConversationId);
                dispatch({
                  type: 'OPEN_MODAL',
                  payload: { kind: 'rename', convId: currentConversationId, currentTitle: conv?.title || '' },
                });
              }}
              title={t('label.rename')}
            >
              <RenameIcon />
            </button>
            <button
              className="sidebar-footer-btn icon-only"
              onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { kind: 'system-prompt' } })}
              title={t('label.system_prompt')}
            >
              <SystemPromptIcon />
            </button>
            <button
              className="sidebar-footer-btn icon-only"
              onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { kind: 'settings' } })}
              title={t('label.settings')}
            >
              <SettingsIcon />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
