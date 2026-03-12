import { ChatProvider } from '@/context/ChatContext';
import { AppProvider } from '@/context/AppContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { WebSocketProvider } from '@/context/WebSocketContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ToastProvider } from '@/components/common/Toast';
import { AppLayout } from '@/components/layout/AppLayout';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <SettingsProvider>
          <AppProvider>
            <ChatProvider>
              <WebSocketProvider>
                <AppLayout />
              </WebSocketProvider>
            </ChatProvider>
          </AppProvider>
        </SettingsProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
