import { useAppContext } from '@/context/AppContext';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { SystemPromptModal } from '@/components/settings/SystemPromptModal';
import { RenameModal } from '@/components/sidebar/RenameModal';
import { StopConfirmModal } from '@/components/common/StopConfirmModal';

/**
 * Centralized modal renderer. Renders the currently active modal from AppContext.
 */
export function ModalContainer() {
  const { state } = useAppContext();

  if (!state.activeModal) return null;

  switch (state.activeModal.kind) {
    case 'settings':
      return <SettingsModal />;
    case 'system-prompt':
      return <SystemPromptModal />;
    case 'rename':
      return <RenameModal convId={state.activeModal.convId} currentTitle={state.activeModal.currentTitle} />;
    case 'stop-confirm':
      return <StopConfirmModal onConfirm={state.activeModal.onConfirm} />;
    default:
      return null;
  }
}
